/**
 * POST /api/vision/ : rendu réaliste STRATE Vision (multipart/form-data).
 * Champs : photo (JPEG), mask (PNG, zone à transformer transparente), finition, espace, prenom, email,
 * telephone, code_postal, consentement_traitement, consentement_marketing, attribution (JSON), page.
 *
 * Les photos ne sont pas stockées sur le serveur : elles sont transmises au fournisseur d'IA pour le rendu,
 * puis jointes aux emails (prospect et équipe) envoyés via Brevo.
 */
import type { APIRoute } from 'astro';
import sharp from 'sharp';
import { z } from 'astro/zod';
import { ESPACES, LABELS, zoneCovered } from '../../config/pricing';
import { site, ESTIMATE_URL } from '../../config/site';
import { normalizePhone } from '../../lib/lead';
import { recordLead, crmConfigured } from '../../lib/crm';
import { renderVision, visionProvider, FINISH_PROMPTS } from '../../lib/vision';

export const prerender = false;

const MAX_PHOTO = 6 * 1024 * 1024;
const MAX_MASK = 3 * 1024 * 1024;

const Fields = z.object({
  finition: z.enum(['beige', 'blanc', 'gris', 'mix']),
  espace: z.enum(ESPACES).optional(),
  prenom: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().pipe(z.email()),
  telephone: z.string().trim().max(25).optional(),
  code_postal: z.union([z.string().trim().regex(/^\d{5}$/), z.literal('')]).optional(),
  consentement_traitement: z.literal('true'),
  consentement_marketing: z.string().optional(),
  attribution: z.string().max(2000).optional(),
  page: z.string().max(300).optional(),
});

/* Limites : 4 rendus par IP et par heure, 3 par email et par jour */
const byIp = new Map<string, number[]>();
const byEmail = new Map<string, number[]>();
function over(map: Map<string, number[]>, key: string, max: number, windowMs: number) {
  const now = Date.now();
  const recent = (map.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) return true;
  recent.push(now);
  map.set(key, recent);
  if (map.size > 5000) map.clear();
  return false;
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export const POST: APIRoute = async ({ request, clientAddress }) => {
  if (!visionProvider()) return json({ ok: false, error: 'vision_indisponible' }, 503);

  let fd: FormData;
  try { fd = await request.formData(); } catch { return json({ ok: false, error: 'requete_invalide' }, 400); }
  const photoFile = fd.get('photo'), maskFile = fd.get('mask');
  if (!(photoFile instanceof File) || !(maskFile instanceof File)) return json({ ok: false, error: 'photo_manquante' }, 400);
  if (photoFile.size > MAX_PHOTO || maskFile.size > MAX_MASK) return json({ ok: false, error: 'photo_trop_lourde' }, 413);
  const fields: Record<string, string> = {};
  fd.forEach((v, k) => { if (typeof v === 'string') fields[k] = v; });
  const parsed = Fields.safeParse(fields);
  if (!parsed.success) return json({ ok: false, error: 'invalide', fields: parsed.error.issues.map((i) => i.path.join('.')) }, 400);
  const d = parsed.data;

  if (over(byIp, clientAddress ?? 'unknown', 4, 3600_000) || over(byEmail, d.email, 3, 86_400_000)) return json({ ok: false, error: 'limite_atteinte' }, 429);

  // Vérification des images : formats, dimensions identiques, taille raisonnable
  const photo = Buffer.from(await photoFile.arrayBuffer());
  const mask = Buffer.from(await maskFile.arrayBuffer());
  let w = 0, h = 0;
  try {
    const [pm, mm] = await Promise.all([sharp(photo).metadata(), sharp(mask).metadata()]);
    w = pm.width ?? 0; h = pm.height ?? 0;
    if (pm.format !== 'jpeg' || mm.format !== 'png' || !mm.hasAlpha || w !== mm.width || h !== mm.height || w > 2048 || h > 2048 || w < 256 || h < 256) throw new Error();
  } catch { return json({ ok: false, error: 'image_invalide' }, 400); }

  let render: Buffer | null = null;
  let renderError: string | null = null;
  try {
    render = (await renderVision(photo, mask, d.finition)).jpeg;
  } catch (e) {
    renderError = (e as Error).message;
    console.error('[vision]', e);
  }

  // Le lead est enregistré même si le rendu a échoué : l'équipe peut le réaliser à la main
  const phone = d.telephone ? normalizePhone(d.telephone) : null;
  const finish = FINISH_PROMPTS[d.finition].label;
  const espace = d.espace ? LABELS.espace[d.espace] : 'Extérieur';
  let attribution: Record<string, unknown> = {};
  try { attribution = d.attribution ? JSON.parse(d.attribution) : {}; } catch { /* ignoré */ }
  const title = `Vision · ${espace} · ${finish}${d.code_postal ? ` · ${d.code_postal}` : ''} · ${d.prenom}`;
  const files = [
    { name: 'photo-client.jpg', content: photo.toString('base64') },
    ...(render ? [{ name: 'simulation-strate.jpg', content: render.toString('base64') }] : []),
  ];
  const estimateLink = new URL(`${ESTIMATE_URL}?${new URLSearchParams({ ...(d.espace ? { espace: d.espace } : {}), ...(d.code_postal ? { cp: d.code_postal } : {}) })}`, request.url).href;

  const crm = crmConfigured()
    ? await recordLead({
      canal: 'vision', email: d.email, prenom: d.prenom, phoneE164: phone, priority: d.code_postal && zoneCovered(d.code_postal) ? 'B' : 'C',
      consentMarketing: d.consentement_marketing === 'true',
      attributes: {
        TELEPHONE_SAISI: d.telephone || undefined, TYPE_PROJET: d.espace, FINITION: d.finition, CODE_POSTAL: d.code_postal || undefined,
        ZONE_COUVERTE: d.code_postal ? zoneCovered(d.code_postal) : undefined,
        SOURCE: (attribution.utm_source as string) ?? 'direct', CAMPAGNE: (attribution.utm_campaign as string) ?? undefined,
      },
      dealTitle: title,
      noteHtml: `<p><b>Visualisation STRATE Vision</b> (${esc(d.page ?? '')})</p><p><b>Espace</b> : ${esc(espace)}<br /><b>Finition</b> : ${esc(finish)}<br /><b>Code postal</b> : ${esc(d.code_postal || '—')}<br /><b>Téléphone</b> : ${esc(phone ?? d.telephone ?? '—')}</p>${renderError ? `<p><b>Rendu automatique en échec</b> : à réaliser manuellement (${esc(renderError)}).</p>` : '<p>Photo et simulation jointes à l’email de notification.</p>'}`,
      prospectEmail: render ? {
        subject: 'Votre extérieur, version STRATE',
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#22231F"><p>Bonjour ${esc(d.prenom)},</p><p>Voici la simulation de votre extérieur en finition <b>${esc(finish)}</b>, en pièce jointe.</p><p>C'est une simulation visuelle, non contractuelle : la teinte réelle se choisit sur échantillons, et la faisabilité se confirme lors du diagnostic de votre support.</p><p>Envie d'aller plus loin ? <a href="${estimateLink}" style="color:#94552F">Estimez votre projet en 2 minutes</a>${site.phone ? ` ou appelez-nous au ${esc(site.phone.display)}` : ''}.</p><p>L'équipe STRATE</p></div>`,
        text: `Bonjour ${d.prenom},\n\nVoici la simulation de votre extérieur en finition ${finish}, en pièce jointe. Simulation visuelle non contractuelle.\n\nEstimer votre projet : ${estimateLink}\n\nL'équipe STRATE`,
        attachments: [{ name: 'simulation-strate.jpg', content: render.toString('base64') }],
      } : undefined,
      teamEmail: {
        subject: `[Vision] ${title}${renderError ? ' · RENDU À FAIRE' : ''}`,
        html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6"><p><b>${esc(d.prenom)}</b> · ${esc(d.email)} · ${esc(phone ?? d.telephone ?? 'pas de téléphone')}</p><p>${esc(espace)} · ${esc(finish)} · ${esc(d.code_postal || 'code postal non renseigné')}</p>${renderError ? '<p><b>Le rendu automatique a échoué : réaliser la simulation manuellement et l’envoyer au prospect.</b></p>' : ''}<p>Photo d'origine${render ? ' et simulation' : ''} en pièces jointes.</p></div>`,
        attachments: files,
      },
    })
    : null;
  if (!crm) console.warn('[vision] Brevo non configuré : demande non enregistrée');

  if (!render) {
    return json({ ok: false, error: 'rendu_impossible', leadRecorded: !!crm && (crm.recorded || crm.teamNotified) }, 502);
  }
  return json({ ok: true, image: `data:image/jpeg;base64,${render.toString('base64')}`, leadRecorded: !!crm?.recorded });
};
