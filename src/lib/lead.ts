/** Validation et enrichissement d'une demande d'étude (côté serveur uniquement). */
import { z } from 'astro/zod';
import { ESPACES, SUPPORTS, ETATS, FINITIONS, DELAIS, LABELS, estimate, complexity, priority, notes, zoneCovered, type Answers, type Estimate } from '../config/pricing';

const bool = z.preprocess((v) => v === true || v === 'true' || v === 'on' || v === '1', z.boolean());
const optNum = (min: number, max: number) =>
  z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().int().min(min).max(max).nullable());

export const LeadInput = z
  .object({
    espace: z.enum(ESPACES),
    surface: optNum(1, 10000).optional(),
    marches: optNum(1, 200).optional(),
    support: z.enum(SUPPORTS),
    etat: z.enum(ETATS),
    finition: z.enum(FINITIONS).optional(),
    code_postal: z.string().trim().regex(/^\d{5}$/, 'Code postal à 5 chiffres'),
    prenom: z.string().trim().min(1, 'Prénom requis').max(80),
    nom: z.string().trim().min(1, 'Nom requis').max(80),
    email: z.string().trim().toLowerCase().pipe(z.email('Email invalide').max(200)),
    telephone: z.string().trim().min(10, 'Téléphone à 10 chiffres').max(25),
    delai: z.union([z.enum(DELAIS), z.literal('')]).optional(),
    message: z.string().trim().max(2000).optional(),
    consentement_traitement: bool.refine((v) => v === true, 'Consentement requis'),
    consentement_marketing: bool.optional(),
    attribution: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional(),
    page: z.string().max(300).optional(),
    site_web: z.string().optional(), // pot de miel
  })
  .refine((d) => (d.espace === 'escalier' ? !!d.marches : !!d.surface), { message: 'Surface ou nombre de marches requis', path: ['surface'] });

export type LeadInputT = z.infer<typeof LeadInput>;

/** 06 12 34 56 78 → +33612345678 (format attendu par Brevo) */
export function normalizePhone(raw: string): string | null {
  let d = raw.replace(/[^\d+]/g, '');
  if (d.startsWith('00')) d = `+${d.slice(2)}`;
  if (/^0\d{9}$/.test(d)) return `+33${d.slice(1)}`;
  if (/^33\d{9}$/.test(d)) return `+${d}`;
  if (/^\+\d{8,15}$/.test(d)) return d;
  return null;
}

export interface Lead {
  input: LeadInputT;
  answers: Answers;
  phoneE164: string | null;
  estimate: Estimate;
  complexity: ReturnType<typeof complexity>;
  priority: 'A' | 'B' | 'C';
  zoneCovered: boolean;
  notes: string[];
  receivedAt: string;
}

export function enrich(input: LeadInputT): Lead {
  const answers: Answers = {
    espace: input.espace,
    surface: input.espace === 'escalier' ? null : input.surface ?? null,
    marches: input.espace === 'escalier' ? input.marches ?? null : null,
    support: input.support,
    etat: input.etat,
    finition: input.finition,
    codePostal: input.code_postal,
  };
  return {
    input,
    answers,
    phoneE164: normalizePhone(input.telephone),
    estimate: estimate(answers),
    complexity: complexity(answers),
    priority: priority(answers, input.delai),
    zoneCovered: zoneCovered(input.code_postal),
    notes: notes(answers),
    receivedAt: new Date().toISOString(),
  };
}

/** Résumé lisible du projet, repris dans les emails et la note CRM */
export function summaryRows(l: Lead): [string, string][] {
  const a = l.answers;
  const rows: [string, string][] = [
    ['Espace', LABELS.espace[a.espace]],
    a.espace === 'escalier' ? ['Marches', `${a.marches}`] : ['Surface', `${a.surface} m²`],
    ['Support', LABELS.support[a.support]],
    ['État du support', LABELS.etat[a.etat]],
  ];
  if (a.finition) rows.push(['Finition', LABELS.finition[a.finition]]);
  rows.push(['Code postal', a.codePostal ?? '']);
  if (l.input.delai) rows.push(['Échéance', LABELS.delai[l.input.delai]]);
  return rows;
}

export function projectTitle(l: Lead): string {
  const a = l.answers;
  const size = a.espace === 'escalier' ? `${a.marches} marches` : `${a.surface} m²`;
  return `${LABELS.espace[a.espace]} ${size} · ${a.codePostal} · ${l.input.prenom} ${l.input.nom}`;
}
