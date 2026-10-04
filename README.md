# STRATE · site web

Site de STRATE, marque de transformation des extérieurs en pierre naturelle résinée.
Astro 7, pages statiques, JavaScript uniquement pour les composants interactifs.
Une seule route serveur : `/api/lead/`, qui transmet les demandes à Brevo.

## Démarrer

```bash
npm install
npm run build && npm run preview   # aperçu de production sur http://localhost:4321
npm run dev                        # développement
npm run check                      # vérification TypeScript
npm run brevo:setup                # diagnostic du compte Brevo (voir docs/brevo.md)
npm start                          # serveur de production (après build)
```

Sur le lecteur réseau `P:`, le serveur de développement peut redémarrer en boucle (surveillance des fichiers).
Dans ce cas, utiliser `npm run build && npm run preview`.

Les secrets (`BREVO_API_KEY`…) vont dans `.env`, jamais dans le code : voir `.env.example`.

## Configuration

| Où | Quoi |
|---|---|
| `src/config/site.ts` | Coordonnées, mentions légales, zones, prix « à partir de », délai de rappel, réseaux sociaux. **Toute valeur `null` est masquée sur le site.** |
| `.env` (voir `.env.example`) | URL du site, GTM, préproduction, clés et identifiants Brevo, destinataires des notifications |
| `src/config/pricing.ts` | Grille tarifaire de l'Estimateur (vide tant qu'elle n'est pas validée) |
| `src/data/usages.ts` | Contenu des 6 pages usages (texte unique par page) |
| `src/data/content.ts` | Méthode 5 Strates, « Pourquoi nous », piliers, FAQ de l'accueil |
| `src/data/textures.ts` | Textures provisoires et nuancier |

### Ce qui s'affiche automatiquement une fois renseigné

- `phone` : numéro dans l'en-tête, la barre mobile, le pied de page et les CTA « Parler à un expert ».
- `address` : schéma `LocalBusiness` (sinon seul `Organization` est publié).
- `pricing.fromPerM2` : encart « À partir de XX €/m² » sur la page Prix.
- `callbackDelay` : promesse de rappel dans les CTA et le formulaire.
- `legal.*` : mentions légales et page Entreprise (assurances).

En développement, les champs manquants des pages légales apparaissent surlignés (`.todo`).

## Pages

| URL | Rôle |
|---|---|
| `/` | Accueil, 15 blocs dans l'ordre du dossier de conception |
| `/terrasse-moquette-de-pierre/`, `/moquette-de-pierre-piscine/`, `/moquette-de-pierre-allee/`, `/moquette-de-pierre-entree/`, `/moquette-de-pierre-escalier/`, `/renovation-terrasse/` | Pages usages (gabarit `src/pages/[usage].astro`) |
| `/solutions/` | Hub des usages |
| `/moquette-de-pierre/` | Page pilier |
| `/moquette-de-pierre/comparatif/` | Comparatif carrelage, béton, pavés |
| `/prix-moquette-de-pierre/` | Prix, sans montant inventé |
| `/entreprise/`, `/entreprise/methode/` | Entreprise, Méthode 5 Strates |
| `/estimer-mon-projet/` | L'Estimateur : 6 questions, estimation, demande d'étude (fonctionne aussi sans JavaScript) |
| `/estimer-mon-projet/merci/` | Confirmation (envoi sans JavaScript), `noindex` |
| `/api/lead/` | Réception des demandes → Brevo (route serveur) |
| `/visualiser-mon-exterieur/` | STRATE Vision |
| `/api/vision/`, `/api/chat/` | Rendu IA et assistant (routes serveur) |
| `/realisations/` | Galerie filtrable ; `noindex` tant qu'aucune réalisation n'est publiée |
| `/realisations/<dossier>/` | Étude de cas |
| `/moquette-de-pierre-<ville>/` | Pages villes (10 en Hauts-de-France), indexées selon les preuves |
| `/zones/hauts-de-france/` | Hub régional |
| `/conseils/` | Page d'attente, `noindex` (articles à venir) |
| `/mentions-legales/`, `/confidentialite/`, `/plan-du-site/`, `404` | Légal et utilitaires |

## Réalisations, villes et avis (la machine à preuves)

| Où | Quoi |
|---|---|
| `src/content/realisations/<dossier>/index.md` + photos | Une étude de cas. Copier `src/content/realisations/_modele.md`, qui explique chaque champ. |
| `src/content/villes/<ville>.md` | Une page `/moquette-de-pierre-<ville>/` : texte unique, enjeux locaux, communes, FAQ |
| `src/content/avis.json` | Avis Google recopiés à la main (en complément de l'API Google Places) |
| `src/lib/proof.ts` | Les règles de publication |

Le build refuse une étude de cas incomplète : photos avant/après, surface (ou nombre de marches), durée réelle, au moins 2 étapes,
et témoignage seulement avec `autorisation: true`.

**Pages villes** : générées pour chaque fichier ville, mais **indexées seulement** quand elles réunissent
1 réalisation rattachée (`zone: <ville>`), 1 témoignage ou avis, 200 mots de texte unique, 3 communes et 3 questions de FAQ.
Sinon : `noindex`, absentes du sitemap et non liées depuis le pied de page. Chaque build affiche le bilan :

```
[preuves] 1 réalisation(s) publiée(s). Pages villes :
  ✓ indexée  Douai
  · noindex   Lille   manque : au moins 1 réalisation documentée rattachée à la ville ; …
```

Les listes de communes des fichiers villes sont à valider avec la zone d'intervention réelle.

**Avis Google** : renseigner `GOOGLE_PLACES_API_KEY` et `GOOGLE_PLACE_ID` ; les avis sont lus à chaque build
(reconstruire régulièrement, par exemple chaque nuit). Ils sont affichés tels que Google les renvoie, sans tri par note.
Pas de balisage `AggregateRating` : Google n'affiche pas d'étoiles pour les avis qu'une entreprise publie sur son propre site.

**Chiffres de preuve** (projets réalisés, m² posés, note Google) : calculés à partir des contenus publiés et affichés
seulement au-delà des seuils de `proofThresholds` dans `src/config/site.ts`. Avant, l'accueil affiche « 100 % des chantiers documentés ».

## STRATE Vision (visualisation IA)

Page `/visualiser-mon-exterieur/` : photo → tracé du sol (au doigt) → finition → aperçu instantané (dans le navigateur, gratuit)
→ rendu réaliste par IA, contre prénom + email + accord (`POST /api/vision/`).

- La photo est réduite à 1 536 px et réencodée dans le navigateur : métadonnées EXIF et position GPS supprimées.
- Rendu : modèle d'édition d'image avec masque (`VISION_MODEL`, par défaut `gpt-image-2`, clé `OPENAI_API_KEY`).
- La photo d'origine est **recollée hors de la zone tracée** : la maison reste strictement identique, seul le sol change.
- Mention « STRATE · Simulation visuelle non contractuelle » incrustée dans l'image.
- Aucune photo n'est stockée sur le serveur : le rendu est affiché, envoyé au prospect en pièce jointe, et l'équipe reçoit la photo et la simulation.
- Lead Brevo créé (canal `vision`) même si le rendu échoue : l'équipe est alors prévenue de le faire à la main.
- Limites : 4 rendus par IP et par heure, 3 par email et par jour.
- `VISION_PROVIDER=local` : texture de démonstration sans appel externe, pour le développement.

## Assistant conversationnel

Activé par `PUBLIC_CHAT_ENABLED=true` au build, avec `ANTHROPIC_API_KEY` au démarrage du serveur.

- Modèle `CHAT_MODEL` (par défaut `claude-opus-5-5`), effort `CHAT_EFFORT` (par défaut `low`, adapté à la conversation),
  repli automatique côté serveur en cas de refus (`fallbacks: "default"`).
- Consignes et base de connaissances dans `src/lib/chat/knowledge.ts`, construites à partir des données du site
  (usages, FAQ, méthode, règles de prix) : modifier le site met à jour l'assistant. Mises en cache (1 h) pour réduire le coût.
- Outils (`src/lib/chat/tools.ts`) : `verifier_zone`, `estimer_budget` (moteur tarifaire officiel : jamais de prix inventé),
  `enregistrer_demande` (uniquement après un accord explicite, crée le lead Brevo canal `assistant` avec la conversation).
- Réponse en flux (SSE) sur `POST /api/chat/`. Le serveur ne conserve rien : l'historique reste dans l'onglet du visiteur.
- Limites : 30 messages par IP et par heure, 4 appels d'outils par réponse, messages de 1 500 caractères au plus.

## Photos

Chaque visuel passe par `src/components/Visual.astro`. Sans photo, il affiche une texture minérale SVG
étiquetée « Visuel à produire ». Pour brancher une vraie photo :

```astro
---
import terrasse from '../assets/realisations/terrasse-douai-apres.jpg';
---
<Visual src={terrasse} alt="Terrasse en pierre beige naturel à Douai" priority />
```

Astro génère alors AVIF et WebP aux bonnes tailles. Le comparateur avant/après accepte `beforeSrc` et `afterSrc`.
Installer `sharp` (`npm i sharp`) au premier ajout de photo.

## Tracking

- Consent Mode v2 : tout est refusé par défaut. Google Tag Manager n'est chargé qu'après accord.
- GA4, Google Ads et Meta Pixel se configurent dans GTM, déclenchés sur les événements `dataLayer` :
  `phone_click`, `whatsapp_click`, `cta_click`, `form_start`, `generate_lead`, `consent_update`.
- Attribution (UTM, page d'entrée) jointe à chaque demande ; `gclid`, `gbraid`, `wbraid` et `fbclid` seulement avec l'accord publicitaire.

## Demandes d'étude et Brevo

`/api/lead/` valide la demande, recalcule l'estimation et les scores côté serveur, puis crée dans Brevo :
contact, deal, note, tâche de rappel, email de confirmation au prospect, email (et SMS) à l'équipe.
Mise en service, relances automatiques et segments : **[docs/brevo.md](docs/brevo.md)**.

Sans `BREVO_API_KEY`, l'API répond « service indisponible » en production (pour ne jamais perdre une demande en silence)
et se contente de journaliser la demande en développement.

## Moteur tarifaire

`src/config/pricing.ts` : prix de base, coefficients (support, état, espace), prix par marche, surface minimale.
Tant que `grilleValidee` vaut `false` ou qu'un coefficient vaut `null`, l'Estimateur affiche « étude personnalisée recommandée »
au lieu d'une fourchette. Le même fichier sert au navigateur et au serveur.

## Hébergement

Adaptateur Node (`@astrojs/node`, mode standalone) : tout hébergeur Node convient (Clever Cloud, Scalingo, VPS…).
`npm run build` puis `npm start` (variables `HOST` et `PORT`). Les variables Brevo sont lues au démarrage, pas au build.
Pour Netlify ou Vercel, remplacer l'adaptateur dans `astro.config.mjs`.

## Avant la mise en ligne

1. Renseigner `src/config/site.ts` (coordonnées, mentions légales, assurances).
2. Confirmer le domaine et `SITE_URL`.
3. Créer le conteneur GTM ; configurer Brevo (docs/brevo.md) et tester une demande réelle de bout en bout.
4. Mettre `PUBLIC_NOINDEX=false` le jour de l'ouverture.
5. Ajouter une image Open Graph (1200 × 630) et la passer via `ogImage`.
6. Faire relire les mentions légales et la politique de confidentialité.
