---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
inputDocuments: ['prd.md']
workflowType: 'architecture'
project_name: 'Lya'
user_name: 'Antoineoriol'
date: '2026-02-18'
lastStep: 8
status: 'complete'
completedAt: '2026-02-18'
---

# Architecture Decision Document — Lya

_Assistant IA dédié au coaching golf, prolongement numérique de la méthode de Mathieu._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
38 FRs couvrant 8 domaines de capacité. Le coeur architectural est le pipeline de chat IA (FR7-FR14) avec streaming, contexte par pilier, et système de garde-fous. L'admin (FR27-FR35) est un second axe majeur avec le CRUD de la base de connaissances et la gestion des utilisateurs. Le paiement (FR24-FR26) est une intégration externe via webhook Stripe.

**Non-Functional Requirements:**
16 NFRs structurantes. Les plus impactantes pour l'architecture : streaming < 3s first token (NFR1), abstraction fournisseur IA et vocal (NFR15-16), scalabilité à 1000 utilisateurs (NFR11), validation/assainissement des inputs IA (NFR8), et flexibilité de la configuration des piliers sans changement de code (NFR13).

**Scale & Complexity:**

- Domaine principal : Full-stack web + pipeline IA
- Complexité : Moyenne
- Composants architecturaux estimés : 8-10

### Technical Constraints & Dependencies

- Hébergement Vercel (Node.js) — Serverless functions, edge functions
- Supabase comme BaaS — PostgreSQL, Auth, Storage, Row Level Security
- API IA externe (OpenAI ou Gemini) — Latence réseau, coûts par token, limites de rate
- Whisper API — Dépendance externe pour transcription vocale
- Stripe — Webhook asynchrone, page de vente externe (systeme.io)
- PWA — Contraintes iOS Safari (pas de push notifications, installation limitée)

### Cross-Cutting Concerns Identified

- **Sécurité IA** : Validation inputs, garde-fous prompt, contrôle outputs — traverse tout le pipeline chat
- **Abstraction fournisseur** : IA (OpenAI/Gemini) et vocal (Whisper) doivent être interchangeables
- **Auth & RBAC** : Contrôle d'accès élève/admin sur toutes les routes et fonctionnalités
- **Configuration dynamique** : Piliers, prompts, garde-fous, contenus — modifiables par l'admin sans redéploiement

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application (PWA) avec pipeline IA, basée sur les contraintes projet : Vercel (hébergement), Node.js (runtime), Supabase (BaaS).

### Starter Options Considered

| Option | Source | Inclus | Verdict |
|---|---|---|---|
| `create-next-app -e with-supabase` | Vercel/Supabase officiel | Next.js 16, TS, Tailwind, shadcn/ui, Supabase Auth SSR | **Retenu** — base propre, officielle, à jour |
| next-supabase-stripe-starter | KolbySisk (GitHub) | Next.js, Supabase, Stripe, shadcn/ui | Écarté — code tiers, surcouche Stripe non nécessaire à ce stade |
| Vercel Stripe SaaS Starter | Vercel officiel | Next.js, Supabase, Stripe, Drizzle | Écarté — Drizzle ORM non nécessaire avec Supabase client natif |

### Selected Starter: create-next-app with Supabase template

**Rationale :** Base minimale, officielle et maintenue. Le coeur de Lya est le pipeline IA, pas le boilerplate SaaS. Mieux vaut une base propre qu'on enrichit qu'un starter surchargé qu'on doit nettoyer.

**Commande d'initialisation :**

```bash
npx create-next-app -e with-supabase lya
```

**Décisions architecturales fournies par le starter :**

- **Langage & Runtime :** TypeScript strict, Node.js 20+
- **Styling :** Tailwind CSS + shadcn/ui
- **Build :** Turbopack (Next.js 16 default)
- **Auth :** Supabase Auth via `supabase-ssr` (cookie-based, SSR-compatible)
- **Organisation code :** App Router, structure `app/` standard Next.js
- **Routing :** File-based routing (App Router)
- **Dev Experience :** Hot reload, TypeScript, ESLint

## Core Architectural Decisions

### Decision Priority Analysis

**Critical Decisions (Block Implementation):**

- Accès DB via Supabase Client JS natif (pas d'ORM tiers)
- Auth via Supabase Auth cookie-based SSR
- Streaming IA via SSE (Server-Sent Events) dans Route Handlers
- Abstraction fournisseur IA : interface TypeScript `AIProvider`

**Important Decisions (Shape Architecture):**

- RLS sur toutes les tables
- Validation Zod côté serveur
- Middleware Next.js pour RBAC et statut abonnement
- React Context pour state global auth/user
- Réponses API standardisées `{ success, data, error }`

**Deferred Decisions (Post-MVP):**

- Cache dédié (Redis, etc.)
- Monitoring avancé (Sentry, Datadog)
- Pipeline CI custom
- Rate limiting avancé

### Data Architecture

- **Accès DB :** Supabase Client JS natif — pas d'ORM tiers (Prisma, Drizzle). Cohérent avec l'écosystème Supabase, simplifie la stack.
- **Sécurité données :** Row Level Security (RLS) activé sur toutes les tables. Chaque utilisateur ne voit que ses propres données. L'admin a des policies dédiées.
- **Validation :** Zod pour la validation des inputs côté API routes (serveur). Validation avant tout traitement ou envoi à l'API IA.
- **Migrations :** Supabase CLI (`supabase db diff` / `supabase db push`). Migrations SQL versionnées dans le repo.
- **Cache :** Pas de cache dédié au MVP. Cache Next.js natif (fetch cache) pour les données statiques. Réponses IA non cachées.

### Authentication & Security

- **Auth :** Supabase Auth — email/password, cookie-based SSR via `supabase-ssr`
- **Rôles :** Champ `role` dans table `profiles` (valeurs : `user`, `admin`). Vérifié côté middleware Next.js + RLS PostgreSQL.
- **Middleware :** Middleware Next.js pour protéger `/admin/*` (vérification rôle admin) et vérifier statut abonnement actif sur les routes protégées.
- **Sécurité IA :** Sanitization des inputs avant envoi API IA (strip injection patterns). Validation des outputs (détection hors périmètre côté serveur).
- **API Security :** Routes API protégées par session Supabase. Webhook Stripe vérifié par signature cryptographique (`stripe.webhooks.constructEvent`).

### API & Communication Patterns

- **Pattern :** API Routes Next.js (Route Handlers `app/api/`). REST-like, pas de GraphQL.
- **Streaming IA :** Server-Sent Events (SSE) via `ReadableStream` dans les Route Handlers. Le client consomme le flux via `fetch` + `getReader()`.
- **Abstraction IA :** Interface TypeScript `AIProvider` avec méthodes `chat(messages, config)` et `stream(messages, config)`. Implémentations `OpenAIProvider` et `GeminiProvider`. Swap via variable d'environnement `AI_PROVIDER`.
- **Abstraction vocale :** Interface TypeScript `TranscriptionProvider` avec méthode `transcribe(audio)`. Implémentation `WhisperProvider`. Même pattern de swap.
- **Error handling :** Réponses JSON standardisées `{ success: boolean, data?: T, error?: { message: string, code: string } }`. Codes HTTP appropriés (200, 400, 401, 403, 500).
- **Rate limiting :** Rate limit basique sur les routes IA au MVP (compteur en DB par utilisateur/heure).

### Frontend Architecture

- **State management :** React Context pour auth/user state global. Pas de Redux/Zustand au MVP.
- **Composants :** shadcn/ui comme base. Composants custom pour le chat (inspiré ChatGPT). Organisation par feature.
- **Data fetching :** React Server Components quand possible (pages statiques, admin). Client-side fetch pour le chat temps réel.
- **Layout :** ChatGPT-like — sidebar conversations (client component), zone chat centrale, input en bas. Responsive mobile-first.
- **PWA :** `next-pwa` ou configuration manuelle service worker + `manifest.json`. Pas de mode offline requis au MVP.

### Infrastructure & Deployment

- **Hosting :** Vercel (auto-deploy depuis Git)
- **Environnements :** Preview (branches) + Production (main)
- **Variables d'env :** `.env.local` (dev), Vercel Environment Variables (prod). Séparées par environnement.
- **Monitoring :** Vercel Analytics + Vercel Logs au MVP.
- **CI/CD :** Vercel auto-deploy. Pas de pipeline CI custom au MVP.

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database Naming :**

- Tables : `snake_case`, pluriel (`users`, `conversations`, `messages`, `knowledge_documents`, `promo_codes`)
- Colonnes : `snake_case` (`user_id`, `created_at`, `is_active`, `subscription_status`)
- Foreign keys : `{table_singulier}_id` (`user_id`, `conversation_id`)
- Enums : `snake_case` (`user`, `admin`, `active`, `inactive`)

**API Naming :**

- Endpoints : `kebab-case`, pluriel (`/api/conversations`, `/api/admin/knowledge-documents`)
- Query params : `camelCase` (`userId`, `pageSize`)
- JSON body : `camelCase` (`conversationId`, `messageContent`, `pillarId`)

**Code Naming :**

- Fichiers composants : `PascalCase.tsx` (`ChatMessage.tsx`, `PillarCard.tsx`, `AdminSidebar.tsx`)
- Fichiers utilitaires/services : `camelCase.ts` (`aiProvider.ts`, `stripeWebhook.ts`, `inputSanitizer.ts`)
- Dossiers : `kebab-case` (`chat-interface`, `admin-panel`, `knowledge-base`)
- Interfaces/Types : `PascalCase` avec préfixe descriptif (`AIProvider`, `ChatMessage`, `UserProfile`)
- Variables/fonctions : `camelCase` (`getConversations`, `sendMessage`, `validateInput`)
- Constantes : `UPPER_SNAKE_CASE` (`MAX_TOKENS`, `AI_PROVIDER`, `DEFAULT_PILLAR_PROMPT`)

### Structure Patterns

- Tests co-localisés : `__tests__/` dans chaque feature folder ou `*.test.ts` à côté du fichier
- Composants organisés par feature (`chat/`, `admin/`, `auth/`, `pillars/`)
- Services et providers dans `lib/` (`lib/ai/`, `lib/stripe/`, `lib/supabase/`)
- Types partagés dans `types/`
- Schemas Zod dans `lib/validations/`

### Format Patterns

**API Response :**

```typescript
// Succès
{ success: true, data: T }

// Erreur
{ success: false, error: { message: string, code: string } }
```

**Dates :** ISO 8601 en JSON (`2026-02-18T10:30:00Z`). PostgreSQL `timestamptz` en DB.

**IDs :** UUID v4 (généré par Supabase/PostgreSQL).

### Process Patterns

**Error handling :**

- API routes : try/catch global, réponse standardisée, log côté serveur
- Frontend : Error boundaries React pour les erreurs critiques, toast notifications pour les erreurs utilisateur
- IA : Erreurs de l'API IA catchées et renvoyées avec un message utilisateur friendly

**Loading states :**

- Chat : Skeleton/typing indicator pendant le streaming
- Pages : Loading.tsx (convention Next.js App Router)
- Actions : Boutons désactivés pendant le traitement

**Auth flow :**

- Middleware vérifie la session sur chaque requête vers les routes protégées
- Redirection vers `/login` si pas de session
- Redirection vers `/` (chat) après login réussi
- Admin : redirection vers `/` si rôle !== admin

## Project Structure & Boundaries

### Complete Project Directory Structure

```
lya/
├── README.md
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.local
├── .env.example
├── .gitignore
├── middleware.ts
├── public/
│   ├── manifest.json
│   ├── sw.js
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── videos/
│       └── pwa-install-tutorial.mp4
├── supabase/
│   ├── config.toml
│   ├── seed.sql
│   └── migrations/
│       ├── 001_profiles.sql
│       ├── 002_conversations.sql
│       ├── 003_messages.sql
│       ├── 004_knowledge_documents.sql
│       ├── 005_pillars.sql
│       ├── 006_promo_codes.sql
│       ├── 007_guardrails.sql
│       └── 008_rls_policies.sql
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   ├── loading.tsx
│   ├── error.tsx
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx
│   │   ├── signup/
│   │   │   └── page.tsx
│   │   └── callback/
│   │       └── route.ts
│   ├── (app)/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Accueil — 5 piliers + nouveau chat
│   │   ├── chat/
│   │   │   └── [conversationId]/
│   │   │       └── page.tsx            # Vue conversation
│   │   └── account/
│   │       └── page.tsx                # Profil utilisateur
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Dashboard admin
│   │   ├── ai/
│   │   │   ├── prompt/
│   │   │   │   └── page.tsx            # Édition prompt principal
│   │   │   ├── knowledge/
│   │   │   │   └── page.tsx            # Gestion documents
│   │   │   └── guardrails/
│   │   │       └── page.tsx            # Sujets interdits, exceptions
│   │   ├── users/
│   │   │   └── page.tsx                # Liste utilisateurs
│   │   └── metrics/
│   │       └── page.tsx                # Données business
│   └── api/
│       ├── chat/
│       │   └── route.ts                # POST — streaming IA
│       ├── conversations/
│       │   └── route.ts                # GET list, POST create
│       ├── transcribe/
│       │   └── route.ts                # POST — audio → texte
│       ├── admin/
│       │   ├── prompt/
│       │   │   └── route.ts
│       │   ├── knowledge/
│       │   │   └── route.ts
│       │   ├── guardrails/
│       │   │   └── route.ts
│       │   ├── users/
│       │   │   └── route.ts
│       │   └── metrics/
│       │       └── route.ts
│       └── webhooks/
│           └── stripe/
│               └── route.ts            # Webhook Stripe
├── components/
│   ├── ui/                             # shadcn/ui components
│   ├── chat/
│   │   ├── ChatInterface.tsx           # Zone de chat principale
│   │   ├── ChatMessage.tsx             # Bulle de message
│   │   ├── ChatInput.tsx               # Champ de saisie + micro
│   │   ├── ChatSidebar.tsx             # Sidebar conversations
│   │   └── TypingIndicator.tsx
│   ├── pillars/
│   │   ├── PillarGrid.tsx              # Grille des 5 piliers
│   │   └── PillarCard.tsx              # Carte pilier individuelle
│   ├── auth/
│   │   ├── LoginForm.tsx
│   │   ├── SignupForm.tsx
│   │   └── PromoCodeInput.tsx
│   ├── admin/
│   │   ├── AdminSidebar.tsx
│   │   ├── PromptEditor.tsx
│   │   ├── KnowledgeManager.tsx
│   │   ├── GuardrailEditor.tsx
│   │   ├── UserTable.tsx
│   │   └── MetricsDashboard.tsx
│   └── shared/
│       ├── VoiceRecorder.tsx           # Bouton micro + enregistrement
│       ├── PWAInstallPrompt.tsx
│       └── ErrorBoundary.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                   # Supabase browser client
│   │   ├── server.ts                   # Supabase server client
│   │   └── middleware.ts               # Supabase middleware client
│   ├── ai/
│   │   ├── types.ts                    # AIProvider interface
│   │   ├── openai.ts                   # OpenAIProvider
│   │   ├── gemini.ts                   # GeminiProvider
│   │   ├── provider.ts                 # Factory — retourne le bon provider
│   │   ├── promptBuilder.ts            # Construction du prompt (pilier + base + guardrails)
│   │   └── guardrails.ts              # Validation input/output IA
│   ├── transcription/
│   │   ├── types.ts                    # TranscriptionProvider interface
│   │   ├── whisper.ts                  # WhisperProvider
│   │   └── provider.ts                 # Factory
│   ├── stripe/
│   │   ├── client.ts                   # Stripe client
│   │   └── webhookHandler.ts           # Traitement événements webhook
│   ├── validations/
│   │   ├── chat.ts                     # Schemas Zod chat
│   │   ├── auth.ts                     # Schemas Zod auth
│   │   └── admin.ts                    # Schemas Zod admin
│   └── utils.ts                        # Utilitaires partagés
├── types/
│   ├── database.ts                     # Types générés depuis Supabase
│   ├── chat.ts                         # ChatMessage, Conversation, Pillar
│   ├── admin.ts                        # KnowledgeDocument, Guardrail
│   └── api.ts                          # ApiResponse<T>, ApiError
└── contexts/
    ├── AuthContext.tsx                  # Auth state global
    └── ChatContext.tsx                  # État conversation courante
```

### Architectural Boundaries

**API Boundaries :**

- `/api/chat/*` — Pipeline IA (protégé par auth + abonnement actif)
- `/api/conversations/*` — CRUD conversations (protégé par auth, RLS par user)
- `/api/transcribe/*` — Transcription vocale (protégé par auth + abonnement actif)
- `/api/admin/*` — Toutes les routes admin (protégé par auth + rôle admin)
- `/api/webhooks/stripe/*` — Webhook Stripe (protégé par signature, pas de session)

**Data Boundaries :**

- RLS : un utilisateur ne peut accéder qu'à ses propres conversations et messages
- Admin : policies RLS dédiées pour lecture/écriture sur toutes les tables
- Knowledge documents : lecture publique (utilisés par l'IA), écriture admin uniquement
- Prompts et guardrails : lecture par le système IA, écriture admin uniquement

**Component Boundaries :**

- `(auth)/*` — Pages publiques (login, signup)
- `(app)/*` — Pages protégées élève (chat, account)
- `admin/*` — Pages protégées admin
- `lib/ai/` — Tout le pipeline IA est encapsulé, aucun import direct d'OpenAI/Gemini ailleurs
- `lib/transcription/` — Idem pour la transcription vocale

### Requirements to Structure Mapping

| FR Category | Routes | Components | Lib | DB Tables |
|---|---|---|---|---|
| Auth (FR1-6) | `(auth)/*`, `api/auth/callback` | `auth/*` | `supabase/*` | `profiles` |
| Chat IA (FR7-14) | `(app)/chat/*`, `api/chat` | `chat/*` | `ai/*` | `conversations`, `messages` |
| Piliers (FR15-17) | `(app)/page.tsx` | `pillars/*` | `ai/promptBuilder` | `pillars` |
| Vocal (FR18-20) | `api/transcribe` | `shared/VoiceRecorder` | `transcription/*` | — |
| PWA (FR21-23) | — | `shared/PWAInstallPrompt` | — | — |
| Paiement (FR24-26) | `api/webhooks/stripe` | — | `stripe/*` | `profiles.subscription_status` |
| Admin IA (FR27-31) | `admin/ai/*`, `api/admin/*` | `admin/*` | `ai/*`, `validations/admin` | `knowledge_documents`, `pillars`, `guardrails` |
| Admin Users (FR32-35) | `admin/users/*`, `api/admin/users` | `admin/UserTable` | — | `profiles` |
| Sécurité (FR36-38) | `middleware.ts` | — | `ai/guardrails`, `validations/*` | — |

## Architecture Validation Results

### Coherence Validation

- Toutes les décisions techniques sont compatibles : Next.js 16 + Supabase + Vercel forment un stack cohérent et bien documenté
- Les patterns de naming (snake_case DB, camelCase JS, PascalCase composants) suivent les conventions standard de l'écosystème
- La structure projet s'aligne avec les conventions Next.js App Router
- Aucune décision contradictoire identifiée

### Requirements Coverage Validation

**Functional Requirements :** 38/38 FRs mappés à des composants architecturaux spécifiques (voir tableau ci-dessus).

**Non-Functional Requirements :**

- NFR1 (streaming < 3s) : SSE via ReadableStream dans Route Handlers
- NFR5-10 (sécurité) : Supabase Auth + RLS + middleware + validation Zod + signature Stripe
- NFR11 (1000 users) : Vercel serverless auto-scale + Supabase managed PostgreSQL
- NFR13 (piliers sans code change) : Table `pillars` en DB, config dynamique admin
- NFR15-16 (abstraction fournisseur) : Interfaces TypeScript `AIProvider` et `TranscriptionProvider`

### Architecture Completeness Checklist

- [x] Contexte projet analysé
- [x] Starter template évalué et sélectionné
- [x] Décisions architecturales critiques documentées avec rationale
- [x] Stack technique complètement spécifiée
- [x] Patterns d'implémentation définis (naming, structure, format, process)
- [x] Structure projet complète avec tous les fichiers et dossiers
- [x] Mapping FRs → composants architecturaux
- [x] Boundaries clairement définies (API, data, composants)
- [x] Séquence d'implémentation ordonnée avec dépendances

### Architecture Readiness Assessment

**Statut global :** PRÊT POUR L'IMPLÉMENTATION

**Confiance :** Haute — Stack standard et éprouvée, complexité maîtrisée, pas d'inconnus techniques majeurs.

**Points forts :**

- Stack cohérente et mainstream (Next.js + Supabase + Vercel)
- Abstractions fournisseur IA/vocal prêtes pour le swap
- Structure claire avec boundaries bien définies
- RLS + middleware pour la sécurité à tous les niveaux

**Améliorations futures (post-MVP) :**

- Monitoring avancé (Sentry, Datadog)
- Cache dédié pour les contenus knowledge base
- Rate limiting avancé (Vercel Edge)
- Pipeline CI avec tests automatisés
- Analytics IA (suivi des questions fréquentes, performance du prompt)

### Implementation Sequence

1. `npx create-next-app -e with-supabase lya`
2. Schema DB + RLS + migrations Supabase
3. Auth + middleware RBAC + profils
4. Pipeline IA (abstraction + streaming + guardrails)
5. Chat frontend (UI ChatGPT-like + sidebar)
6. Piliers + pré-prompts dynamiques
7. Transcription vocale (Whisper)
8. Admin panel (prompt, contenus, utilisateurs, métriques)
9. Intégration Stripe (webhook + statut abonnement)
10. PWA (service worker, manifest, tutoriel)
