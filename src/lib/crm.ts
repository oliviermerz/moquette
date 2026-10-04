/**
 * Enregistrement d'un lead dans Brevo pour les canaux secondaires (assistant, STRATE Vision).
 * Même logique que /api/lead : contact (avec repli sans SMS), deal, note, tâche de rappel, emails.
 * Un lead ne doit jamais être perdu : chaque étape échoue indépendamment et l'équipe est prévenue.
 */
import {
  BREVO_API_KEY, BREVO_API_URL, BREVO_ATTR_FIRSTNAME, BREVO_ATTR_LASTNAME, BREVO_LIST_LEADS, BREVO_LIST_NEWSLETTER,
  BREVO_PIPELINE_ID, BREVO_STAGE_NEW, BREVO_DEAL_OWNER, BREVO_TASK_TYPE_CALL,
  LEAD_SENDER_EMAIL, LEAD_SENDER_NAME, LEAD_REPLY_TO, TEAM_NOTIFY_EMAILS,
} from 'astro:env/server';
import { brevo, BrevoError, type BrevoConfig, type Attachment } from './brevo';

export interface CrmLeadInput {
  canal: 'assistant' | 'vision';
  email: string;
  prenom: string;
  nom?: string;
  phoneE164?: string | null;
  attributes: Record<string, unknown>;
  dealTitle: string;
  noteHtml: string;
  priority: 'A' | 'B' | 'C';
  consentMarketing?: boolean;
  prospectEmail?: { subject: string; html: string; text?: string; attachments?: Attachment[] };
  teamEmail: { subject: string; html: string; attachments?: Attachment[] };
}

export interface CrmResult { recorded: boolean; teamNotified: boolean; contactId?: number; dealId?: string; errors: string[] }

export const crmConfigured = () => !!BREVO_API_KEY;

/** Échéance du rappel : +2 h en heures ouvrées (lun-ven 9 h-18 h, Paris), sinon jour ouvré suivant 10 h */
export function callbackDue(from = new Date()): string {
  const paris = new Date(from.toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
  const offset = from.getTime() - paris.getTime();
  const open = (x: Date) => x.getDay() >= 1 && x.getDay() <= 5;
  const plus2 = new Date(paris.getTime() + 2 * 3600_000);
  if (open(paris) && paris.getHours() >= 9 && plus2.getHours() < 18 && plus2.getDate() === paris.getDate()) return new Date(plus2.getTime() + offset).toISOString();
  const next = new Date(paris);
  if (paris.getHours() >= 9 || !open(paris)) next.setDate(next.getDate() + 1);
  while (!open(next)) next.setDate(next.getDate() + 1);
  next.setHours(10, 0, 0, 0);
  return new Date(next.getTime() + offset).toISOString();
}

export async function recordLead(l: CrmLeadInput): Promise<CrmResult> {
  const errors: string[] = [];
  const log = (e: unknown) => { errors.push(e instanceof BrevoError ? `${e.step} ${e.status}` : (e as Error).message); console.error(`[crm:${l.canal}]`, e); };
  if (!BREVO_API_KEY) return { recorded: false, teamNotified: false, errors: ['BREVO_API_KEY absente'] };
  const cfg: BrevoConfig = { apiKey: BREVO_API_KEY, baseUrl: BREVO_API_URL.replace(/\/$/, '') };

  const base = { [BREVO_ATTR_FIRSTNAME]: l.prenom, ...(l.nom ? { [BREVO_ATTR_LASTNAME]: l.nom } : {}) };
  const full = { ...base, ...l.attributes, CANAL_LEAD: l.canal, OPTIN_MARKETING: !!l.consentMarketing, DATE_DEMANDE: new Date().toISOString().slice(0, 10) };
  const lists = [BREVO_LIST_LEADS, l.consentMarketing ? BREVO_LIST_NEWSLETTER : undefined].filter((x): x is number => typeof x === 'number');

  let contactId: number | undefined;
  const attempts = [
    l.phoneE164 ? { ...full, SMS: l.phoneE164 } : full,
    full,
    base,
  ];
  for (const [i, attrs] of attempts.entries()) {
    try {
      contactId = await brevo.upsertContact(cfg, l.email, attrs, lists);
      if (i === 1 && l.phoneE164) errors.push('SMS non enregistré');
      if (i === 2) errors.push('attributs non enregistrés');
      break;
    } catch (e) {
      if (!(e instanceof BrevoError && e.status === 400) || i === attempts.length - 1) { log(e); break; }
    }
  }

  let dealId: string | undefined;
  if (contactId) {
    try {
      dealId = await brevo.createDeal(cfg, l.dealTitle, {
        ...(BREVO_PIPELINE_ID ? { pipeline: BREVO_PIPELINE_ID } : {}),
        ...(BREVO_STAGE_NEW ? { deal_stage: BREVO_STAGE_NEW } : {}),
        ...(BREVO_DEAL_OWNER ? { deal_owner: BREVO_DEAL_OWNER } : {}),
      }, contactId);
    } catch (e) { log(e); }
    const tasks: Promise<unknown>[] = [brevo.createNote(cfg, l.noteHtml, contactId, dealId)];
    if (BREVO_TASK_TYPE_CALL) {
      tasks.push(brevo.createTask(cfg, {
        name: `Rappeler ${l.prenom}${l.nom ? ` ${l.nom}` : ''} (${l.canal}, priorité ${l.priority})`,
        taskTypeId: BREVO_TASK_TYPE_CALL, date: callbackDue(), contactId, dealId, assignToId: BREVO_DEAL_OWNER,
        notes: `${l.phoneE164 ?? 'téléphone non communiqué'} · ${l.dealTitle}`,
      }));
    }
    (await Promise.allSettled(tasks)).forEach((r) => r.status === 'rejected' && log(r.reason));
  }

  if (LEAD_SENDER_EMAIL && l.prospectEmail) {
    try {
      await brevo.sendEmail(cfg, {
        sender: { email: LEAD_SENDER_EMAIL, name: LEAD_SENDER_NAME }, replyTo: LEAD_REPLY_TO ? { email: LEAD_REPLY_TO } : undefined,
        to: [{ email: l.email, name: [l.prenom, l.nom].filter(Boolean).join(' ') }],
        subject: l.prospectEmail.subject, html: l.prospectEmail.html, text: l.prospectEmail.text, attachments: l.prospectEmail.attachments, tags: [`${l.canal}-confirmation`],
      });
    } catch (e) { log(e); }
  }

  let teamNotified = false;
  if (LEAD_SENDER_EMAIL && TEAM_NOTIFY_EMAILS) {
    const warn = errors.length ? `<p style="padding:12px;background:#F3DFC9;font-family:Arial,sans-serif;font-size:13px"><b>Attention :</b> enregistrement Brevo incomplet (${errors.join(' ; ')}). Saisir ce lead manuellement.</p>` : '';
    try {
      await brevo.sendEmail(cfg, {
        sender: { email: LEAD_SENDER_EMAIL, name: LEAD_SENDER_NAME }, replyTo: { email: l.email },
        to: TEAM_NOTIFY_EMAILS.split(',').map((e) => ({ email: e.trim() })).filter((e) => e.email),
        subject: l.teamEmail.subject, html: warn + l.teamEmail.html, attachments: l.teamEmail.attachments, tags: [`${l.canal}-equipe`],
      });
      teamNotified = true;
    } catch (e) { log(e); }
  }
  return { recorded: !!contactId, teamNotified, contactId, dealId, errors };
}
