/** Gabarits d'emails transactionnels (HTML compatible clients mail : tableaux, styles en ligne). */
import { site } from '../config/site';
import { formatEuros } from '../config/pricing';
import { summaryRows, projectTitle, type Lead } from './lead';

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const C = { bg: '#F1EFEA', card: '#FBFAF7', fg: '#22231F', mu: '#6B655C', ln: '#D3CCC0', ac: '#94552F' };
const FONT = "font-family:'Helvetica Neue',Arial,sans-serif";

function layout(title: string, inner: string, preheader: string) {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${esc(title)}</title></head>
<body style="margin:0;background:${C.bg};${FONT};color:${C.fg}">
<span style="display:none;max-height:0;overflow:hidden">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:${C.card};border:1px solid ${C.ln}">
<tr><td style="padding:28px 32px;border-bottom:1px solid ${C.ln};font-size:15px;letter-spacing:6px;font-weight:700">STRATE</td></tr>
<tr><td style="padding:32px">${inner}</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid ${C.ln};font-size:12px;color:${C.mu};line-height:1.6">STRATE · ${esc(site.signature)}${site.phone ? ` · ${esc(site.phone.display)}` : ''}<br>Vous recevez cet email suite à votre demande sur notre site.</td></tr>
</table></td></tr></table></body></html>`;
}

function table(rows: [string, string][]) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.fg};margin:8px 0 24px">${rows
    .map(([k, v]) => `<tr><td style="padding:10px 0;border-bottom:1px solid ${C.ln};font-size:14px;color:${C.mu};width:45%">${esc(k)}</td><td style="padding:10px 0;border-bottom:1px solid ${C.ln};font-size:14px">${esc(v)}</td></tr>`)
    .join('')}</table>`;
}

export function prospectEmail(l: Lead) {
  const first = esc(l.input.prenom);
  const est = l.estimate.status === 'ok'
    ? `<p style="margin:0 0 6px;font-size:13px;color:${C.mu};text-transform:uppercase;letter-spacing:2px">Première estimation</p>
       <p style="margin:0 0 6px;font-size:26px;font-weight:700">${formatEuros(l.estimate.min)} à ${formatEuros(l.estimate.max)} TTC</p>
       <p style="margin:0 0 24px;font-size:12px;color:${C.mu}">Estimation indicative et non contractuelle. Seul le devis établi après visite technique engage STRATE.</p>`
    : `<p style="margin:0 0 24px;font-size:15px;line-height:1.6">Pour vous donner une fourchette fiable, votre conseiller va étudier vos réponses${l.estimate.reasons.length ? ` (${esc(l.estimate.reasons.join(', '))})` : ''}.</p>`;
  const notes = l.notes.length ? `<p style="margin:0 0 8px;font-size:13px;color:${C.mu};text-transform:uppercase;letter-spacing:2px">Points d'attention</p><ul style="margin:0 0 24px;padding-left:18px;font-size:14px;line-height:1.6">${l.notes.map((n) => `<li>${esc(n)}</li>`).join('')}</ul>` : '';
  const delay = site.callbackDelay ? ` ${esc(site.callbackDelay)}` : '';
  const inner = `
    <h1 style="margin:0 0 16px;font-size:26px;line-height:1.2;font-weight:600">Merci ${first}, votre projet est entre de bonnes mains.</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6">Voici le récapitulatif de votre demande. Un conseiller STRATE vous recontacte${delay} pour en parler et organiser, si vous le souhaitez, une visite technique.</p>
    ${est}
    <p style="margin:0 0 4px;font-size:13px;color:${C.mu};text-transform:uppercase;letter-spacing:2px">Votre projet</p>
    ${table(summaryRows(l))}
    ${notes}
    <p style="margin:0 0 8px;font-size:13px;color:${C.mu};text-transform:uppercase;letter-spacing:2px">La suite</p>
    <ol style="margin:0 0 24px;padding-left:18px;font-size:14px;line-height:1.8"><li>Votre conseiller vous appelle</li><li>Visite technique et diagnostic du support</li><li>Devis détaillé, poste par poste</li></ol>
    ${site.phone ? `<p style="margin:0;font-size:14px">Une question ? <a href="tel:${site.phone.e164}" style="color:${C.ac}">${esc(site.phone.display)}</a></p>` : ''}`;
  const text = `Merci ${l.input.prenom}, votre projet est entre de bonnes mains.\n\n${summaryRows(l).map(([k, v]) => `${k} : ${v}`).join('\n')}\n\n${
    l.estimate.status === 'ok' ? `Première estimation : ${formatEuros(l.estimate.min)} à ${formatEuros(l.estimate.max)} TTC (indicative, non contractuelle).\n\n` : ''
  }Un conseiller STRATE vous recontacte${site.callbackDelay ? ` ${site.callbackDelay}` : ''}.`;
  return { subject: 'Votre projet STRATE : récapitulatif de votre demande', html: layout('Votre projet STRATE', inner, 'Le récapitulatif de votre demande et les prochaines étapes.'), text };
}

export function teamEmail(l: Lead, ctx: { dealId?: string; errors: string[] }) {
  const i = l.input;
  const attrib = Object.entries(i.attribution ?? {}).map(([k, v]) => [k, String(v ?? '')] as [string, string]);
  const rows: [string, string][] = [
    ['Priorité', `${l.priority}${l.zoneCovered ? '' : ' (hors zone)'}`],
    ['Complexité', `${l.complexity.grade} · ${l.complexity.label}`],
    ['Estimation', l.estimate.status === 'ok' ? `${formatEuros(l.estimate.min)} – ${formatEuros(l.estimate.max)}` : 'Étude nécessaire'],
    ...summaryRows(l),
    ['Prénom Nom', `${i.prenom} ${i.nom}`],
    ['Téléphone', l.phoneE164 ?? i.telephone],
    ['Email', i.email],
    ['Message', i.message || '—'],
    ['Opt-in marketing', i.consentement_marketing ? 'Oui' : 'Non'],
    ...attrib,
  ];
  const warn = ctx.errors.length
    ? `<p style="margin:0 0 16px;padding:12px;background:#F3DFC9;font-size:13px"><b>Attention :</b> enregistrement Brevo incomplet (${esc(ctx.errors.join(' ; '))}). Saisir ce lead manuellement.</p>`
    : '';
  const inner = `${warn}<h1 style="margin:0 0 8px;font-size:22px;font-weight:600">Nouveau lead · priorité ${l.priority}</h1>
    <p style="margin:0 0 16px;font-size:14px;color:${C.mu}">${esc(projectTitle(l))}${ctx.dealId ? ` · deal Brevo ${esc(ctx.dealId)}` : ''}</p>${table(rows)}`;
  return { subject: `[Lead ${l.priority}] ${projectTitle(l)}`, html: layout('Nouveau lead', inner, projectTitle(l)) };
}

export function crmNote(l: Lead) {
  const rows = summaryRows(l).map(([k, v]) => `<b>${esc(k)}</b> : ${esc(v)}`);
  const est = l.estimate.status === 'ok' ? `${formatEuros(l.estimate.min)} – ${formatEuros(l.estimate.max)}` : `étude nécessaire (${esc(l.estimate.reasons.join(', '))})`;
  return `<p><b>Demande d'étude depuis le site</b> (${esc(l.input.page ?? '')})</p><p>${rows.join('<br />')}</p>
<p><b>Estimation</b> : ${est}<br /><b>Complexité</b> : ${l.complexity.grade} · ${esc(l.complexity.label)}<br /><b>Priorité</b> : ${l.priority}${l.zoneCovered ? '' : ' (hors zone)'}</p>
${l.notes.length ? `<p><b>Points d'attention</b><br />${l.notes.map(esc).join('<br />')}</p>` : ''}
${l.input.message ? `<p><b>Message</b><br />${esc(l.input.message)}</p>` : ''}`;
}

export function teamSms(l: Lead) {
  const a = l.answers;
  const size = a.espace === 'escalier' ? `${a.marches} marches` : `${a.surface}m2`;
  return `STRATE lead ${l.priority} : ${a.espace} ${size}, ${a.codePostal}. ${l.input.prenom} ${l.input.nom.charAt(0)}. ${l.phoneE164 ?? l.input.telephone}`;
}
