/**
 * POST /api/lead/ : réception d'une demande d'étude.
 *
 * 1. Validation (le calcul d'estimation et les scores sont refaits ici, on ne fait pas confiance au navigateur)
 * 2. Brevo : contact → deal → note → tâche de rappel
 * 3. Emails : confirmation au prospect, notification à l'équipe (+ SMS si configuré)
 *
 * Principe : un lead ne doit jamais être perdu. Si une étape Brevo échoue, les suivantes continuent
 * et l'email à l'équipe le signale avec toutes les données pour une saisie manuelle.
 */
import type { APIRoute } from 'astro';
import {
  BREVO_API_KEY, BREVO_API_URL, BREVO_ATTR_FIRSTNAME, BREVO_ATTR_LASTNAME, BREVO_LIST_LEADS, BREVO_LIST_NEWSLETTER,
  BREVO_PIPELINE_ID, BREVO_STAGE_NEW, BREVO_DEAL_OWNER, BREVO_TASK_TYPE_CALL,
  LEAD_SENDER_EMAIL, LEAD_SENDER_NAME, LEAD_REPLY_TO, TEAM_NOTIFY_EMAILS, TEAM_NOTIFY_SMS, SMS_SENDER, N8N_WEBHOOK_URL,
} from 'astro:env/server';
import { LeadInput, enrich, projectTitle, type Lead } from '../../lib/lead';
import { brevo, BrevoError, type BrevoConfig } from '../../lib/brevo';
import { prospectEmail, teamEmail, crmNote, teamSms } from '../../lib/emails';

export const prerender = false;

/* Limite simple : 5 demandes par IP toutes les 10 minutes (mémoire du processus) */
const hits = new Map<string, number[]>();
function limited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 5;
}

/** Échéance du rappel : +2 h en heures ouvrées (lun-ven 9 h-18 h, heure de Paris), sinon jour ouvré suivant à 10 h */
function callbackDue(from = new Date()): string {
  const paris = new Date(from.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const offset = from.getTime() - paris.getTime();
  const d = new Date(paris);
  const open = (x: Date) => x.getDay() >= 1 && x.getDay() <= 5;
  const plus2 = new Date(d.getTime() + 2 * 3600_000);
  if (open(d) && d.getHours() >= 9 && plus2.getHours() < 18 && plus2.getDate() === d.getDate()) return new Date(plus2.getTime() + offset).toISOString();
  const next = new Date(d);
  if (d.getHours() >= 9 || !open(d)) next.setDate(next.getDate() + 1);
  while (!open(next)) next.setDate(next.getDate() + 1);
  next.setHours(10, 0, 0, 0);
  return new Date(next.getTime() + offset).toISOString();
}

function contactAttributes(l: Lead, withSms: boolean): Record<string, unknown> {
  const i = l.input, a = l.answers, at = i.attribution ?? {};
  return {
    [BREVO_ATTR_FIRSTNAME]: i.prenom,
    [BREVO_ATTR_LASTNAME]: i.nom,
    ...(withSms && l.phoneE164 ? { SMS: l.phoneE164 } : {}),
    TELEPHONE_SAISI: i.telephone,
    TYPE_PROJET: a.espace,
    SURFACE_M2: a.surface ?? undefined,
    NB_MARCHES: a.marches ?? undefined,
    SUPPORT: a.support,
    ETAT_SUPPORT: a.etat,
    FINITION: a.finition ?? undefined,
    CODE_POSTAL: a.codePostal,
    DELAI_PROJET: i.delai || undefined,
    SCORE_COMPLEXITE: l.complexity.grade,
    SCORE_PRIORITE: l.priority,
    ZONE_COUVERTE: l.zoneCovered,
    ESTIMATION_MIN: l.estimate.status === 'ok' ? l.estimate.min : undefined,
    ESTIMATION_MAX: l.estimate.status === 'ok' ? l.estimate.max : undefined,
    SOURCE: (at.utm_source as string) ?? (at.referrer as string) ?? 'direct',
    CAMPAGNE: (at.utm_campaign as string) ?? undefined,
    PAGE_ENTREE: (at.landing_page as string) ?? undefined,
    OPTIN_MARKETING: !!i.consentement_marketing,
    DATE_DEMANDE: l.receivedAt.slice(0, 10),
  };
}

async function readBody(request: Request): Promise<{ data: Record<string, unknown>; isForm: boolean }> {
  const type = request.headers.get('content-type') ?? '';
  if (type.includes('application/json')) return { data: (await request.json()) as Record<string, unknown>, isForm: false };
  const fd = await request.formData();
  const data: Record<string, unknown> = {};
  fd.forEach((v, k) => { if (typeof v === 'string') data[k] = v; });
  return { data, isForm: true };
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export const POST: APIRoute = async ({ request, clientAddress, redirect }) => {
  let parsed: { data: Record<string, unknown>; isForm: boolean };
  try { parsed = await readBody(request); } catch { return json({ ok: false, error: 'invalid_body' }, 400); }
  const { data, isForm } = parsed;
  const fail = (status: number, error: string, fields?: unknown) => (isForm ? redirect(`/estimer-mon-projet/?erreur=${error}`, 303) : json({ ok: false, error, fields }, status));

  // Pot de miel : on répond comme si tout allait bien
  if (typeof data.site_web === 'string' && data.site_web.trim()) return isForm ? redirect('/estimer-mon-projet/merci/', 303) : json({ ok: true });
  if (limited(clientAddress ?? 'unknown')) return fail(429, 'trop_de_demandes');

  // Les formulaires sans JavaScript transmettent l'attribution sous forme de champs « attr_* »
  if (isForm) {
    const attribution: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) if (k.startsWith('attr_') && typeof v === 'string' && v) attribution[k.slice(5)] = v;
    data.attribution = attribution;
  }

  const result = LeadInput.safeParse(data);
  if (!result.success) return fail(400, 'invalide', result.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message })));
  const lead = enrich(result.data);

  if (!BREVO_API_KEY) {
    if (import.meta.env.DEV) {
      console.info('[lead] BREVO_API_KEY absente, demande non transmise (dev) :', projectTitle(lead));
      return isForm ? redirect('/estimer-mon-projet/merci/', 303) : json({ ok: true, dev: true, estimate: lead.estimate });
    }
    console.error('[lead] BREVO_API_KEY absente : demande rejetée pour ne pas la perdre silencieusement');
    return fail(503, 'service_indisponible');
  }

  const cfg: BrevoConfig = { apiKey: BREVO_API_KEY, baseUrl: BREVO_API_URL.replace(/\/$/, '') };
  const errors: string[] = [];
  const log = (e: unknown) => { const msg = e instanceof BrevoError ? `${e.step} ${e.status}` : (e as Error).message; errors.push(msg); console.error('[lead]', e); };

  // 1. Contact (avec repli si l'attribut SMS est refusé, par ex. numéro déjà associé à un autre contact)
  const lists = [BREVO_LIST_LEADS, lead.input.consentement_marketing ? BREVO_LIST_NEWSLETTER : undefined].filter((x): x is number => typeof x === 'number');
  let contactId: number | undefined;
  try {
    contactId = await brevo.upsertContact(cfg, lead.input.email, contactAttributes(lead, true), lists);
  } catch (e) {
    if (e instanceof BrevoError && e.status === 400) {
      try { contactId = await brevo.upsertContact(cfg, lead.input.email, contactAttributes(lead, false), lists); errors.push('SMS non enregistré'); }
      catch (e2) {
        try { contactId = await brevo.upsertContact(cfg, lead.input.email, { [BREVO_ATTR_FIRSTNAME]: lead.input.prenom, [BREVO_ATTR_LASTNAME]: lead.input.nom }, lists); errors.push('attributs projet non enregistrés'); }
        catch (e3) { log(e3); }
      }
    } else log(e);
  }

  // 2. Deal, note, tâche de rappel
  let dealId: string | undefined;
  if (contactId) {
    try {
      dealId = await brevo.createDeal(cfg, projectTitle(lead), {
        ...(BREVO_PIPELINE_ID ? { pipeline: BREVO_PIPELINE_ID } : {}),
        ...(BREVO_STAGE_NEW ? { deal_stage: BREVO_STAGE_NEW } : {}),
        ...(BREVO_DEAL_OWNER ? { deal_owner: BREVO_DEAL_OWNER } : {}),
        ...(lead.estimate.status === 'ok' ? { amount: Math.round((lead.estimate.min + lead.estimate.max) / 2) } : {}),
      }, contactId);
    } catch (e) { log(e); }
    const tasks: Promise<unknown>[] = [brevo.createNote(cfg, crmNote(lead), contactId, dealId)];
    if (BREVO_TASK_TYPE_CALL) {
      tasks.push(brevo.createTask(cfg, {
        name: `Rappeler ${lead.input.prenom} ${lead.input.nom} (priorité ${lead.priority})`,
        taskTypeId: BREVO_TASK_TYPE_CALL, date: callbackDue(), contactId, dealId,
        assignToId: BREVO_DEAL_OWNER, notes: `${lead.phoneE164 ?? lead.input.telephone} · ${projectTitle(lead)}`,
      }));
    }
    (await Promise.allSettled(tasks)).forEach((r) => r.status === 'rejected' && log(r.reason));
  }

  // 3. Emails et SMS
  const sends: Promise<unknown>[] = [];
  if (LEAD_SENDER_EMAIL) {
    const sender = { email: LEAD_SENDER_EMAIL, name: LEAD_SENDER_NAME };
    const replyTo = LEAD_REPLY_TO ? { email: LEAD_REPLY_TO } : undefined;
    const pm = prospectEmail(lead);
    sends.push(brevo.sendEmail(cfg, { sender, replyTo, to: [{ email: lead.input.email, name: `${lead.input.prenom} ${lead.input.nom}` }], subject: pm.subject, html: pm.html, text: pm.text, tags: ['lead-confirmation'] }));
  } else errors.push('LEAD_SENDER_EMAIL absent : aucun email envoyé');
  if (TEAM_NOTIFY_SMS) {
    for (const n of TEAM_NOTIFY_SMS.split(',').map((s) => s.trim().replace(/^\+/, '')).filter(Boolean)) {
      sends.push(brevo.sendSms(cfg, { sender: SMS_SENDER, recipient: n, content: teamSms(lead), tag: 'lead-equipe' }));
    }
  }
  (await Promise.allSettled(sends)).forEach((r) => r.status === 'rejected' && log(r.reason));

  // Email équipe en dernier : il signale les étapes en échec
  let teamNotified = false;
  if (LEAD_SENDER_EMAIL && TEAM_NOTIFY_EMAILS) {
    const tm = teamEmail(lead, { dealId, errors });
    const to = TEAM_NOTIFY_EMAILS.split(',').map((e) => ({ email: e.trim() })).filter((e) => e.email);
    try { await brevo.sendEmail(cfg, { sender: { email: LEAD_SENDER_EMAIL, name: LEAD_SENDER_NAME }, replyTo: { email: lead.input.email }, to, subject: tm.subject, html: tm.html, tags: ['lead-equipe'] }); teamNotified = true; }
    catch (e) { log(e); }
  }

  // Relais optionnel vers n8n (automatisations complémentaires)
  if (N8N_WEBHOOK_URL) {
    try {
      await fetch(N8N_WEBHOOK_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(5000),
        body: JSON.stringify({ ...lead.input, telephone_e164: lead.phoneE164, estimate: lead.estimate, complexity: lead.complexity, priority: lead.priority, zone_covered: lead.zoneCovered, brevo: { contactId, dealId }, received_at: lead.receivedAt }) });
    } catch (e) { log(e); }
  }

  // Si rien n'a pu être enregistré ni notifié, le prospect doit le savoir pour réessayer ou appeler
  if (!contactId && !teamNotified) {
    return fail(502, 'enregistrement_impossible');
  }
  if (errors.length) console.warn('[lead] enregistré avec avertissements :', errors.join(' | '));
  return isForm ? redirect('/estimer-mon-projet/merci/', 303) : json({ ok: true, estimate: lead.estimate });
};
