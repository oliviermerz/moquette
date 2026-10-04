/**
 * La « machine à preuves » : ce qui est publié, ce qui est indexé, et pourquoi.
 * Toutes les règles de publication du dossier de conception sont ici.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { site } from '../config/site';
import { getGoogleReviews, type Review } from './google-reviews';

export type Realisation = CollectionEntry<'realisations'>;
export type Ville = CollectionEntry<'villes'>;

/** Seuil de texte éditorial unique pour qu'une page ville soit indexée */
export const MIN_WORDS_VILLE = 200;

export async function getRealisations(): Promise<Realisation[]> {
  const all = await getCollection('realisations', (e) => !e.data.draft);
  return all.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export async function getVilles(): Promise<Ville[]> {
  return (await getCollection('villes')).sort((a, b) => a.data.name.localeCompare(b.data.name, 'fr'));
}

export const villeUrl = (v: Ville | string) => `/moquette-de-pierre-${typeof v === 'string' ? v : v.id}/`;
export const realisationUrl = (r: Realisation) => `/realisations/${r.id}/`;

const words = (s?: string) => (s ?? '').replace(/[#*_>`-]/g, ' ').split(/\s+/).filter(Boolean).length;

export interface Check { label: string; ok: boolean }
export interface VilleStatus { ville: Ville; realisations: Realisation[]; avis: Review[]; checks: Check[]; indexable: boolean }

/** Une page ville n'est indexée que lorsqu'elle a des preuves locales */
export async function villeStatus(ville: Ville): Promise<VilleStatus> {
  const realisations = (await getRealisations()).filter((r) => r.data.zone?.id === ville.id);
  const avis = (await getAvis()).filter((a) => a.zone === ville.id);
  const temoignages = realisations.filter((r) => r.data.temoignage).length + avis.length;
  const checks: Check[] = [
    { label: 'au moins 1 réalisation documentée rattachée à la ville', ok: realisations.length >= 1 },
    { label: 'au moins 1 témoignage ou avis authentique', ok: temoignages >= 1 },
    { label: `texte éditorial unique d'au moins ${MIN_WORDS_VILLE} mots`, ok: words(ville.body) >= MIN_WORDS_VILLE },
    { label: 'au moins 3 communes desservies', ok: ville.data.communes.length >= 3 },
    { label: 'au moins 3 questions de FAQ locale', ok: ville.data.faq.length >= 3 },
  ];
  return { ville, realisations, avis, checks, indexable: checks.every((c) => c.ok) };
}

export async function getVilleStatuses(): Promise<VilleStatus[]> {
  return Promise.all((await getVilles()).map(villeStatus));
}

/** Avis : saisie manuelle (collection « avis ») + avis Google lus via l'API au build */
export async function getAvis(): Promise<(Review & { zone?: string; source: 'google' })[]> {
  const manual = (await getCollection('avis')).map((a) => ({
    author: a.data.auteur, rating: a.data.note, text: a.data.texte, date: a.data.date, url: a.data.url,
    ville: a.data.ville, zone: a.data.zone?.id, source: 'google' as const,
  }));
  const api = (await getGoogleReviews())?.reviews.map((r) => ({ ...r, source: 'google' as const })) ?? [];
  // Dédoublonnage : un avis saisi à la main et aussi renvoyé par l'API n'apparaît qu'une fois
  const seen = new Set(manual.map((m) => `${m.author}|${m.text.slice(0, 40)}`));
  return [...manual, ...api.filter((r) => !seen.has(`${r.author}|${r.text.slice(0, 40)}`))].sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Chiffres de preuve : affichés seulement au-delà des seuils fixés dans site.ts (jamais de faux grands chiffres) */
export async function getProofStats() {
  const r = await getRealisations();
  const m2 = Math.round(r.reduce((s, x) => s + (x.data.surface ?? 0), 0));
  const g = await getGoogleReviews();
  const t = site.proofThresholds;
  return {
    projets: t.projets != null && r.length >= t.projets ? r.length : null,
    m2: t.m2 != null && m2 >= t.m2 ? m2 : null,
    google: g && g.rating != null && t.avisGoogle != null && g.count >= t.avisGoogle ? { rating: g.rating, count: g.count, url: g.mapsUrl } : null,
  };
}

/** Rapport affiché dans la console au build : ce qui manque pour indexer chaque ville */
let reported = false;
export async function reportVilles() {
  if (reported) return;
  reported = true;
  const statuses = await getVilleStatuses();
  const r = await getRealisations();
  console.info(`\n[preuves] ${r.length} réalisation(s) publiée(s). Pages villes :`);
  for (const s of statuses) {
    const missing = s.checks.filter((c) => !c.ok).map((c) => c.label);
    console.info(`  ${s.indexable ? '✓ indexée ' : '· noindex  '} ${s.ville.data.name.padEnd(14)} ${missing.length ? `manque : ${missing.join(' ; ')}` : ''}`);
  }
}
