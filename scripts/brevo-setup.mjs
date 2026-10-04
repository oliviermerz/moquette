#!/usr/bin/env node
/**
 * Prépare le compte Brevo pour le site STRATE.
 *
 *   node --env-file=.env scripts/brevo-setup.mjs           → diagnostic seul, ne modifie rien
 *   node --env-file=.env scripts/brevo-setup.mjs --apply   → crée les attributs et listes manquants
 *
 * Affiche ensuite les identifiants (listes, pipeline, étapes, types de tâche, expéditeurs) à reporter dans .env.
 */
const KEY = process.env.BREVO_API_KEY;
const BASE = (process.env.BREVO_API_URL || 'https://api.brevo.com/v3').replace(/\/$/, '');
const APPLY = process.argv.includes('--apply');
if (!KEY) { console.error('BREVO_API_KEY manquante (fichier .env).'); process.exit(1); }

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'api-key': KEY, accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status} ${text}`);
  return text ? JSON.parse(text) : null;
}
const step = (t) => console.log(`\n── ${t}`);

const ATTRIBUTES = {
  TELEPHONE_SAISI: 'text', TYPE_PROJET: 'text', SURFACE_M2: 'float', NB_MARCHES: 'float', SUPPORT: 'text',
  ETAT_SUPPORT: 'text', FINITION: 'text', CODE_POSTAL: 'text', DELAI_PROJET: 'text', SCORE_COMPLEXITE: 'text',
  SCORE_PRIORITE: 'text', ZONE_COUVERTE: 'boolean', ESTIMATION_MIN: 'float', ESTIMATION_MAX: 'float',
  SOURCE: 'text', CAMPAGNE: 'text', PAGE_ENTREE: 'text', OPTIN_MARKETING: 'boolean', DATE_DEMANDE: 'date', STATUT_LEAD: 'text', CANAL_LEAD: 'text',
};
const LISTS = { leads: 'STRATE · Demandes du site', newsletter: 'STRATE · Inspirations (opt-in)' };
const env = {};

step('Compte');
const account = await api('GET', '/account');
console.log(`${account.companyName ?? ''} · ${account.email}`);

step('Attributs de contact');
const attrs = (await api('GET', '/contacts/attributes')).attributes ?? [];
const names = new Set(attrs.map((a) => a.name));
env.BREVO_ATTR_FIRSTNAME = names.has('PRENOM') ? 'PRENOM' : names.has('FIRSTNAME') ? 'FIRSTNAME' : 'PRENOM';
env.BREVO_ATTR_LASTNAME = names.has('NOM') ? 'NOM' : names.has('LASTNAME') ? 'LASTNAME' : 'NOM';
console.log(`Prénom / nom : ${env.BREVO_ATTR_FIRSTNAME} / ${env.BREVO_ATTR_LASTNAME}${names.has(env.BREVO_ATTR_FIRSTNAME) ? '' : ' (à créer)'}`);
for (const n of [env.BREVO_ATTR_FIRSTNAME, env.BREVO_ATTR_LASTNAME]) if (!names.has(n)) ATTRIBUTES[n] = 'text';
for (const [name, type] of Object.entries(ATTRIBUTES)) {
  if (names.has(name)) { console.log(`  ✓ ${name}`); continue; }
  if (!APPLY) { console.log(`  + ${name} (${type}) à créer`); continue; }
  await api('POST', `/contacts/attributes/normal/${name}`, { type });
  console.log(`  + ${name} (${type}) créé`);
}

step('Listes');
const lists = (await api('GET', '/contacts/lists?limit=50')).lists ?? [];
let folderId;
for (const [k, name] of Object.entries(LISTS)) {
  const found = lists.find((l) => l.name === name);
  if (found) { console.log(`  ✓ ${name} (id ${found.id})`); env[k === 'leads' ? 'BREVO_LIST_LEADS' : 'BREVO_LIST_NEWSLETTER'] = found.id; continue; }
  if (!APPLY) { console.log(`  + ${name} à créer`); continue; }
  if (!folderId) {
    const folders = (await api('GET', '/contacts/folders?limit=50')).folders ?? [];
    folderId = folders.find((f) => f.name === 'STRATE')?.id ?? (await api('POST', '/contacts/folders', { name: 'STRATE' })).id;
  }
  const created = await api('POST', '/contacts/lists', { name, folderId });
  console.log(`  + ${name} créée (id ${created.id})`);
  env[k === 'leads' ? 'BREVO_LIST_LEADS' : 'BREVO_LIST_NEWSLETTER'] = created.id;
}

step('Pipelines CRM et étapes');
try {
  const pipelines = await api('GET', '/crm/pipeline/details/all');
  for (const p of pipelines) {
    console.log(`  ${p.pipeline_name}  →  BREVO_PIPELINE_ID=${p.pipeline}`);
    for (const s of p.stages ?? []) console.log(`      ${s.name.padEnd(28)} BREVO_STAGE_NEW=${s.id}`);
  }
  if (pipelines[0]) { env.BREVO_PIPELINE_ID = pipelines[0].pipeline; env.BREVO_STAGE_NEW = pipelines[0].stages?.[0]?.id; }
} catch (e) { console.log(`  Impossible de lire les pipelines (CRM activé ?) : ${e.message}`); }

step('Types de tâche');
try {
  const types = await api('GET', '/crm/tasktypes');
  for (const t of types) console.log(`  ${String(t.title).padEnd(20)} ${t.id}`);
  const call = types.find((t) => /appel|call/i.test(t.title));
  if (call) env.BREVO_TASK_TYPE_CALL = call.id;
} catch (e) { console.log(`  Impossible de lire les types de tâche : ${e.message}`); }

step('Expéditeurs vérifiés');
try {
  const senders = (await api('GET', '/senders')).senders ?? [];
  for (const s of senders) console.log(`  ${s.active ? '✓' : '✗'} ${s.name} <${s.email}>`);
  const active = senders.find((s) => s.active);
  if (active) { env.LEAD_SENDER_EMAIL = active.email; env.LEAD_SENDER_NAME = active.name; }
} catch (e) { console.log(`  ${e.message}`); }

step(APPLY ? 'À reporter dans .env' : 'Proposition pour .env (relancer avec --apply pour créer ce qui manque)');
for (const [k, v] of Object.entries(env)) if (v !== undefined) console.log(`${k}=${v}`);
console.log('\nÀ compléter : TEAM_NOTIFY_EMAILS, TEAM_NOTIFY_SMS (facultatif), BREVO_DEAL_OWNER (email du commercial).');
