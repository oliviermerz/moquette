/**
 * Moteur tarifaire de l'Estimateur STRATE.
 * Partagé entre le navigateur (affichage immédiat) et le serveur (calcul de référence envoyé au CRM).
 *
 * RÈGLE : aucune fourchette n'est affichée tant que `grilleValidee` est false
 * ou qu'une valeur nécessaire au calcul vaut null. Ne jamais remplir ces champs avec des valeurs inventées.
 */
import { site } from './site';

export const ESPACES = ['terrasse', 'piscine', 'allee', 'entree', 'escalier', 'autre'] as const;
export const SUPPORTS = ['beton', 'carrelage', 'dallage', 'ancien', 'gravier', 'terre', 'nsp'] as const;
export const ETATS = ['tres-bon', 'correct', 'degrade', 'nsp'] as const;
export const FINITIONS = ['beige', 'blanc', 'gris', 'mix', 'autre'] as const;
export const DELAIS = ['asap', '1-3', '3-6', 'plus-tard', 'renseigne'] as const;

export type Espace = (typeof ESPACES)[number];
export type Support = (typeof SUPPORTS)[number];
export type Etat = (typeof ETATS)[number];
export type Finition = (typeof FINITIONS)[number];
export type Delai = (typeof DELAIS)[number];

export const LABELS = {
  espace: { terrasse: 'Terrasse', piscine: 'Plage de piscine', allee: 'Allée', entree: 'Entrée', escalier: 'Escalier', autre: 'Autre' },
  support: { beton: 'Béton', carrelage: 'Carrelage', dallage: 'Dallage', ancien: 'Ancien revêtement', gravier: 'Gravier', terre: 'Terre', nsp: 'Je ne sais pas' },
  etat: { 'tres-bon': 'Très bon', correct: 'Correct', degrade: 'Dégradé', nsp: 'Je ne sais pas' },
  finition: { beige: 'Beige naturel', blanc: 'Blanc minéral', gris: 'Gris contemporain', mix: 'Mix pierre', autre: 'Autre / à définir' },
  delai: { asap: 'Dès que possible', '1-3': 'Dans 1 à 3 mois', '3-6': 'Dans 3 à 6 mois', 'plus-tard': 'Plus tard', renseigne: 'Je me renseigne' },
} as const;

export const PRICING = {
  grilleValidee: false, // à passer à true uniquement après validation de la direction

  /** Prix TTC au m², pose comprise, sur support compatible en très bon état */
  prixBaseM2: null as number | null,
  /** Coefficients multiplicateurs selon le support existant */
  coefSupport: { beton: null, carrelage: null, dallage: null, ancien: null } as Record<'beton' | 'carrelage' | 'dallage' | 'ancien', number | null>,
  /** Supplément au m² pour créer un support (gravier, terre) */
  creationSupportM2: null as number | null,
  /** Coefficients selon l'état du support */
  coefEtat: { 'tres-bon': null, correct: null, degrade: null } as Record<'tres-bon' | 'correct' | 'degrade', number | null>,
  /** Coefficients selon l'espace (bordures, géométrie, finitions) */
  coefEspace: { terrasse: null, piscine: null, allee: null, entree: null } as Record<'terrasse' | 'piscine' | 'allee' | 'entree', number | null>,
  /** Prix TTC par marche d'escalier, nez de marche compris */
  prixParMarche: null as number | null,
  /** Surface minimale facturée (m²) */
  surfaceMini: null as number | null,
  /** Largeur de la fourchette affichée (0,15 = ±15 %) */
  marge: 0.15,
};

export interface Answers {
  espace: Espace;
  surface?: number | null;
  marches?: number | null;
  support: Support;
  etat: Etat;
  finition?: Finition;
  codePostal?: string;
}

export type Estimate =
  | { status: 'ok'; min: number; max: number }
  | { status: 'study'; reasons: string[] };

const round100 = (n: number) => Math.round(n / 100) * 100;

export function estimate(a: Answers): Estimate {
  const reasons: string[] = [];
  const p = PRICING;
  if (!p.grilleValidee) reasons.push('notre grille tarifaire est en cours de validation');
  if (a.espace === 'autre') reasons.push('votre projet demande une étude sur mesure');
  if (a.support === 'nsp') reasons.push('le support reste à identifier');
  if (a.etat === 'nsp') reasons.push('son état reste à évaluer');
  if (reasons.length) return { status: 'study', reasons };

  let total = 0;
  if (a.espace === 'escalier') {
    if (!a.marches || p.prixParMarche == null) return { status: 'study', reasons: ['le nombre de marches est à confirmer'] };
    total = a.marches * p.prixParMarche;
  } else {
    const surface = Math.max(a.surface ?? 0, p.surfaceMini ?? 0);
    const create = a.support === 'gravier' || a.support === 'terre';
    const cs = create ? 1 : p.coefSupport[a.support as keyof typeof p.coefSupport];
    const ce = p.coefEtat[a.etat as keyof typeof p.coefEtat];
    const cz = p.coefEspace[a.espace as keyof typeof p.coefEspace];
    if (!surface || p.prixBaseM2 == null || cs == null || ce == null || cz == null || (create && p.creationSupportM2 == null)) {
      return { status: 'study', reasons: ['certaines données tarifaires ne sont pas encore paramétrées'] };
    }
    total = surface * p.prixBaseM2 * cs * ce * cz + (create ? surface * (p.creationSupportM2 as number) : 0);
  }
  return { status: 'ok', min: round100(total * (1 - p.marge)), max: round100(total * (1 + p.marge)) };
}

/** Complexité du chantier : A standard, B avec préparation, C sur mesure */
export function complexity(a: Answers): { grade: 'A' | 'B' | 'C'; label: string } {
  let s = 0;
  if (a.support === 'gravier' || a.support === 'terre') s += 3;
  if (a.support === 'nsp' || a.support === 'ancien') s += 1;
  if (a.etat === 'degrade') s += 2;
  if (a.etat === 'nsp') s += 1;
  if (a.espace === 'escalier') s += 2;
  if (a.espace === 'autre') s += 2;
  if (a.espace !== 'escalier' && (a.surface ?? 0) > 0 && (a.surface ?? 0) < 15) s += 1;
  if (s <= 1) return { grade: 'A', label: 'Projet standard' };
  if (s <= 3) return { grade: 'B', label: 'Projet avec préparation' };
  return { grade: 'C', label: 'Projet sur mesure' };
}

export function zoneCovered(cp?: string): boolean {
  return !!cp && /^\d{5}$/.test(cp) && site.zones.departments.includes(cp.slice(0, 2));
}

/** Priorité commerciale : A à rappeler en premier */
export function priority(a: Answers, delai?: Delai | ''): 'A' | 'B' | 'C' {
  let s = 0;
  if (zoneCovered(a.codePostal)) s += 2;
  if (delai === 'asap' || delai === '1-3') s += 2;
  else if (delai === '3-6') s += 1;
  if ((a.surface ?? 0) >= 40 || (a.marches ?? 0) >= 8) s += 1;
  return s >= 4 ? 'A' : s >= 2 ? 'B' : 'C';
}

/** Points d'attention affichés au prospect et repris dans la note CRM */
export function notes(a: Answers): string[] {
  const n: string[] = [];
  if (a.support === 'gravier' || a.support === 'terre') n.push("Un support stable doit d'abord être créé (dalle ou structure adaptée). C'est souvent le premier poste du budget.");
  if (a.support === 'carrelage') n.push("La pose sur carrelage est souvent possible s'il est sain et bien adhérent. Nous le vérifions au diagnostic.");
  if (a.support === 'nsp' || a.etat === 'nsp') n.push("Pas d'inquiétude : le diagnostic identifiera votre support et son état.");
  if (a.etat === 'degrade') n.push('Une préparation sera probablement nécessaire (reprise des fissures, ragréage).');
  if (a.espace === 'piscine') n.push("Autour d'une piscine, nous choisissons un granulat confortable pieds nus et vérifions les pentes.");
  if (a.espace === 'escalier') n.push("L'épaisseur ajoutée sur chaque marche est prise en compte pour garder des hauteurs régulières.");
  if ((a.surface ?? 0) >= 300) n.push('Grand projet : la visite technique est prioritaire.');
  if (a.codePostal && !zoneCovered(a.codePostal)) n.push("Votre code postal est en dehors de notre zone actuelle. Nous enregistrons votre projet et vous recontactons dès que possible.");
  return n;
}

export const formatEuros = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
