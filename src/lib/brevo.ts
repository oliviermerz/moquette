/** Client minimal de l'API Brevo v3 (côté serveur uniquement : la clé API ne doit jamais partir au navigateur). */

/** Pièce jointe d'email : contenu encodé en base64 */
export interface Attachment { name: string; content: string }

export interface BrevoConfig {
  apiKey: string;
  baseUrl: string;
}

export class BrevoError extends Error {
  constructor(public step: string, public status: number, public body: string) {
    super(`Brevo ${step} : HTTP ${status} ${body.slice(0, 300)}`);
  }
}

async function call<T>(cfg: BrevoConfig, step: string, method: string, path: string, body?: unknown): Promise<T | null> {
  const res = await fetch(`${cfg.baseUrl}${path}`, {
    method,
    headers: { 'api-key': cfg.apiKey, accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10_000),
  });
  const text = await res.text();
  if (!res.ok) throw new BrevoError(step, res.status, text);
  return text ? (JSON.parse(text) as T) : null;
}

export const brevo = {
  /** Crée ou met à jour un contact, puis renvoie son identifiant */
  async upsertContact(cfg: BrevoConfig, email: string, attributes: Record<string, unknown>, listIds: number[]): Promise<number> {
    const created = await call<{ id: number }>(cfg, 'contact', 'POST', '/contacts', { email, attributes, listIds, updateEnabled: true });
    if (created?.id) return created.id;
    // 204 : contact existant mis à jour, on récupère son id
    const existing = await call<{ id: number }>(cfg, 'contact-get', 'GET', `/contacts/${encodeURIComponent(email)}`);
    if (!existing?.id) throw new BrevoError('contact-get', 200, 'id manquant');
    return existing.id;
  },

  async createDeal(cfg: BrevoConfig, name: string, attributes: Record<string, unknown>, contactId: number): Promise<string> {
    const r = await call<{ id: string }>(cfg, 'deal', 'POST', '/crm/deals', { name, attributes, linkedContactsIds: [contactId] });
    return r!.id;
  },

  async createNote(cfg: BrevoConfig, html: string, contactId: number, dealId?: string) {
    return call<{ id: string }>(cfg, 'note', 'POST', '/crm/notes', { text: html, contactIds: [contactId], ...(dealId ? { dealIds: [dealId] } : {}) });
  },

  async createTask(cfg: BrevoConfig, t: { name: string; taskTypeId: string; date: string; notes?: string; assignToId?: string; contactId: number; dealId?: string }) {
    return call<{ id: string }>(cfg, 'task', 'POST', '/crm/tasks', {
      name: t.name,
      taskTypeId: t.taskTypeId,
      date: t.date,
      notes: t.notes,
      ...(t.assignToId ? { assignToId: t.assignToId } : {}),
      contactsIds: [t.contactId],
      ...(t.dealId ? { dealsIds: [t.dealId] } : {}),
      reminder: { types: ['email', 'push'], unit: 'minutes', value: 15 },
    });
  },

  async sendEmail(cfg: BrevoConfig, m: { sender: { email: string; name: string }; to: { email: string; name?: string }[]; replyTo?: { email: string; name?: string }; subject: string; html: string; text?: string; tags?: string[]; attachments?: Attachment[] }) {
    return call<{ messageId: string }>(cfg, 'email', 'POST', '/smtp/email', {
      sender: m.sender, to: m.to, replyTo: m.replyTo, subject: m.subject, htmlContent: m.html, textContent: m.text, tags: m.tags,
      ...(m.attachments?.length ? { attachment: m.attachments } : {}),
    });
  },

  /** recipient au format international sans « + » (ex. 33612345678) */
  async sendSms(cfg: BrevoConfig, s: { sender: string; recipient: string; content: string; tag?: string }) {
    return call(cfg, 'sms', 'POST', '/transactionalSMS/send', { ...s, type: 'transactional' });
  },
};
