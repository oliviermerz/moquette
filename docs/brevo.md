# Brevo : mise en service

Ce que fait le site à chaque demande d'étude (`POST /api/lead/`) :

| Étape | Dans Brevo | Délai |
|---|---|---|
| 1 | Contact créé ou mis à jour (attributs projet, scores, source), ajouté à la liste « STRATE · Demandes du site », et à « Inspirations » seulement si le prospect a coché l'opt-in | immédiat |
| 2 | Deal « Terrasse 45 m² · 59500 · Camille Test » dans le pipeline, à l'étape « Nouveau », attribué au commercial | immédiat |
| 3 | Note sur le contact et le deal : réponses, estimation, complexité, priorité, points d'attention, message | immédiat |
| 4 | Tâche « Rappeler … » pour le commercial, échéance +2 h ouvrées (lun-ven 9 h-18 h), sinon jour ouvré suivant 10 h, rappel 15 min avant | immédiat |
| 5 | Email de confirmation au prospect (récapitulatif, estimation si disponible, prochaines étapes) | < 1 min |
| 6 | Email à l'équipe (+ SMS si configuré). S'il manque une étape Brevo, l'email le signale avec toutes les données | < 1 min |

Si Brevo refuse le numéro de téléphone (déjà associé à un autre contact), le contact est enregistré sans l'attribut `SMS` : le numéro reste dans `TELEPHONE_SAISI` et dans la note.
Si rien n'a pu être enregistré ni notifié, le visiteur voit un message d'erreur et peut réessayer ou appeler : aucune demande n'est perdue en silence.

## 1. Préparer le compte (15 minutes)

1. **Clé API** : Brevo > SMTP & API > Clés API > Générer. La mettre dans `.env` : `BREVO_API_KEY=…`
2. **Expéditeur** : Brevo > Expéditeurs, domaines et IP dédiées. Ajouter `contact@votre-domaine` et **authentifier le domaine** (SPF, DKIM, DMARC), sinon les emails risquent les spams.
3. **CRM** : vérifier que le pipeline des deals existe (Brevo > CRM > Deals). Renommer les étapes, par exemple :
   `Nouveau` → `Contacté` → `Visite planifiée` → `Devis envoyé` → `Signé` / `Perdu`
4. **Diagnostic** :
   ```bash
   npm run brevo:setup
   ```
   Le script ne modifie rien : il liste les attributs et listes manquants, les pipelines, les étapes, les types de tâche et les expéditeurs.
5. **Création** des attributs et listes manquants :
   ```bash
   npm run brevo:setup -- --apply
   ```
6. Reporter dans `.env` les valeurs affichées, puis compléter `TEAM_NOTIFY_EMAILS`, `BREVO_DEAL_OWNER` et, si souhaité, `TEAM_NOTIFY_SMS` (crédits SMS nécessaires).

## 2. Relances automatiques (à créer dans Brevo > Automations)

Le site alimente Brevo ; les relances se pilotent dans Brevo pour que l'équipe puisse les modifier sans développeur.

**Point d'entrée commun** : « Un contact est ajouté à une liste » → `STRATE · Demandes du site`.
**Condition de sortie** : l'attribut `STATUT_LEAD` vaut `contacte` (à créer, type texte). Le commercial le renseigne dès le premier échange, ou une règle CRM le fait quand le deal quitte l'étape « Nouveau ».

| Moment | Action | Canal |
|---|---|---|
| J+1, 10 h | Si `STATUT_LEAD` vide : « Nous avons essayé de vous joindre, quel créneau vous arrange ? » | SMS |
| J+3 | Réalisations proches (même `TYPE_PROJET`) | Email |
| J+7 | Invitation à visualiser son extérieur (STRATE Vision, phase 4) | Email |
| J+21 | Dernier message, puis sortie du scénario | Email |

Utiliser les attributs dans les modèles : `{{ contact.PRENOM }}`, `{{ contact.TYPE_PROJET }}`, `{{ contact.CODE_POSTAL }}`.
Les emails de relance sont de la prospection : ils doivent proposer un lien de désinscription (automatique dans Brevo).

## 3. Segments utiles

- **Priorité A non contactés** : `SCORE_PRIORITE = A` et `STATUT_LEAD` vide.
- **Hors zone** : `ZONE_COUVERTE = false`, par `CODE_POSTAL`, pour mesurer la demande des futures régions.
- **Par source** : `SOURCE` = `meta`, `google`… pour comparer le coût par chantier signé.

## 4. Attributs créés par le script

| Attribut | Type | Contenu |
|---|---|---|
| `PRENOM`, `NOM` | texte | (ou `FIRSTNAME`/`LASTNAME` selon la langue du compte, détecté par le script) |
| `SMS` | natif | Téléphone au format +33… |
| `TELEPHONE_SAISI` | texte | Téléphone tel que saisi |
| `TYPE_PROJET` | texte | terrasse, piscine, allee, entree, escalier, autre |
| `SURFACE_M2`, `NB_MARCHES` | nombre | |
| `SUPPORT`, `ETAT_SUPPORT`, `FINITION` | texte | |
| `CODE_POSTAL`, `ZONE_COUVERTE` | texte, booléen | |
| `DELAI_PROJET` | texte | asap, 1-3, 3-6, plus-tard, renseigne |
| `SCORE_COMPLEXITE`, `SCORE_PRIORITE` | texte | A, B, C |
| `ESTIMATION_MIN`, `ESTIMATION_MAX` | nombre | Vides tant que la grille tarifaire n'est pas validée |
| `SOURCE`, `CAMPAGNE`, `PAGE_ENTREE` | texte | Issus des UTM |
| `OPTIN_MARKETING` | booléen | |
| `DATE_DEMANDE` | date | |
