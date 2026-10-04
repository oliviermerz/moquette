---
# ───────────────────────────────────────────────────────────────────────────
# MODÈLE D'ÉTUDE DE CAS. Ce fichier est ignoré (son nom commence par « _ »).
#
# Pour publier un chantier :
# 1. Créer un dossier src/content/realisations/<ville>-<usage>-<aaaa-mm>/
#    ex. src/content/realisations/douai-terrasse-2026-11/
# 2. Y déposer les photos (JPG ou PNG, 2000 px de large minimum) :
#      avant.jpg     apres.jpg     (même point de vue, même focale, même heure)
#      etape-1.jpg   etape-2.jpg   detail.jpg   …
# 3. Copier ce fichier dans le dossier sous le nom index.md et le remplir.
# 4. `npm run build` vérifie tout : un champ manquant bloque la publication.
#
# Rien d'inventé : surface mesurée, durée réelle, mots du client.
# ───────────────────────────────────────────────────────────────────────────
title: Transformation d'une terrasse à Douai
usage: terrasse                 # terrasse | piscine | allee | entree | escalier | autre
ville: Douai
codePostal: "59500"
zone: douai                     # page ville alimentée (nom du fichier dans src/content/villes/)
date: 2026-11-15                # date de réception
surface: 48                     # m² mesurés (ou « marches: 8 » pour un escalier)
support: carrelage              # beton | carrelage | dallage | ancien | gravier | terre
etatInitial: Carrelage des années 80, joints noircis, quelques carreaux creux
finition: Beige naturel         # nom du coloris présenté au client
dureeJours: 3                   # durée réelle sur place
probleme: >-
  Ce que le client voulait changer, avec ses mots si possible. Ce qui n'allait pas : aspect, entretien, sécurité…
solution: >-
  Ce que nous avons proposé et pourquoi : préparation, choix du granulat, finitions, bordures.
etapes:
  - titre: Diagnostic
    texte: Sonnage carreau par carreau, 6 carreaux creux identifiés et repris.
    photo: ./etape-1.jpg
    alt: Carreaux creux repérés à la craie avant reprise
  - titre: Préparation
    texte: Nettoyage, reprise des carreaux, primaire d'accroche.
  - titre: Pose
    texte: Mélange et pose des granulats, finitions le long de la baie vitrée.
avant: ./avant.jpg
avantAlt: Terrasse carrelée d'origine aux joints noircis, vue depuis le jardin
apres: ./apres.jpg
apresAlt: La même terrasse en pierre naturelle beige, vue depuis le jardin
photos:
  - src: ./detail.jpg
    alt: Détail des granulats beige naturel au bord de la baie vitrée
temoignage:                     # uniquement avec l'autorisation écrite du client
  texte: "Les mots exacts du client."
  prenom: Prénom
  autorisation: true
avisGoogleUrl: https://g.page/…  # lien vers son avis Google s'il en a laissé un
featured: false                 # true : mise en avant sur l'accueil
draft: false                    # true : enregistré mais non publié
---

Texte libre facultatif : le récit du chantier, une anecdote, un conseil d'entretien donné au client.
