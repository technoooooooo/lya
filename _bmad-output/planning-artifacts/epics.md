---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: ['prd.md', 'architecture.md']
status: 'complete'
completedAt: '2026-02-18'
---

# Lya - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Lya, decomposing the requirements from the PRD and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

- FR1 : L'utilisateur peut s'inscrire avec email et mot de passe
- FR2 : L'utilisateur peut appliquer un code promo lors de l'inscription pour obtenir un accès gratuit
- FR3 : L'utilisateur peut se connecter avec email et mot de passe
- FR4 : L'utilisateur peut modifier son mot de passe
- FR5 : L'utilisateur peut consulter son statut d'abonnement (actif/inactif, type)
- FR6 : L'utilisateur peut se déconnecter
- FR7 : L'utilisateur peut envoyer un message textuel à l'IA et recevoir une réponse en streaming
- FR8 : L'utilisateur peut démarrer une nouvelle conversation
- FR9 : L'utilisateur peut consulter l'historique de ses conversations passées
- FR10 : L'utilisateur peut reprendre une conversation existante
- FR11 : L'IA maintient le contexte au sein d'une même conversation
- FR12 : L'IA répond exclusivement dans le cadre de la méthode et des contenus de Mathieu
- FR13 : L'IA refuse ou redirige les questions hors périmètre avec un message explicatif
- FR14 : L'IA identifie le sujet d'une question en mode global et répond dans le cadre approprié de la méthode
- FR15 : L'utilisateur peut voir les 5 piliers affichés sur l'écran d'accueil
- FR16 : L'utilisateur peut sélectionner un pilier pour ouvrir un nouveau chat avec un pré-prompt dédié à ce pilier
- FR17 : L'utilisateur peut utiliser le mode global (chat sans sélection de pilier)
- FR18 : L'utilisateur peut activer la dictée vocale via un bouton micro
- FR19 : La dictée vocale transcrit la parole en texte avec reconnaissance du vocabulaire golf
- FR20 : Le texte transcrit est envoyé comme message dans le chat
- FR21 : L'application est installable sur mobile via PWA (iOS Safari, Android Chrome)
- FR22 : L'application affiche un tutoriel vidéo pour l'installation sur mobile
- FR23 : L'application est responsive et utilisable sur desktop, tablette et mobile
- FR24 : Le système récupère le statut d'abonnement Stripe via webhook
- FR25 : Le système accorde ou restreint l'accès en fonction du statut d'abonnement
- FR26 : Le système active l'accès gratuit pour les codes promo valides
- FR27 : L'admin peut éditer le prompt principal de l'IA
- FR28 : L'admin peut ajouter, modifier et supprimer des documents dans la base de connaissances de l'IA
- FR29 : L'admin peut définir des sujets interdits et des règles de redirection
- FR30 : L'admin peut configurer des exceptions contrôlées (sujets autorisés en dehors du périmètre strict)
- FR31 : L'IA utilise exclusivement la base de connaissances fournie (pas d'accès Internet par défaut)
- FR32 : L'admin peut consulter la liste des utilisateurs avec statut (actif/inactif) et date d'inscription
- FR33 : L'admin peut activer ou désactiver manuellement un utilisateur
- FR34 : L'admin peut consulter le nombre d'utilisateurs actifs
- FR35 : L'admin peut consulter l'historique de présence des utilisateurs
- FR36 : Le système protège contre les injections de prompt (validation des inputs utilisateur)
- FR37 : Le système empêche le contournement des garde-fous IA
- FR38 : L'accès au panel admin est restreint aux comptes ayant le rôle administrateur

### NonFunctional Requirements

- NFR1-4 : Performance (streaming < 3s, transcription < 5s, navigation < 500ms, FCP < 2s)
- NFR5-10 : Sécurité (HTTPS, bcrypt, tokens, sanitization, signature Stripe, vérification rôle)
- NFR11-13 : Scalabilité (1000 users, ajout documents, piliers sans code change)
- NFR14-16 : Intégration (événements Stripe, abstraction IA, abstraction vocale)

### Additional Requirements

- Starter template : `npx create-next-app -e with-supabase lya`
- Supabase CLI pour migrations SQL versionnées
- RLS sur toutes les tables
- Middleware Next.js pour RBAC et statut abonnement
- Interface `AIProvider` (OpenAI/Gemini swap via env var)
- Interface `TranscriptionProvider` (Whisper swap via env var)
- Réponses API standardisées `{ success, data, error }`
- Validation Zod côté serveur
- SSE via ReadableStream pour streaming IA
- PWA : service worker + manifest.json
- UX ChatGPT-like

### FR Coverage Map

| FR | Epic | Story |
|---|---|---|
| FR1 | Epic 1 | Story 1.2 |
| FR2 | Epic 1 | Story 1.3 |
| FR3 | Epic 1 | Story 1.2 |
| FR4 | Epic 1 | Story 1.4 |
| FR5 | Epic 1 | Story 1.4 |
| FR6 | Epic 1 | Story 1.2 |
| FR7 | Epic 2 | Story 2.1, 2.2 |
| FR8 | Epic 2 | Story 2.1 |
| FR9 | Epic 2 | Story 2.3 |
| FR10 | Epic 2 | Story 2.3 |
| FR11 | Epic 2 | Story 2.2 |
| FR12 | Epic 2 | Story 2.2 |
| FR13 | Epic 2 | Story 2.4 |
| FR14 | Epic 2 | Story 2.2 |
| FR15 | Epic 3 | Story 3.1 |
| FR16 | Epic 3 | Story 3.2 |
| FR17 | Epic 3 | Story 3.1 |
| FR18 | Epic 4 | Story 4.1 |
| FR19 | Epic 4 | Story 4.1 |
| FR20 | Epic 4 | Story 4.1 |
| FR21 | Epic 8 | Story 8.1 |
| FR22 | Epic 8 | Story 8.2 |
| FR23 | Epic 8 | Story 8.1 |
| FR24 | Epic 7 | Story 7.1 |
| FR25 | Epic 7 | Story 7.2 |
| FR26 | Epic 7 | Story 7.1 |
| FR27 | Epic 5 | Story 5.1 |
| FR28 | Epic 5 | Story 5.2 |
| FR29 | Epic 5 | Story 5.3 |
| FR30 | Epic 5 | Story 5.3 |
| FR31 | Epic 2 | Story 2.2 |
| FR32 | Epic 6 | Story 6.1 |
| FR33 | Epic 6 | Story 6.1 |
| FR34 | Epic 6 | Story 6.2 |
| FR35 | Epic 6 | Story 6.2 |
| FR36 | Epic 2 | Story 2.4 |
| FR37 | Epic 2 | Story 2.4 |
| FR38 | Epic 1 | Story 1.2 |

## Epic List

### Epic 1: Fondation & Authentification
L'utilisateur peut s'inscrire, se connecter et accéder à l'application. L'admin a un accès séparé. Le projet est initialisé avec la stack technique et le schéma de données.
**FRs couverts :** FR1, FR2, FR3, FR4, FR5, FR6, FR38

### Epic 2: Chat IA — Conversation avec la méthode de Mathieu
L'utilisateur peut poser des questions à l'IA et recevoir des réponses en streaming, fidèles à la méthode de Mathieu. Les conversations sont sauvegardées et reprises. Les garde-fous empêchent toute sortie du périmètre.
**FRs couverts :** FR7, FR8, FR9, FR10, FR11, FR12, FR13, FR14, FR31, FR36, FR37

### Epic 3: Les 5 Piliers — Navigation guidée par la méthode
L'utilisateur accède aux 5 piliers de la méthode depuis l'écran d'accueil. Chaque pilier lance un chat dédié avec un pré-prompt spécifique.
**FRs couverts :** FR15, FR16, FR17

### Epic 4: Dictée vocale — Parler au coach
L'utilisateur peut dicter ses questions au micro. La transcription comprend le vocabulaire golf.
**FRs couverts :** FR18, FR19, FR20

### Epic 5: Administration — Gestion de l'IA et des contenus
L'admin peut éditer le prompt, gérer la base de connaissances, configurer les garde-fous et les exceptions.
**FRs couverts :** FR27, FR28, FR29, FR30

### Epic 6: Administration — Gestion des utilisateurs et métriques
L'admin peut consulter et gérer les utilisateurs, et voir les données business basiques.
**FRs couverts :** FR32, FR33, FR34, FR35

### Epic 7: Paiement Stripe — Abonnement et accès
Le système gère les statuts d'abonnement via webhook Stripe et accorde/restreint l'accès.
**FRs couverts :** FR24, FR25, FR26

### Epic 8: PWA & Mobile — Installation et expérience mobile
L'application est installable comme une PWA sur iOS et Android avec tutoriel vidéo.
**FRs couverts :** FR21, FR22, FR23

---

## Epic 1: Fondation & Authentification

L'utilisateur peut s'inscrire, se connecter et gérer son compte. Le projet est initialisé avec la stack technique, le schéma de données et le middleware RBAC.

### Story 1.1: Initialisation du projet depuis le starter template

As a developer,
I want to initialize the project from the official Supabase + Next.js starter template,
So that I have a working development environment with auth, TypeScript, Tailwind and shadcn/ui configured.

**Acceptance Criteria:**

**Given** le projet n'existe pas encore
**When** j'exécute `npx create-next-app -e with-supabase lya`
**Then** le projet est créé avec Next.js 16, TypeScript, Tailwind CSS, shadcn/ui et Supabase Auth SSR
**And** le fichier `.env.example` contient les variables Supabase nécessaires
**And** l'application se lance en local avec `npm run dev`
**And** le repo Git est initialisé avec un `.gitignore` correct

### Story 1.2: Inscription, connexion et déconnexion

As a user,
I want to register with email and password, log in, and log out,
So that I can access the application securely.

**Acceptance Criteria:**

**Given** je suis sur la page d'inscription
**When** je remplis email, mot de passe et soumets le formulaire
**Then** un compte est créé dans Supabase Auth et une entrée dans la table `profiles` (avec `role: 'user'`, `is_active: true`)
**And** je suis redirigé vers l'accueil de l'app

**Given** je suis sur la page de connexion
**When** je saisis un email et mot de passe valides
**Then** je suis authentifié via Supabase Auth (cookie SSR) et redirigé vers l'accueil
**And** si mes identifiants sont incorrects, un message d'erreur est affiché

**Given** je suis connecté
**When** je clique sur "Déconnexion"
**Then** ma session est détruite et je suis redirigé vers la page de connexion

**Given** un utilisateur a le rôle `admin` dans `profiles`
**When** il se connecte
**Then** il a accès aux routes `/admin/*`

**Given** un utilisateur a le rôle `user` dans `profiles`
**When** il tente d'accéder à `/admin/*`
**Then** il est redirigé vers l'accueil

**DB créée dans cette story :** Table `profiles` (id, user_id, role, is_active, subscription_status, created_at, updated_at) + RLS policies + middleware Next.js RBAC

### Story 1.3: Inscription avec code promo

As a student of Mathieu,
I want to apply a promo code during registration to get free access,
So that I don't need to pay for a subscription.

**Acceptance Criteria:**

**Given** je suis sur la page d'inscription
**When** je saisis un code promo valide dans le champ dédié
**Then** mon compte est créé avec `subscription_status: 'active'` et `subscription_type: 'promo'`
**And** je n'ai pas besoin de payer

**Given** je saisis un code promo invalide ou expiré
**When** je soumets le formulaire
**Then** un message d'erreur indique que le code n'est pas valide
**And** l'inscription est bloquée sans paiement

**DB créée dans cette story :** Table `promo_codes` (id, code, is_active, max_uses, current_uses, expires_at) + RLS policies

### Story 1.4: Gestion du compte utilisateur

As a user,
I want to change my password and view my subscription status,
So that I can manage my account.

**Acceptance Criteria:**

**Given** je suis connecté et sur la page `/account`
**When** je modifie mon mot de passe
**Then** le mot de passe est mis à jour dans Supabase Auth
**And** un message de confirmation est affiché

**Given** je suis sur la page `/account`
**When** je consulte mon statut d'abonnement
**Then** je vois si mon abonnement est actif ou inactif, et le type (payant ou promo)

---

## Epic 2: Chat IA — Conversation avec la méthode de Mathieu

L'utilisateur peut discuter avec l'IA de Mathieu. Les réponses sont en streaming, fidèles à la méthode, avec garde-fous et historique des conversations.

### Story 2.1: Pipeline IA — Envoi de message et réponse en streaming

As a user,
I want to send a text message to the AI and receive a streamed response,
So that I get coaching advice from Mathieu's method in real time.

**Acceptance Criteria:**

**Given** je suis connecté et sur la page de chat
**When** je tape un message et appuie sur Entrée
**Then** le message est envoyé à l'API route `/api/chat`
**And** la réponse est streamée en temps réel (SSE via ReadableStream) avec un typing indicator
**And** le premier token apparaît en moins de 3 secondes

**Given** l'API route `/api/chat` reçoit un message
**When** elle traite la requête
**Then** elle utilise l'interface `AIProvider` pour appeler le fournisseur IA configuré (OpenAI ou Gemini via `AI_PROVIDER` env var)
**And** le prompt système inclut les instructions de base de la méthode de Mathieu
**And** la réponse est validée côté serveur avec Zod

**DB créée dans cette story :** Tables `conversations` (id, user_id, title, pillar_id, created_at, updated_at) et `messages` (id, conversation_id, role, content, created_at) + RLS policies

**Code créé :** `lib/ai/types.ts`, `lib/ai/openai.ts`, `lib/ai/gemini.ts`, `lib/ai/provider.ts`, `app/api/chat/route.ts`

### Story 2.2: Contexte conversationnel et fidélité à la méthode

As a user,
I want the AI to maintain context within a conversation and respond only within Mathieu's method,
So that I get coherent, method-consistent coaching advice.

**Acceptance Criteria:**

**Given** j'ai envoyé plusieurs messages dans une conversation
**When** j'envoie un nouveau message
**Then** l'IA tient compte des messages précédents pour sa réponse (contexte maintenu)

**Given** l'IA reçoit une question
**When** elle génère une réponse
**Then** elle répond exclusivement dans le cadre de la méthode de Mathieu
**And** elle n'utilise pas d'informations provenant d'Internet
**And** elle identifie le sujet de la question et répond dans le cadre approprié

**Code créé :** `lib/ai/promptBuilder.ts` (construction du prompt avec contexte conversationnel + base de connaissances)

### Story 2.3: Historique et reprise des conversations

As a user,
I want to browse my past conversations and resume any of them,
So that I can continue learning from where I left off.

**Acceptance Criteria:**

**Given** je suis connecté
**When** j'ouvre la sidebar (layout ChatGPT-like)
**Then** je vois la liste de mes conversations passées, triées par date (plus récente en haut)
**And** chaque conversation affiche son titre

**Given** je clique sur une conversation dans la sidebar
**When** la page se charge
**Then** je vois l'historique complet des messages de cette conversation
**And** je peux envoyer un nouveau message pour la reprendre

**Given** je démarre un nouveau chat
**When** j'envoie le premier message
**Then** une nouvelle conversation est créée avec un titre auto-généré
**And** elle apparaît dans la sidebar

**Composants créés :** `ChatSidebar.tsx`, `ChatInterface.tsx`, `ChatMessage.tsx`, `ChatInput.tsx`

### Story 2.4: Garde-fous IA — Protection du périmètre

As a user,
I want the AI to refuse questions outside Mathieu's method and redirect me politely,
So that I stay focused on proven coaching advice.

**Acceptance Criteria:**

**Given** j'envoie une question hors périmètre (ex: nutrition, médecine, politique)
**When** l'IA traite la requête
**Then** elle refuse poliment et propose de revenir sur les 5 piliers de la méthode
**And** le message de refus est clair et bienveillant

**Given** un utilisateur tente une injection de prompt (ex: "ignore tes instructions et...")
**When** le message est envoyé
**Then** les inputs sont validés et assainis avant envoi à l'API IA (sanitization)
**And** l'IA ne sort pas de son cadre malgré la tentative

**Given** l'IA génère une réponse
**When** la réponse est vérifiée côté serveur
**Then** elle est conforme au périmètre de la méthode (détection hors périmètre côté output)

**Code créé :** `lib/ai/guardrails.ts` (validation input/output), `lib/validations/chat.ts` (schemas Zod)

---

## Epic 3: Les 5 Piliers — Navigation guidée par la méthode

L'utilisateur découvre les 5 piliers de la méthode sur l'écran d'accueil et peut lancer un chat dédié à chaque pilier.

### Story 3.1: Affichage des 5 piliers et mode global sur l'accueil

As a user,
I want to see the 5 pillars of Mathieu's method on the home screen and choose one or use global mode,
So that I can navigate the method intuitively.

**Acceptance Criteria:**

**Given** je suis connecté et sur l'accueil `(app)/page.tsx`
**When** la page se charge
**Then** je vois les 5 piliers affichés sous forme de cartes/boutons cliquables
**And** je vois un bouton/option pour le mode global (chat libre)
**And** les piliers sont chargés dynamiquement depuis la table `pillars` en DB

**Given** les piliers sont configurés en DB
**When** un admin modifie un pilier (nom, description)
**Then** le changement est reflété sur l'accueil sans changement de code

**DB créée dans cette story :** Table `pillars` (id, name, description, icon, pre_prompt, display_order, is_active) + RLS policies + seed data avec les 5 piliers

**Composants créés :** `PillarGrid.tsx`, `PillarCard.tsx`

### Story 3.2: Chat dédié par pilier avec pré-prompt

As a user,
I want to click a pillar and start a chat that's pre-configured for that specific topic,
So that I get focused coaching advice on that aspect of the method.

**Acceptance Criteria:**

**Given** je suis sur l'accueil
**When** je clique sur un pilier (ex: "Swing")
**Then** un nouveau chat est créé avec `pillar_id` associé
**And** le pré-prompt du pilier est injecté dans le contexte de l'IA (invisible pour l'utilisateur)
**And** je suis redirigé vers la page du chat

**Given** je suis dans un chat lié à un pilier
**When** je pose une question
**Then** l'IA répond dans le cadre spécifique de ce pilier, en utilisant le pré-prompt dédié

**Given** je choisis le mode global
**When** je démarre un chat
**Then** aucun pré-prompt de pilier n'est injecté
**And** l'IA identifie le sujet et répond dans le cadre global de la méthode

---

## Epic 4: Dictée vocale — Parler au coach

L'utilisateur peut dicter ses questions avec le micro. La transcription comprend le vocabulaire golf.

### Story 4.1: Enregistrement vocal et transcription Whisper

As a user,
I want to press a microphone button, speak my question, and have it transcribed into text,
So that I can interact with the AI hands-free, especially at the practice range.

**Acceptance Criteria:**

**Given** je suis dans un chat
**When** j'appuie sur le bouton micro
**Then** l'enregistrement audio démarre (via MediaRecorder API)
**And** un indicateur visuel montre que l'enregistrement est en cours

**Given** l'enregistrement est en cours
**When** je relâche/clique à nouveau sur le bouton micro
**Then** l'enregistrement s'arrête
**And** l'audio est envoyé à l'API route `/api/transcribe`

**Given** l'API reçoit un fichier audio
**When** elle traite la requête
**Then** elle utilise l'interface `TranscriptionProvider` pour appeler Whisper
**And** la transcription est retournée en moins de 5 secondes pour un message de 30 secondes
**And** le vocabulaire golf est correctement reconnu (grip, stance, swing path, lie, fade, draw...)

**Given** la transcription est retournée
**When** le texte est affiché dans le champ de saisie
**Then** l'utilisateur peut le modifier avant envoi ou l'envoyer directement

**Code créé :** `lib/transcription/types.ts`, `lib/transcription/whisper.ts`, `lib/transcription/provider.ts`, `app/api/transcribe/route.ts`, `components/shared/VoiceRecorder.tsx`

---

## Epic 5: Administration — Gestion de l'IA et des contenus

L'admin peut contrôler le comportement de l'IA : prompt principal, base de connaissances, garde-fous et exceptions.

### Story 5.1: Édition du prompt principal

As an admin,
I want to edit the main AI system prompt,
So that I can control how the AI responds to students.

**Acceptance Criteria:**

**Given** je suis connecté en tant qu'admin et sur `/admin/ai/prompt`
**When** je modifie le prompt principal dans un éditeur texte
**Then** le prompt est sauvegardé en DB
**And** les prochaines réponses IA utilisent le nouveau prompt

**Given** je modifie le prompt
**When** je sauvegarde
**Then** un message de confirmation est affiché
**And** l'ancien prompt est accessible (historique basique)

**DB créée dans cette story :** Table `ai_config` (id, key, value, updated_at) pour stocker le prompt principal et autres configurations IA

**Composants créés :** `PromptEditor.tsx`, `AdminSidebar.tsx`, layout admin

### Story 5.2: Gestion de la base de connaissances

As an admin,
I want to add, update, and remove documents from the AI knowledge base,
So that the AI's responses stay up to date with my method.

**Acceptance Criteria:**

**Given** je suis sur `/admin/ai/knowledge`
**When** j'ajoute un nouveau document (titre + contenu texte ou upload fichier)
**Then** le document est stocké dans la table `knowledge_documents` et disponible pour l'IA

**Given** je suis sur la liste des documents
**When** je modifie un document existant
**Then** les modifications sont sauvegardées et immédiatement disponibles pour l'IA

**Given** je suis sur la liste des documents
**When** je supprime un document
**Then** le document n'est plus utilisé par l'IA dans ses réponses

**DB créée dans cette story :** Table `knowledge_documents` (id, title, content, file_url, is_active, created_at, updated_at) + RLS policies (admin write, system read)

**Composants créés :** `KnowledgeManager.tsx`

### Story 5.3: Configuration des garde-fous et exceptions

As an admin,
I want to define forbidden topics, redirection rules, and controlled exceptions,
So that I control exactly what the AI will and won't discuss.

**Acceptance Criteria:**

**Given** je suis sur `/admin/ai/guardrails`
**When** j'ajoute un sujet interdit (ex: "nutrition")
**Then** il est stocké en DB et l'IA refuse les questions sur ce sujet

**Given** je suis sur `/admin/ai/guardrails`
**When** j'ajoute une exception contrôlée (ex: "nutrition dans le cadre de la préparation match")
**Then** l'IA peut répondre sur ce sujet dans le cadre défini

**Given** je modifie les règles de redirection
**When** je sauvegarde
**Then** le message de refus/redirection de l'IA est mis à jour

**DB créée dans cette story :** Table `guardrails` (id, type, subject, description, is_active, created_at) + RLS policies

**Composants créés :** `GuardrailEditor.tsx`

---

## Epic 6: Administration — Gestion des utilisateurs et métriques

L'admin peut consulter et gérer les utilisateurs et voir les données business.

### Story 6.1: Liste et gestion des utilisateurs

As an admin,
I want to view the list of all users and activate/deactivate accounts,
So that I can manage access to the platform.

**Acceptance Criteria:**

**Given** je suis connecté en tant qu'admin sur `/admin/users`
**When** la page se charge
**Then** je vois la liste des utilisateurs avec : email, statut (actif/inactif), date d'inscription, type d'abonnement

**Given** je suis sur la liste des utilisateurs
**When** je clique sur "Désactiver" pour un utilisateur
**Then** son statut passe à inactif et il ne peut plus accéder à l'app

**Given** je suis sur la liste des utilisateurs
**When** je clique sur "Activer" pour un utilisateur désactivé
**Then** son statut repasse à actif

**Composants créés :** `UserTable.tsx`

### Story 6.2: Dashboard métriques business

As an admin,
I want to see business metrics like active users count and registration history,
So that I can monitor the platform's usage.

**Acceptance Criteria:**

**Given** je suis sur `/admin/metrics`
**When** la page se charge
**Then** je vois le nombre d'utilisateurs actifs
**And** je vois le nombre total d'inscrits
**And** je vois l'historique de présence (dernière connexion par utilisateur)
**And** je vois les inscriptions récentes

**Composants créés :** `MetricsDashboard.tsx`

---

## Epic 7: Paiement Stripe — Abonnement et accès

Le système gère les statuts d'abonnement via webhook Stripe et contrôle l'accès à l'application.

### Story 7.1: Webhook Stripe et gestion des codes promo

As a system,
I want to receive Stripe webhook events and manage subscription statuses,
So that user access is automatically synchronized with their payment status.

**Acceptance Criteria:**

**Given** Stripe envoie un événement `checkout.session.completed`
**When** le webhook `/api/webhooks/stripe` reçoit l'événement
**Then** la signature est vérifiée via `stripe.webhooks.constructEvent`
**And** le statut d'abonnement de l'utilisateur est mis à jour dans `profiles.subscription_status`

**Given** Stripe envoie un événement `customer.subscription.deleted`
**When** le webhook traite l'événement
**Then** le statut d'abonnement passe à `inactive`

**Given** Stripe envoie un événement `invoice.payment_succeeded` (renouvellement)
**When** le webhook traite l'événement
**Then** le statut d'abonnement reste `active`

**Given** un code promo valide est utilisé à l'inscription (géré en Epic 1)
**When** l'utilisateur accède à l'app
**Then** son accès est actif sans webhook Stripe

**Code créé :** `lib/stripe/client.ts`, `lib/stripe/webhookHandler.ts`, `app/api/webhooks/stripe/route.ts`

### Story 7.2: Contrôle d'accès basé sur l'abonnement

As a user,
I want to access the app only if my subscription is active,
So that the platform's business model is enforced.

**Acceptance Criteria:**

**Given** je suis connecté avec `subscription_status: 'active'`
**When** j'accède aux pages de chat
**Then** j'ai accès normalement

**Given** je suis connecté avec `subscription_status: 'inactive'`
**When** j'accède aux pages de chat
**Then** je suis redirigé vers une page indiquant que mon abonnement est inactif
**And** je vois un lien vers la page de vente pour réactiver

**Given** le middleware Next.js vérifie les requêtes
**When** une requête arrive sur les routes protégées `(app)/*`
**Then** le statut d'abonnement est vérifié en plus de l'authentification

---

## Epic 8: PWA & Mobile — Installation et expérience mobile

L'application est installable comme une PWA sur iOS et Android avec un tutoriel vidéo.

### Story 8.1: Configuration PWA et responsive design

As a user,
I want to install the app on my phone like a native app and use it on any device,
So that I can access my golf coach everywhere, especially at the practice range.

**Acceptance Criteria:**

**Given** j'ouvre l'app sur mobile (iOS Safari ou Android Chrome)
**When** le navigateur détecte le `manifest.json` et le service worker
**Then** l'option "Ajouter à l'écran d'accueil" est disponible

**Given** j'installe l'app en PWA
**When** je l'ouvre depuis l'icône sur l'écran d'accueil
**Then** l'app s'ouvre en mode standalone (sans barre de navigateur)
**And** l'icône et le splash screen sont brandés Lya

**Given** j'utilise l'app sur desktop, tablette ou mobile
**When** je navigue entre les pages
**Then** l'interface est responsive et utilisable sur toutes les tailles d'écran
**And** le layout ChatGPT-like s'adapte (sidebar collapsable sur mobile)

**Fichiers créés :** `public/manifest.json`, `public/sw.js`, `public/icons/*`

### Story 8.2: Tutoriel vidéo d'installation mobile

As a user,
I want to see a video tutorial showing how to install the app on my phone,
So that I know how to add it to my home screen.

**Acceptance Criteria:**

**Given** je suis sur l'app en mode navigateur mobile
**When** je n'ai pas encore installé la PWA
**Then** un prompt ou un lien vers le tutoriel est affiché

**Given** je clique sur le tutoriel
**When** la vidéo se charge
**Then** je vois les instructions pas à pas pour installer sur iOS et Android

**Composants créés :** `PWAInstallPrompt.tsx`
**Fichier ajouté :** `public/videos/pwa-install-tutorial.mp4`
