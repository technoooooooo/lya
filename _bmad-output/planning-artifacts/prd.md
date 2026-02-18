---
stepsCompleted: ['step-01-init', 'step-02-discovery', 'step-02b-vision', 'step-02c-executive-summary', 'step-03-success', 'step-04-journeys', 'step-05-domain', 'step-06-innovation', 'step-07-project-type', 'step-08-scoping', 'step-09-functional', 'step-10-nonfunctional', 'step-11-polish', 'step-12-complete']
inputDocuments: []
workflowType: 'prd'
documentCounts:
  briefs: 0
  research: 0
  brainstorming: 0
  projectDocs: 0
classification:
  projectType: web_app
  domain: edtech
  complexity: medium
  projectContext: greenfield
---

# Product Requirements Document - Lya

**Author:** Antoineoriol
**Date:** 2026-02-18

## Executive Summary

Lya est un assistant IA dédié au coaching golf, conçu comme le prolongement numérique de l'accompagnement pédagogique de Mathieu. L'application permet à ses élèves d'interagir au quotidien avec une IA qui répond exclusivement dans le cadre de sa méthode, structurée autour de ses 5 piliers. Les utilisateurs cibles sont les élèves de formation de Mathieu (accès via code promo) ainsi que des golfeurs externes (accès par abonnement payant). Le problème adressé : entre les sessions de coaching, les élèves n'ont pas d'accompagnement personnalisé et se tournent vers des sources génériques (YouTube, ChatGPT) qui contredisent ou diluent la méthode enseignée.

### Ce qui rend Lya unique

La différenciation fondamentale de Lya réside dans son cadre fermé : l'IA ne puise pas sur Internet mais uniquement dans la base de contenus de Mathieu (livre, bilans, méthode). Elle refuse ou redirige toute question hors périmètre. Ce n'est pas un chatbot golf généraliste — c'est l'incarnation numérique d'une pédagogie spécifique. La valeur perçue se joue dans la fidélité de la réponse à ce que Mathieu dirait réellement, rendue possible par un travail de prompt et context engineering avancé sur sa base de connaissances propriétaire.

## Project Classification

- **Type de projet :** Web App (PWA) — Application web responsive installable sur mobile, interface de chat avec backend IA et panel d'administration
- **Domaine :** EdTech / Coaching sportif — Pédagogie golf assistée par IA avec contrôle strict des sources
- **Complexité :** Moyenne — Enjeux techniques significatifs (prompt engineering, transcription vocale spécialisée, contrôle du périmètre IA) sans contraintes réglementaires lourdes
- **Contexte :** Greenfield — Création complète depuis zéro
- **Stack :** Supabase (backend/auth/DB), API IA (OpenAI ou Gemini), Whisper (vocal), Stripe (paiement), Frontend PWA sur Vercel (Node.js)

## Success Criteria

### Succès utilisateur

- L'élève obtient une réponse fidèle à la méthode de Mathieu, perçue comme cohérente avec son coaching en présentiel
- L'interaction est fluide et immédiate : temps de réponse comparable à ChatGPT (< 3s pour le premier token)
- La navigation par les 5 piliers guide naturellement l'élève sans qu'il ait besoin de savoir quoi demander
- La dictée vocale comprend le vocabulaire golf (grip, stance, swing path, lie, fade, draw...) avec un taux de transcription fiable
- L'historique des conversations est retrouvable et organisé par fil

### Succès business

- Les élèves de formation de Mathieu activent leur accès via code promo et utilisent l'outil régulièrement
- Des golfeurs externes souscrivent un abonnement payant via Stripe
- L'outil crée une vraie différence perçue avec ChatGPT qui justifie l'abonnement
- Mathieu gère ses contenus IA et ses utilisateurs en autonomie via le panel admin

### Succès technique

- **Précision IA :** Les réponses sont exclusivement basées sur la base de connaissances de Mathieu — aucune hallucination hors périmètre
- **Performance :** Temps de réponse chat < 3s (first token), transcription vocale < 5s
- **Sécurité :** Authentification sécurisée (Supabase Auth), protection des données utilisateurs, contrôle des inputs/outputs IA (injection de prompt, contournement des garde-fous)
- **Infrastructure :** Déploiement sur Vercel (Node.js), Supabase (PostgreSQL + Auth + Storage), scalable
- **Disponibilité :** Uptime standard Vercel/Supabase, pas de contrainte SLA spécifique au MVP

### Résultats mesurables

- 100% des réponses IA restent dans le périmètre de la méthode de Mathieu (garde-fous fonctionnels)
- Temps de réponse moyen < 3s (first token streaming)
- Transcription vocale : taux de reconnaissance acceptable sur le vocabulaire golf courant
- Zéro accès non autorisé aux données utilisateurs ou au panel admin

## Product Scope

### MVP (Phase 1)

**Outil élève :**
- Inscription/connexion (email + mot de passe + code promo)
- Chat IA textuel avec mémoire par conversation
- 5 piliers affichés avec pré-prompts dédiés + mode global
- Dictée vocale (Whisper)
- Historique des conversations par fil
- PWA installable (+ tutoriel vidéo)
- Compte utilisateur basique (mot de passe, statut abonnement)

**Outil admin :**
- Édition du prompt principal
- Gestion des contenus/documents de la base IA
- Définition des garde-fous (sujets interdits, redirections)
- Gestion des utilisateurs (liste, activation/désactivation)
- Données business basiques (nb actifs, dates inscription)

**Paiement :**
- Stripe géré via page de vente externe, récupération des statuts côté app

### Growth (Phase 2)

- Profil utilisateur global avec mémoire cross-conversations (contexte élève persistant)
- Analytics avancés côté admin (engagement, questions fréquentes, sujets populaires)
- Gestion automatisée des résiliations / renouvellements
- Workflows d'alerte admin (comportements anormaux, questions hors périmètre récurrentes)
- Amélioration continue du prompt basée sur les retours d'usage

### Vision (Phase 3)

- Parcours pédagogiques personnalisés basés sur le niveau et la progression de l'élève
- Intégration de contenus multimédia (vidéos de Mathieu, schémas techniques)
- Suivi de progression avec objectifs et métriques golf
- Ouverture à d'autres coachs / méthodes sur la même plateforme

## User Journeys

### Journey 1 : Lucas, élève de formation — Premier contact

**Situation :** Lucas, 35 ans, suit la formation de Mathieu depuis 2 mois. Il reçoit un email avec son code promo et un lien vers Lya.

**Opening :** Lucas clique sur le lien, arrive sur la page de vente. Il choisit "S'inscrire", entre son email, mot de passe et code promo. Compte créé, accès gratuit activé.

**Rising Action :** Il arrive sur l'écran d'accueil et voit les 5 piliers de la méthode affichés. Il reconnaît la structure de ce qu'il apprend en cours. Il clique sur le pilier "Swing" et un chat s'ouvre avec un pré-prompt dédié.

**Climax :** Lucas tape : "J'ai du mal avec mon backswing, il est trop court." L'IA répond exactement comme Mathieu le ferait en cours — en rappelant les principes du pilier, en posant des questions de diagnostic, en proposant un exercice concret issu du livre de Mathieu. Lucas a l'impression de prolonger son cours.

**Resolution :** Lucas revient chaque jour entre les cours pour poser des questions. Il retrouve ses conversations passées, ce qui renforce son apprentissage. Lya devient son compagnon de progression quotidien.

### Journey 2 : Sophie, golfeure externe — Découverte par abonnement

**Situation :** Sophie, 42 ans, golfeuse amateur qui stagne sur son handicap. Elle découvre Lya via une publicité Instagram de Mathieu.

**Opening :** Sophie arrive sur la page de vente, lit la proposition de valeur. Elle souscrit l'abonnement mensuel via Stripe. Inscription email + mot de passe. Accès immédiat.

**Rising Action :** Elle arrive sur l'écran d'accueil, découvre les 5 piliers. Ne connaissant pas la méthode, elle commence en mode global et tape : "Comment améliorer ma régularité au drive ?"

**Climax :** L'IA identifie que la question touche à plusieurs piliers et répond dans le cadre global de la méthode, en structurant sa réponse autour des fondamentaux. Sophie découvre une approche cohérente et différente de ce qu'elle trouve sur YouTube.

**Resolution :** Sophie explore les piliers un par un au fil des jours. Elle perçoit la valeur d'une méthode structurée vs des conseils épars. Elle renouvelle son abonnement.

### Journey 3 : Sophie essaie le vocal

**Situation :** Sophie est au practice et veut une réponse rapide.

**Opening :** Elle ouvre Lya sur son téléphone (PWA installée), appuie sur le bouton micro.

**Rising Action :** Elle dit : "Mon grip me semble pas bon, la balle part à droite." Whisper transcrit correctement malgré le bruit ambiant et le vocabulaire golf.

**Climax :** L'IA comprend le contexte (grip + trajectoire) et répond avec les recommandations de Mathieu sur la position des mains, en langage clair et applicable immédiatement.

**Resolution :** Sophie ajuste son grip entre deux balles. La boucle conseil → action est immédiate. Le vocal rend l'outil utilisable au practice, là où l'élève en a le plus besoin.

### Journey 4 : Mathieu, administrateur — Gestion quotidienne

**Situation :** Mathieu veut mettre à jour le contenu de l'IA après avoir rédigé un nouveau chapitre de méthode et vérifier l'activité de ses élèves.

**Opening :** Mathieu se connecte au panel admin avec ses identifiants admin.

**Rising Action :** Il accède à la gestion de l'IA, charge le nouveau document dans la base de connaissances. Il ajuste le prompt principal pour intégrer un nouveau concept pédagogique. Il définit un sujet interdit (un exercice qu'il ne recommande plus).

**Climax :** Mathieu vérifie la liste des utilisateurs : il voit les élèves actifs, désactive un ancien élève qui a quitté la formation. Il consulte les données business : nombre d'actifs, nouvelles inscriptions du mois.

**Resolution :** En 15 minutes, Mathieu a mis à jour son IA, géré ses utilisateurs et consulté ses métriques. Il est autonome, sans besoin de support technique.

### Journey 5 : Élève hors périmètre — Garde-fous en action

**Situation :** Un élève demande à l'IA des conseils sur la nutrition sportive.

**Opening :** L'élève tape : "Qu'est-ce que je dois manger avant un tournoi ?"

**Rising Action :** L'IA détecte que la question est hors périmètre de la méthode de Mathieu.

**Climax :** L'IA refuse poliment de répondre et redirige : "Cette question sort du cadre de la méthode de Mathieu. Je suis spécialisé dans les 5 piliers du golf. Posez-moi une question sur votre swing, votre putting, votre mental, votre routine ou votre stratégie de jeu !"

**Resolution :** L'élève comprend le périmètre de l'outil. Les garde-fous fonctionnent, l'IA reste fidèle à sa mission. Note : l'admin peut configurer des exceptions contrôlées (ex: nutrition dans le cadre défini par Mathieu).

### Synthèse des capabilities révélées par les journeys

| Journey | Capabilities révélées |
|---|---|
| Lucas (inscription code promo) | Auth avec code promo, onboarding, chat par pilier, pré-prompts, historique |
| Sophie (abonnement) | Paiement Stripe, mode global, identification de sujet par l'IA |
| Sophie (vocal) | Dictée vocale, transcription vocabulaire golf, PWA mobile |
| Mathieu (admin) | CRUD documents IA, édition prompt, gestion utilisateurs, métriques |
| Garde-fous | Détection hors périmètre, réponse de refus/redirection, exceptions admin |

## Web App (PWA) — Exigences spécifiques

### Vue d'ensemble

Lya est une Web App responsive déployée en PWA installable sur mobile. L'interface principale est un chat IA avec navigation par les 5 piliers. Un panel d'administration séparé permet la gestion du contenu IA et des utilisateurs.

### Direction UX/UI

L'interface utilisateur doit s'inspirer directement de ChatGPT : c'est le standard que les utilisateurs connaissent et attendent. Layout avec sidebar de conversations à gauche, zone de chat centrale, champ de saisie en bas. La différenciation visuelle se fait par le branding Lya et l'ajout des 5 piliers comme point d'entrée (boutons/cards sur l'écran d'accueil ou en haut du chat). Pas de réinvention de l'UX du chat — on capitalise sur les conventions existantes pour réduire la friction d'adoption.

### Architecture technique

- **Frontend :** Application web responsive, framework JS moderne (Next.js / React), déployée sur Vercel
- **Backend :** Node.js (API routes Vercel ou edge functions), Supabase comme BaaS (auth, database, storage)
- **IA :** API OpenAI ou Gemini (à déterminer par tests comparatifs), streaming des réponses pour UX temps réel
- **Transcription vocale :** Whisper API (OpenAI) ou équivalent haute qualité
- **Paiement :** Stripe (souscription gérée via page de vente externe type systeme.io, statut récupéré côté app via webhook)
- **PWA :** Service worker pour installabilité, manifest.json, pas de mode offline requis au MVP

### Compatibilité navigateur

- Chrome, Safari, Firefox, Edge — versions récentes
- Safari iOS et Chrome Android — priorité mobile
- PWA installable sur iOS (Safari) et Android (Chrome)

### Considérations SEO

- Non applicable : l'application est derrière authentification. La page de vente est externe (systeme.io ou équivalent).

### Performance

- First Contentful Paint < 2s
- Streaming des réponses IA (first token < 3s)
- Navigation entre piliers instantanée (SPA)

### Accessibilité

- Niveau basique : contraste suffisant, taille de police lisible, navigation clavier fonctionnelle
- Pas d'exigence WCAG formelle au MVP

## Project Scoping & Phased Development

### Stratégie MVP

**Approche :** MVP centré sur la valeur pédagogique. L'objectif est de délivrer une expérience de chat IA fidèle à la méthode de Mathieu, avec un cadre technique solide et évolutif.

**Principe directeur :** Tout ce qui ne contribue pas directement à la qualité de l'échange IA ou à l'autonomie admin est reporté.

### MVP Feature Set (Phase 1)

**Journeys supportés :** Lucas (inscription code), Sophie (abonnement + vocal), Mathieu (admin), Garde-fous

**Capabilities essentielles :**
- Authentification email/mot de passe avec gestion de codes promo
- Chat IA textuel avec streaming des réponses
- 5 piliers avec pré-prompts dédiés + mode global
- Dictée vocale avec transcription Whisper
- Historique des conversations par fil
- PWA installable avec tutoriel vidéo
- Panel admin : prompt, contenus, garde-fous, utilisateurs, métriques basiques
- Intégration Stripe (statut abonnement via webhook)
- Garde-fous IA : détection hors périmètre, refus/redirection

### Post-MVP (Phase 2)

- Mémoire utilisateur cross-conversations (profil élève persistant)
- Analytics admin avancés (engagement, questions fréquentes)
- Gestion automatisée abonnements (résiliation, renouvellement)
- Alertes admin (patterns anormaux)
- Itérations prompt basées sur l'usage réel

### Expansion (Phase 3)

- Parcours pédagogiques personnalisés
- Contenus multimédia (vidéos, schémas)
- Suivi de progression et objectifs
- Multi-coachs / multi-méthodes

### Risques et mitigations

**Risques techniques :**
- *Qualité des réponses IA :* Tests comparatifs OpenAI vs Gemini, itérations prompt intensives avant launch, base de connaissances structurée
- *Transcription vocabulaire golf :* Tests Whisper sur vocabulaire spécifique, fallback clavier toujours disponible
- *Contournement des garde-fous :* Couche de validation des inputs/outputs, tests adversariaux, monitoring

**Risques marché :**
- *Valeur perçue vs ChatGPT gratuit :* La différenciation repose sur la fidélité à la méthode, pas sur la technologie. Le prompt engineering est le levier clé.

**Risques ressources :**
- *Dépendance Mathieu pour le contenu :* L'admin doit être suffisamment simple pour que Mathieu gère seul ses contenus sans support technique.

## Functional Requirements

### Authentification & Gestion de compte

- FR1 : L'utilisateur peut s'inscrire avec email et mot de passe
- FR2 : L'utilisateur peut appliquer un code promo lors de l'inscription pour obtenir un accès gratuit
- FR3 : L'utilisateur peut se connecter avec email et mot de passe
- FR4 : L'utilisateur peut modifier son mot de passe
- FR5 : L'utilisateur peut consulter son statut d'abonnement (actif/inactif, type)
- FR6 : L'utilisateur peut se déconnecter

### Chat IA

- FR7 : L'utilisateur peut envoyer un message textuel à l'IA et recevoir une réponse en streaming
- FR8 : L'utilisateur peut démarrer une nouvelle conversation
- FR9 : L'utilisateur peut consulter l'historique de ses conversations passées
- FR10 : L'utilisateur peut reprendre une conversation existante
- FR11 : L'IA maintient le contexte au sein d'une même conversation
- FR12 : L'IA répond exclusivement dans le cadre de la méthode et des contenus de Mathieu
- FR13 : L'IA refuse ou redirige les questions hors périmètre avec un message explicatif
- FR14 : L'IA identifie le sujet d'une question en mode global et répond dans le cadre approprié de la méthode

### Navigation par les 5 piliers

- FR15 : L'utilisateur peut voir les 5 piliers affichés sur l'écran d'accueil
- FR16 : L'utilisateur peut sélectionner un pilier pour ouvrir un nouveau chat avec un pré-prompt dédié à ce pilier
- FR17 : L'utilisateur peut utiliser le mode global (chat sans sélection de pilier)

### Dictée vocale

- FR18 : L'utilisateur peut activer la dictée vocale via un bouton micro
- FR19 : La dictée vocale transcrit la parole en texte avec reconnaissance du vocabulaire golf
- FR20 : Le texte transcrit est envoyé comme message dans le chat

### PWA & Mobile

- FR21 : L'application est installable sur mobile via PWA (iOS Safari, Android Chrome)
- FR22 : L'application affiche un tutoriel vidéo pour l'installation sur mobile
- FR23 : L'application est responsive et utilisable sur desktop, tablette et mobile

### Paiement & Abonnement

- FR24 : Le système récupère le statut d'abonnement Stripe via webhook
- FR25 : Le système accorde ou restreint l'accès en fonction du statut d'abonnement
- FR26 : Le système active l'accès gratuit pour les codes promo valides

### Administration — Gestion de l'IA

- FR27 : L'admin peut éditer le prompt principal de l'IA
- FR28 : L'admin peut ajouter, modifier et supprimer des documents dans la base de connaissances de l'IA
- FR29 : L'admin peut définir des sujets interdits et des règles de redirection
- FR30 : L'admin peut configurer des exceptions contrôlées (sujets autorisés en dehors du périmètre strict)
- FR31 : L'IA utilise exclusivement la base de connaissances fournie (pas d'accès Internet par défaut)

### Administration — Gestion des utilisateurs

- FR32 : L'admin peut consulter la liste des utilisateurs avec statut (actif/inactif) et date d'inscription
- FR33 : L'admin peut activer ou désactiver manuellement un utilisateur
- FR34 : L'admin peut consulter le nombre d'utilisateurs actifs
- FR35 : L'admin peut consulter l'historique de présence des utilisateurs

### Sécurité

- FR36 : Le système protège contre les injections de prompt (validation des inputs utilisateur)
- FR37 : Le système empêche le contournement des garde-fous IA
- FR38 : L'accès au panel admin est restreint aux comptes ayant le rôle administrateur

## Non-Functional Requirements

### Performance

- NFR1 : Le premier token de la réponse IA est affiché en moins de 3 secondes dans 95% des cas
- NFR2 : La transcription vocale retourne un résultat en moins de 5 secondes pour un message de 30 secondes
- NFR3 : La navigation entre les pages s'effectue en moins de 500ms (SPA)
- NFR4 : Le First Contentful Paint est inférieur à 2 secondes sur connexion 4G

### Sécurité

- NFR5 : Toutes les communications client-serveur sont chiffrées via HTTPS/TLS
- NFR6 : Les mots de passe sont hashés avec un algorithme sécurisé (bcrypt ou équivalent via Supabase Auth)
- NFR7 : Les tokens d'authentification expirent après une durée configurable
- NFR8 : Les inputs utilisateur sont validés et assainis avant envoi à l'API IA
- NFR9 : Les webhooks Stripe sont vérifiés via signature cryptographique
- NFR10 : L'accès aux routes admin est protégé par vérification de rôle côté serveur

### Scalabilité

- NFR11 : L'architecture supporte une montée à 1000 utilisateurs actifs sans dégradation de performance
- NFR12 : La base de connaissances IA supporte l'ajout de documents sans refonte architecturale
- NFR13 : Le système supporte l'ajout de nouveaux piliers ou la modification des piliers existants sans changement de code

### Intégration

- NFR14 : L'intégration Stripe gère les événements de création, renouvellement et annulation d'abonnement
- NFR15 : L'API IA (OpenAI/Gemini) est encapsulée derrière une abstraction permettant le changement de fournisseur
- NFR16 : La transcription vocale est encapsulée derrière une abstraction permettant le changement de service
