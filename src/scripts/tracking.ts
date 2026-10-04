/**
 * Consentement, chargement de Google Tag Manager et événements marketing.
 *
 * - Consent Mode v2 : tout est refusé par défaut (script inline dans <head>).
 * - Mode « basique » : GTM n'est chargé qu'après un consentement explicite.
 *   GA4, Google Ads et Meta Pixel sont ensuite configurés dans GTM.
 * - Les événements sont toujours poussés dans dataLayer ; ils ne partent
 *   vers les outils que si GTM est chargé.
 */

type Consent = { analytics: boolean; ads: boolean; ts: number };
type Params = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window { dataLayer: unknown[]; gtag: (...args: unknown[]) => void; __gtmLoaded?: boolean }
}

const KEY = 'strate-consent-v1';
const ATTR_KEY = 'strate-attribution';
const CONSENT_MAX_AGE = 1000 * 60 * 60 * 24 * 180; // 6 mois, puis on redemande

window.dataLayer = window.dataLayer || [];

export function track(event: string, params: Params = {}) {
  window.dataLayer.push({ event, ...params });
}

function readConsent(): Consent | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Consent;
    return Date.now() - c.ts < CONSENT_MAX_AGE ? c : null;
  } catch { return null; }
}

function saveConsent(c: Consent) {
  try { localStorage.setItem(KEY, JSON.stringify(c)); } catch { /* stockage indisponible : le choix vaut pour la page */ }
}

function loadGtm() {
  const id = document.body.dataset.gtm;
  if (!id || window.__gtmLoaded) return;
  window.__gtmLoaded = true;
  window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
  const s = document.createElement('script');
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`;
  document.head.appendChild(s);
}

function applyConsent(c: Consent) {
  window.gtag('consent', 'update', {
    analytics_storage: c.analytics ? 'granted' : 'denied',
    ad_storage: c.ads ? 'granted' : 'denied',
    ad_user_data: c.ads ? 'granted' : 'denied',
    ad_personalization: c.ads ? 'granted' : 'denied',
  });
  if (c.ads) captureClickIds();
  if (c.analytics || c.ads) loadGtm();
}

/* Attribution : UTM conservés pour la session, identifiants de clic seulement avec consentement publicitaire */
function readAttribution(): Params {
  try { return JSON.parse(sessionStorage.getItem(ATTR_KEY) || '{}'); } catch { return {}; }
}
function writeAttribution(a: Params) {
  try { sessionStorage.setItem(ATTR_KEY, JSON.stringify(a)); } catch { /* ignoré */ }
}
function captureUtm() {
  const p = new URLSearchParams(location.search);
  const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
  const fromCampaign = keys.some((k) => p.has(k));
  // On garde la première page de la session, sauf si une nouvelle campagne arrive
  if (readAttribution().landing_page && !fromCampaign) return;
  const a: Params = {};
  keys.forEach((k) => { const v = p.get(k); if (v) a[k] = v; });
  a.landing_page = location.pathname;
  a.referrer = document.referrer ? new URL(document.referrer).hostname : null;
  writeAttribution(a);
}
function captureClickIds() {
  const p = new URLSearchParams(location.search);
  const a = readAttribution();
  ['gclid', 'gbraid', 'wbraid', 'fbclid'].forEach((k) => { const v = p.get(k); if (v) a[k] = v; });
  writeAttribution(a);
}
export function getAttribution(): Params { return readAttribution(); }

/* Bandeau */
function initBanner() {
  const banner = document.querySelector<HTMLElement>('[data-consent-banner]');
  if (!banner) return;
  const details = banner.querySelector<HTMLElement>('[data-consent-details]')!;
  const cbA = banner.querySelector<HTMLInputElement>('[data-consent-analytics]')!;
  const cbAds = banner.querySelector<HTMLInputElement>('[data-consent-ads]')!;
  const btn = (n: string) => banner.querySelector<HTMLButtonElement>(`[data-consent="${n}"]`)!;

  const decide = (c: Omit<Consent, 'ts'>) => {
    const full = { ...c, ts: Date.now() };
    saveConsent(full);
    applyConsent(full);
    banner.hidden = true;
    track('consent_update', { analytics: c.analytics, ads: c.ads });
  };
  const open = (customize = false) => {
    const c = readConsent();
    cbA.checked = !!c?.analytics;
    cbAds.checked = !!c?.ads;
    details.hidden = !customize;
    btn('save').hidden = !customize;
    btn('customize').hidden = customize;
    banner.hidden = false;
  };

  btn('accept').addEventListener('click', () => decide({ analytics: true, ads: true }));
  btn('refuse').addEventListener('click', () => decide({ analytics: false, ads: false }));
  btn('customize').addEventListener('click', () => open(true));
  btn('save').addEventListener('click', () => decide({ analytics: cbA.checked, ads: cbAds.checked }));
  document.querySelectorAll('[data-consent-open]').forEach((el) => el.addEventListener('click', () => open(true)));

  const existing = readConsent();
  if (existing) applyConsent(existing);
  else open(false);
}

/* Clics suivis : téléphone, WhatsApp, CTA */
function initClicks() {
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement).closest<HTMLElement>('a, button');
    if (!a) return;
    const placement = a.closest<HTMLElement>('[data-placement]')?.dataset.placement ?? a.dataset.placement ?? null;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('tel:')) track('phone_click', { placement });
    else if (href.includes('wa.me/')) track('whatsapp_click', { placement });
    else if (a.dataset.cta) track('cta_click', { cta: a.dataset.cta, placement, page: location.pathname });
  });
}

captureUtm();
initBanner();
initClicks();
