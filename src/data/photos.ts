/**
 * Photos d'illustration (licence Unsplash, crédits dans src/data/credits.ts et sur /credits-photos/).
 * Elles donnent l'ambiance en attendant les photos des chantiers STRATE : pour les remplacer,
 * déposer la photo STRATE dans src/assets/photos/ et changer l'import ci-dessous.
 * Règle : aucune photo d'illustration n'est présentée comme une réalisation STRATE.
 */
import type { ImageMetadata } from 'astro';
import heroTerrassePiscine from '../assets/photos/hero-terrasse-piscine.jpg';
import terrassePierre from '../assets/photos/terrasse-pierre.jpg';
import terrasseSoir from '../assets/photos/terrasse-soir.jpg';
import piscinePlage from '../assets/photos/piscine-plage.jpg';
import piscineBord from '../assets/photos/piscine-bord.jpg';
import alleeGravier from '../assets/photos/allee-gravier.jpg';
import escalierPierre from '../assets/photos/escalier-pierre.jpg';
import entreeBrique from '../assets/photos/entree-brique.jpg';
import entreePorteVerte from '../assets/photos/entree-porte-verte.jpg';
import vieCoupleJardin from '../assets/photos/vie-couple-jardin.jpg';
import vieChienJardin from '../assets/photos/vie-chien-jardin.jpg';
import vieEnfantsJardin from '../assets/photos/vie-enfants-jardin.jpg';
import conseilDiagnostic from '../assets/photos/conseil-diagnostic.jpg';
import conseilCouple from '../assets/photos/conseil-couple.jpg';
import artisanTaloche from '../assets/photos/artisan-taloche.jpg';
import artisanSol from '../assets/photos/artisan-sol.jpg';
import galetsBeige from '../assets/photos/galets-beige.jpg';
import galetsBlanc from '../assets/photos/galets-blanc.jpg';
import galetsGris from '../assets/photos/galets-gris.jpg';
import galetsMix from '../assets/photos/galets-mix.jpg';
import galetsMacro from '../assets/photos/galets-macro.jpg';
import lilleFacades from '../assets/photos/lille-facades.jpg';
import lilleRueBrique from '../assets/photos/lille-rue-brique.jpg';
import renovationFissures from '../assets/photos/renovation-fissures.jpg';

export interface Photo { src: ImageMetadata; alt: string; position?: string }
const p = (src: ImageMetadata, alt: string, position?: string): Photo => ({ src, alt, position });

export const photos = {
  hero: p(heroTerrassePiscine, 'Terrasse minérale et piscine d’une maison contemporaine à la tombée du jour', '50% 70%'),
  terrassePierre: p(terrassePierre, 'Terrasse minérale avec salon de jardin devant une maison'),
  terrasseSoir: p(terrasseSoir, 'Terrasse couverte éclairée le soir'),
  piscinePlage: p(piscinePlage, 'Piscine entourée d’une plage minérale claire et de végétation'),
  piscineBord: p(piscineBord, 'Bord de piscine en pierre avec transats'),
  alleeGravier: p(alleeGravier, 'Allée minérale bordée de végétation', '50% 70%'),
  escalierPierre: p(escalierPierre, 'Escalier extérieur aux marches courbes dans un jardin'),
  entreeBrique: p(entreeBrique, 'Entrée de maison en brique avec marches en pierre'),
  entreePorteVerte: p(entreePorteVerte, 'Façade de brique et porte d’entrée verte'),
  vieCouple: p(vieCoupleJardin, 'Un couple profite de la fin de journée dans son jardin', '50% 60%'),
  vieChien: p(vieChienJardin, 'Un couple et son chien installés au jardin', '50% 60%'),
  vieEnfants: p(vieEnfantsJardin, 'Deux enfants jouent dans le jardin'),
  conseilDiagnostic: p(conseilDiagnostic, 'Un conseiller échange avec une propriétaire'),
  conseilCouple: p(conseilCouple, 'Un couple parle de son projet de rénovation'),
  artisanTaloche: p(artisanTaloche, 'Un poseur lisse un revêtement de sol à la taloche', '50% 80%'),
  artisanSol: p(artisanSol, 'Un poseur au travail sur un sol en cours de réalisation'),
  galetsMacro: p(galetsMacro, 'Galets naturels vus de près'),
  lilleFacades: p(lilleFacades, 'Façades de brique du Vieux-Lille'),
  lilleRueBrique: p(lilleRueBrique, 'Rue de maisons en brique dans le Nord'),
  renovationFissures: p(renovationFissures, 'Dalle extérieure fissurée et usée'),
} satisfies Record<string, Photo>;

/** Granulats du nuancier (macros de pierre naturelle) */
export const finishPhotos: Record<string, Photo> = {
  beige: p(galetsBeige, 'Granulats beige naturel vus de près'),
  blanc: p(galetsBlanc, 'Galets blancs vus de près'),
  gris: p(galetsGris, 'Granulats gris vus de près'),
  mix: p(galetsMix, 'Mélange de granulats clairs vus de près'),
};

/** Photo d'ambiance de chaque page usage */
export const usagePhotos: Record<string, Photo> = {
  'terrasse-moquette-de-pierre': photos.terrassePierre,
  'moquette-de-pierre-piscine': photos.piscinePlage,
  'moquette-de-pierre-allee': photos.alleeGravier,
  'moquette-de-pierre-entree': photos.entreeBrique,
  'moquette-de-pierre-escalier': photos.escalierPierre,
  'renovation-terrasse': photos.renovationFissures,
};

/** Photo d'ambiance des pages villes (les autres villes gardent une page sans photo en attendant) */
export const villePhotos: Record<string, Photo> = {
  lille: photos.lilleFacades,
};
