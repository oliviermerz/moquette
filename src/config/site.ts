/**
 * Configuration centrale de STRATE.
 *
 * Règle : toute valeur `null` correspond à une information non encore validée.
 * Les composants masquent automatiquement ce qui dépend d'une valeur `null`,
 * pour qu'aucun chiffre, numéro ou engagement ne soit inventé.
 */

export interface Phone { display: string; e164: string }
export interface Address { street: string; postalCode: string; city: string; region: string; country: 'FR' }

export const site = {
  name: 'STRATE',
  signature: 'Extérieurs en pierre naturelle',
  promise: 'Transformez votre extérieur avec la pierre.',
  locale: 'fr_FR',

  // Coordonnées : à valider
  phone: null as Phone | null, // ex. { display: '03 20 00 00 00', e164: '+33320000000' }
  email: null as string | null,
  whatsapp: null as string | null, // numéro international sans +, ex. '33600000000'
  address: null as Address | null, // requis pour publier le schéma LocalBusiness

  // Mentions légales : à valider
  legal: {
    company: null as string | null, // raison sociale
    form: null as string | null, // SAS, SARL…
    capital: null as string | null,
    siret: null as string | null,
    rcs: null as string | null,
    vat: null as string | null,
    director: null as string | null, // directeur de la publication
    host: null as string | null, // hébergeur : nom, adresse, téléphone
    insurerDecennale: null as string | null, // assureur et zone de couverture
    insurerRcPro: null as string | null,
  },

  // Zone d'intervention : à valider
  zones: {
    region: 'Hauts-de-France',
    departments: ['59', '62', '80', '02', '60'],
    cities: ['Lille', 'Valenciennes', 'Douai', 'Lens', 'Arras', 'Cambrai', 'Béthune', 'Dunkerque', 'Calais', 'Amiens'],
  },

  // Engagements commerciaux : affichés uniquement une fois renseignés
  pricing: {
    fromPerM2: null as number | null, // « À partir de XX €/m² », uniquement si validé
  },
  callbackDelay: null as string | null, // ex. 'sous 24 h ouvrées'

  // Seuils d'affichage des chiffres de preuve (calculés depuis les réalisations publiées et Google). null = jamais affiché.
  proofThresholds: {
    projets: 10 as number | null, // « 12 projets réalisés » à partir de 10 chantiers publiés
    m2: 1000 as number | null, // « 1 250 m² posés » à partir de 1 000 m²
    avisGoogle: 5 as number | null, // note Google affichée à partir de 5 avis
  },

  social: {
    instagram: null as string | null,
    facebook: null as string | null,
  },

  // Outils (variables d'environnement, voir .env.example)
  gtmId: (import.meta.env.PUBLIC_GTM_ID as string | undefined) || null,
  leadEndpoint: (import.meta.env.PUBLIC_LEAD_ENDPOINT as string | undefined) || null,
};

export const nav = [
  { label: 'Réalisations', href: '/realisations/' },
  { label: 'Solutions', href: '/solutions/' },
  { label: 'Moquette de pierre', href: '/moquette-de-pierre/' },
  { label: 'Prix', href: '/prix-moquette-de-pierre/' },
  { label: 'Conseils', href: '/conseils/' },
  { label: "L'entreprise", href: '/entreprise/' },
];

export const ESTIMATE_URL = '/estimer-mon-projet/';
