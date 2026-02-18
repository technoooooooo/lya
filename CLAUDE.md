# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Lya** is an AI-powered golf coaching assistant — the digital extension of Mathieu's coaching pedagogy. It's a client project (not our own product). The core value is prompt engineering fidelity: the AI must respond exactly as Mathieu would, using only his knowledge base. This is NOT a generic golf chatbot.

- **Type:** Web App (PWA), EdTech/Sports Coaching
- **Status:** Planning complete, implementation not yet started
- **Language:** French (all documents, UI, and communication)

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript strict
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend/Auth/DB:** Supabase (PostgreSQL, Auth cookie-based SSR via `supabase-ssr`, Storage, RLS)
- **AI:** OpenAI or Gemini (swappable via `AIProvider` interface, selected by `AI_PROVIDER` env var)
- **Voice:** Whisper API (swappable via `TranscriptionProvider` interface)
- **Payments:** Stripe (webhook-based, external sales page on systeme.io)
- **Hosting:** Vercel (serverless, auto-deploy from Git)
- **PWA:** Service worker + manifest.json (no offline mode at MVP)

## Build & Dev Commands

```bash
# Initialize project (not yet done)
npx create-next-app -e with-supabase lya

# Standard Next.js commands (once initialized)
npm run dev          # Dev server with Turbopack
npm run build        # Production build
npm run lint         # ESLint

# Supabase
npx supabase db diff    # Generate migration
npx supabase db push    # Apply migrations
npx supabase gen types typescript --local > types/database.ts  # Regenerate DB types
```

## Architecture

### Key Architectural Decisions

- **No ORM** — Use Supabase Client JS natively (no Prisma, no Drizzle)
- **RLS on all tables** — Every user sees only their own data; admin has dedicated policies
- **AI streaming via SSE** — `ReadableStream` in Route Handlers, consumed via `fetch` + `getReader()`
- **Provider abstraction** — `AIProvider` interface (OpenAI/Gemini) and `TranscriptionProvider` interface (Whisper) are swappable without code changes
- **Zod validation** — Server-side input validation on all API routes before any processing
- **Middleware RBAC** — Next.js middleware protects `/admin/*` (admin role check) and verifies active subscription on protected routes
- **React Context** for global auth/user state (no Redux/Zustand at MVP)
- **No n8n** — explicitly excluded from the stack

### Project Structure

```
lya/
├── middleware.ts                    # Auth + RBAC + subscription checks
├── supabase/migrations/            # Versioned SQL migrations (001-008)
├── app/
│   ├── (auth)/                     # Public pages: login, signup, callback
│   ├── (app)/                      # Protected student pages: chat, account, pillars
│   ├── admin/                      # Protected admin pages: ai config, users, metrics
│   └── api/
│       ├── chat/route.ts           # POST — AI streaming (SSE)
│       ├── conversations/route.ts  # GET list, POST create
│       ├── transcribe/route.ts     # POST — audio → text
│       ├── admin/                  # Admin CRUD routes
│       └── webhooks/stripe/route.ts # Stripe webhook (signature-verified)
├── components/
│   ├── ui/                         # shadcn/ui base components
│   ├── chat/                       # ChatInterface, ChatMessage, ChatInput, ChatSidebar
│   ├── pillars/                    # PillarGrid, PillarCard
│   ├── auth/                       # LoginForm, SignupForm, PromoCodeInput
│   ├── admin/                      # PromptEditor, KnowledgeManager, GuardrailEditor, UserTable
│   └── shared/                     # VoiceRecorder, PWAInstallPrompt, ErrorBoundary
├── lib/
│   ├── supabase/                   # client.ts, server.ts, middleware.ts
│   ├── ai/                         # types.ts, openai.ts, gemini.ts, provider.ts, promptBuilder.ts, guardrails.ts
│   ├── transcription/              # types.ts, whisper.ts, provider.ts
│   ├── stripe/                     # client.ts, webhookHandler.ts
│   └── validations/                # Zod schemas: chat.ts, auth.ts, admin.ts
├── types/                          # database.ts (generated), chat.ts, admin.ts, api.ts
└── contexts/                       # AuthContext.tsx, ChatContext.tsx
```

### Naming Conventions

| Context | Convention | Examples |
|---------|-----------|----------|
| DB tables | `snake_case`, plural | `knowledge_documents`, `promo_codes` |
| DB columns | `snake_case` | `user_id`, `created_at`, `is_active` |
| API endpoints | `kebab-case`, plural | `/api/conversations`, `/api/admin/knowledge-documents` |
| JSON body/params | `camelCase` | `conversationId`, `messageContent` |
| Component files | `PascalCase.tsx` | `ChatMessage.tsx`, `PillarCard.tsx` |
| Utility/service files | `camelCase.ts` | `aiProvider.ts`, `inputSanitizer.ts` |
| Folders | `kebab-case` | `chat-interface`, `knowledge-base` |
| Interfaces/Types | `PascalCase` | `AIProvider`, `ChatMessage`, `UserProfile` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_TOKENS`, `DEFAULT_PILLAR_PROMPT` |

### API Response Format

```typescript
// Success
{ success: true, data: T }
// Error
{ success: false, error: { message: string, code: string } }
```

### Implementation Sequence

1. Init (`create-next-app -e with-supabase`) → 2. DB schema + RLS → 3. Auth + RBAC → 4. AI pipeline (abstraction + streaming + guardrails) → 5. Chat UI (ChatGPT-like) → 6. 5 Pillars + dynamic pre-prompts → 7. Voice transcription → 8. Admin panel → 9. Stripe integration → 10. PWA

## UX Direction

ChatGPT-like interface: sidebar with conversation history on the left, central chat area, input at the bottom. The differentiator is the 5 pillars displayed as entry points (cards on home screen). Do not reinvent the chat UX — capitalize on existing conventions.

## Planning Documents

All planning is complete in `_bmad-output/planning-artifacts/`:
- `prd.md` — 38 functional requirements, 16 non-functional requirements
- `architecture.md` — Full architecture decisions, directory structure, patterns
- `epics.md` — 8 epics, 19 stories with Given/When/Then acceptance criteria

## BMAD Framework

The `_bmad/` directory contains the BMAD planning framework (v6.0.1). Slash commands are available for workflows (`/bmad-bmm-*`). Implementation artifacts go in `_bmad-output/implementation-artifacts/`.
