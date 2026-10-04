/**
 * Contenus de preuve : réalisations, villes, avis.
 * Les schémas imposent les règles du dossier de conception :
 * pas d'étude de cas sans photos avant/après, surface et durée réelle ; pas de témoignage sans autorisation écrite.
 */
import { defineCollection, reference } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';
import { ESPACES, SUPPORTS } from './config/pricing';

const faq = z.array(z.object({ q: z.string().min(5), a: z.string().min(10) }));

const realisations = defineCollection({
  // Les fichiers commençant par « _ » (modèles, brouillons) sont ignorés
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/realisations' }),
  schema: ({ image }) =>
    z.object({
      title: z.string().min(10),
      usage: z.enum(ESPACES),
      ville: z.string(),
      codePostal: z.string().regex(/^\d{5}$/),
      zone: reference('villes').optional(), // page ville que cette réalisation alimente
      date: z.coerce.date(), // date de réception du chantier
      surface: z.number().positive().optional(),
      marches: z.number().int().positive().optional(),
      support: z.enum(SUPPORTS),
      etatInitial: z.string().min(3),
      finition: z.string().min(3), // nom du coloris tel que présenté au client
      dureeJours: z.number().positive(),
      probleme: z.string().min(40),
      solution: z.string().min(40),
      etapes: z.array(z.object({ titre: z.string(), texte: z.string(), photo: image().optional(), alt: z.string().optional() })).min(2),
      avant: image(),
      avantAlt: z.string().min(10),
      apres: image(),
      apresAlt: z.string().min(10),
      photos: z.array(z.object({ src: image(), alt: z.string().min(10) })).default([]),
      temoignage: z.object({
        texte: z.string().min(20),
        prenom: z.string(),
        autorisation: z.literal(true, 'Témoignage publiable uniquement avec l’autorisation écrite du client'),
      }).optional(),
      avisGoogleUrl: z.url().optional(),
      featured: z.boolean().default(false),
      draft: z.boolean().default(false),
    })
    .refine((d) => (d.usage === 'escalier' ? !!d.marches : !!d.surface), { message: 'Indiquer la surface (ou le nombre de marches pour un escalier)' }),
});

const villes = defineCollection({
  loader: glob({ pattern: '**/[^_]*.md', base: './src/content/villes' }),
  schema: z.object({
    name: z.string(),
    region: z.string().default('hauts-de-france'),
    departement: z.string().regex(/^\d{2}$/),
    codePostal: z.string().regex(/^\d{5}$/),
    metaDescription: z.string().min(80).max(170),
    intro: z.string().min(40),
    enjeux: z.array(z.object({ titre: z.string(), texte: z.string() })).min(2), // problématiques locales
    communes: z.array(z.string()).default([]),
    faq: faq.default([]),
  }),
});

/** Avis saisis à la main (copie fidèle d'avis Google publics), en complément de l'API Google Places */
const avis = defineCollection({
  loader: file('src/content/avis.json'),
  schema: z.object({
    auteur: z.string(), // prénom ou nom affiché sur Google
    ville: z.string().optional(),
    zone: reference('villes').optional(),
    note: z.number().int().min(1).max(5),
    texte: z.string().min(5),
    date: z.coerce.date(),
    url: z.url(), // lien vers l'avis original
    realisation: reference('realisations').optional(),
  }),
});

export const collections = { realisations, villes, avis };
