/** Outils de l'assistant : vérification de zone, estimation, enregistrement de la demande. */
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'astro/zod';
import { site } from '../../config/site';
import { ESPACES, SUPPORTS, ETATS, DELAIS, LABELS, estimate, complexity, priority, zoneCovered, formatEuros } from '../../config/pricing';
import { normalizePhone } from '../lead';
import { recordLead } from '../crm';

const S = (description: string) => ({ type: 'string' as const, description });

export const TOOLS: Anthropic.Tool[] = [
  {
    name: 'verifier_zone',
    description: "Vérifie si un code postal est dans la zone d'intervention de STRATE. À utiliser dès qu'une personne indique sa commune ou son code postal.",
    input_schema: { type: 'object', properties: { code_postal: S('Code postal français à 5 chiffres') }, required: ['code_postal'], additionalProperties: false },
    strict: true,
    eager_input_streaming: true,
  },
  {
    name: 'estimer_budget',
    description: "Calcule une estimation de budget avec la grille tarifaire officielle de STRATE. Renvoie soit une fourchette, soit la raison pour laquelle une étude personnalisée est nécessaire. Ne jamais donner de prix sans cet outil.",
    input_schema: {
      type: 'object',
      properties: {
        espace: { type: 'string', enum: [...ESPACES] },
        surface_m2: { type: ['number', 'null'], description: 'Surface approximative en m², null si inconnue ou pour un escalier' },
        marches: { type: ['integer', 'null'], description: "Nombre de marches pour un escalier, sinon null" },
        support: { type: 'string', enum: [...SUPPORTS] },
        etat: { type: 'string', enum: [...ETATS] },
      },
      required: ['espace', 'surface_m2', 'marches', 'support', 'etat'],
      additionalProperties: false,
    },
    strict: true,
    eager_input_streaming: true,
  },
  {
    name: 'enregistrer_demande',
    description: "Enregistre la demande pour qu'un conseiller recontacte la personne. Uniquement après son accord explicite à la question « Acceptez-vous que nous enregistrions ces informations pour qu'un conseiller vous recontacte ? ».",
    input_schema: {
      type: 'object',
      properties: {
        consentement_explicite: { type: 'boolean', description: 'true uniquement si la personne a répondu oui à la demande d’accord' },
        prenom: S('Prénom'),
        nom: { type: ['string', 'null'], description: 'Nom, si donné' },
        email: S('Adresse email'),
        telephone: { type: ['string', 'null'], description: 'Téléphone, si donné' },
        code_postal: { type: ['string', 'null'], description: 'Code postal, si connu' },
        espace: { type: ['string', 'null'], enum: [...ESPACES, null] },
        surface_m2: { type: ['number', 'null'] },
        support: { type: ['string', 'null'], enum: [...SUPPORTS, null] },
        delai: { type: ['string', 'null'], enum: [...DELAIS, null] },
        resume: S('Résumé du projet et des questions posées, en 2 à 4 phrases, pour le conseiller'),
      },
      required: ['consentement_explicite', 'prenom', 'nom', 'email', 'telephone', 'code_postal', 'espace', 'surface_m2', 'support', 'delai', 'resume'],
      additionalProperties: false,
    },
    strict: true,
    eager_input_streaming: true,
  },
];

export const TOOL_LABELS: Record<string, string> = {
  verifier_zone: 'Je vérifie votre zone…',
  estimer_budget: 'Je consulte notre grille…',
  enregistrer_demande: "J'enregistre votre demande…",
};

const ZoneIn = z.object({ code_postal: z.string() });
const EstIn = z.object({
  espace: z.enum(ESPACES), surface_m2: z.number().positive().max(10000).nullable(), marches: z.number().int().positive().max(200).nullable(),
  support: z.enum(SUPPORTS), etat: z.enum(ETATS),
});
const LeadIn = z.object({
  consentement_explicite: z.boolean(), prenom: z.string().trim().min(1).max(80), nom: z.string().trim().max(80).nullable(),
  email: z.string().trim().toLowerCase().pipe(z.email()), telephone: z.string().trim().max(25).nullable(),
  code_postal: z.string().trim().nullable(), espace: z.enum(ESPACES).nullable(), surface_m2: z.number().positive().max(10000).nullable(),
  support: z.enum(SUPPORTS).nullable(), delai: z.enum(DELAIS).nullable(), resume: z.string().trim().min(5).max(1500),
});

export interface ToolContext { transcript: string; attribution?: Record<string, unknown>; page?: string; leadsThisSession: number }

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

/** Exécute un outil. Renvoie le contenu du tool_result et s'il s'agit d'une erreur. */
export async function runTool(name: string, input: unknown, ctx: ToolContext): Promise<{ content: string; isError?: boolean; leadRecorded?: boolean }> {
  if (name === 'verifier_zone') {
    const p = ZoneIn.safeParse(input);
    if (!p.success) return { content: 'Entrée invalide', isError: true };
    const cp = p.data.code_postal.trim();
    if (!/^\d{5}$/.test(cp)) return { content: 'Code postal invalide : il faut 5 chiffres.' };
    return { content: zoneCovered(cp)
      ? `Le ${cp} est dans la zone d'intervention de STRATE (${site.zones.region}).`
      : `Le ${cp} est hors de la zone actuelle (${site.zones.region}). La demande peut quand même être enregistrée : un conseiller recontactera la personne dès que possible.` };
  }

  if (name === 'estimer_budget') {
    const p = EstIn.safeParse(input);
    if (!p.success) return { content: 'Entrée invalide', isError: true };
    const a = { espace: p.data.espace, surface: p.data.surface_m2, marches: p.data.marches, support: p.data.support, etat: p.data.etat };
    const e = estimate(a);
    const c = complexity(a);
    return { content: e.status === 'ok'
      ? `Estimation indicative et non contractuelle : ${formatEuros(e.min)} à ${formatEuros(e.max)} TTC. Complexité : ${c.label}. Seul le devis après visite technique engage STRATE.`
      : `Pas de fourchette possible : ${e.reasons.join(', ')}. Complexité probable : ${c.label}. Proposer l'estimation en ligne (/estimer-mon-projet/) ou qu'un conseiller envoie une étude personnalisée.` };
  }

  if (name === 'enregistrer_demande') {
    const p = LeadIn.safeParse(input);
    if (!p.success) return { content: `Informations invalides : ${p.error.issues.map((i) => i.path.join('.')).join(', ')}. Redemander poliment l'information concernée.`, isError: true };
    const d = p.data;
    if (!d.consentement_explicite) return { content: "Pas d'accord explicite : rien n'a été enregistré. Demander l'accord avant d'enregistrer.", isError: true };
    if (ctx.leadsThisSession >= 2) return { content: 'La demande a déjà été enregistrée pendant cette conversation.' };
    const phone = d.telephone ? normalizePhone(d.telephone) : null;
    const answers = { espace: d.espace ?? 'autre', surface: d.surface_m2, support: d.support ?? 'nsp', etat: 'nsp' as const, codePostal: d.code_postal ?? undefined };
    const prio = priority(answers, d.delai ?? '');
    const title = `Assistant · ${d.espace ? LABELS.espace[d.espace] : 'Projet'}${d.surface_m2 ? ` ${d.surface_m2} m²` : ''}${d.code_postal ? ` · ${d.code_postal}` : ''} · ${d.prenom}${d.nom ? ` ${d.nom}` : ''}`;
    const rows: [string, string][] = [
      ['Projet', d.resume], ['Espace', d.espace ? LABELS.espace[d.espace] : '—'], ['Surface', d.surface_m2 ? `${d.surface_m2} m²` : '—'],
      ['Support', d.support ? LABELS.support[d.support] : '—'], ['Code postal', d.code_postal ?? '—'], ['Échéance', d.delai ? LABELS.delai[d.delai] : '—'],
      ['Téléphone', phone ?? d.telephone ?? '—'], ['Email', d.email], ['Priorité', prio],
    ];
    const table = rows.map(([k, v]) => `<b>${esc(k)}</b> : ${esc(v)}`).join('<br />');
    const transcriptHtml = esc(ctx.transcript).replace(/\n/g, '<br />');
    const res = await recordLead({
      canal: 'assistant', email: d.email, prenom: d.prenom, nom: d.nom ?? undefined, phoneE164: phone, priority: prio,
      attributes: {
        TELEPHONE_SAISI: d.telephone ?? undefined, TYPE_PROJET: d.espace ?? undefined, SURFACE_M2: d.surface_m2 ?? undefined,
        SUPPORT: d.support ?? undefined, CODE_POSTAL: d.code_postal ?? undefined, DELAI_PROJET: d.delai ?? undefined,
        SCORE_PRIORITE: prio, ZONE_COUVERTE: d.code_postal ? zoneCovered(d.code_postal) : undefined,
        SOURCE: (ctx.attribution?.utm_source as string) ?? 'direct', CAMPAGNE: (ctx.attribution?.utm_campaign as string) ?? undefined,
        PAGE_ENTREE: (ctx.attribution?.landing_page as string) ?? undefined,
      },
      dealTitle: title,
      noteHtml: `<p><b>Demande via l'assistant du site</b> (${esc(ctx.page ?? '')})</p><p>${table}</p><p><b>Conversation</b><br />${transcriptHtml}</p>`,
      prospectEmail: {
        subject: 'Votre demande STRATE est bien enregistrée',
        html: `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#22231F"><p>Bonjour ${esc(d.prenom)},</p><p>Merci pour votre échange avec notre assistant. Votre demande est enregistrée : un conseiller STRATE vous recontacte${site.callbackDelay ? ` ${esc(site.callbackDelay)}` : ''} pour parler de votre projet.</p><p><b>Votre projet :</b> ${esc(d.resume)}</p><p>Pour gagner du temps, vous pouvez dès maintenant estimer votre projet en ligne ou visualiser votre extérieur sur notre site.</p><p>L'équipe STRATE</p></div>`,
        text: `Bonjour ${d.prenom},\n\nVotre demande est enregistrée : un conseiller STRATE vous recontacte pour parler de votre projet.\n\nVotre projet : ${d.resume}\n\nL'équipe STRATE`,
      },
      teamEmail: { subject: `[Lead ${prio} · assistant] ${title}`, html: `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6"><p>${table}</p><p><b>Conversation</b><br />${transcriptHtml}</p></div>` },
    });
    if (!res.recorded && !res.teamNotified) {
      return { content: "L'enregistrement a échoué pour une raison technique. S'excuser brièvement et proposer l'estimation en ligne (/estimer-mon-projet/).", isError: true };
    }
    return { content: `Demande enregistrée. Un conseiller recontactera ${d.prenom}${site.callbackDelay ? ` ${site.callbackDelay}` : ''}. Un email de confirmation est envoyé à ${d.email}.`, leadRecorded: true };
  }
  return { content: `Outil inconnu : ${name}`, isError: true };
}
