# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Lya** is an AI-powered golf coaching assistant — the digital extension of Mathieu's coaching pedagogy. It's a client project (not our own product). The core value is prompt engineering fidelity: the AI must respond exactly as Mathieu would, using only his knowledge base. This is NOT a generic golf chatbot.

- **Type:** Web App (PWA), EdTech/Sports Coaching
- **Language:** French (all UI text, validation messages, and user-facing communication)

## Tech Stack

- **Framework:** Next.js 16 (App Router) + TypeScript strict
- **Styling:** Tailwind CSS + shadcn/ui (style: "new-york", icons: lucide)
- **Backend/Auth/DB:** Supabase (PostgreSQL, Auth cookie-based SSR via `@supabase/ssr`, RLS on all tables)
- **AI:** OpenAI (`gpt-4o`) or Gemini (`gemini-2.0-flash`), swappable via `AI_PROVIDER` env var
- **Voice:** Whisper API (`whisper-1`, language: `fr`)
- **Payments:** Stripe (webhook-based with HMAC-SHA256 signature verification)
- **Hosting:** Vercel
- **No ORM** (no Prisma, no Drizzle) — Supabase Client JS only
- **No n8n** — explicitly excluded

## Build & Dev Commands

```bash
npm run dev          # Dev server with Turbopack
npm run build        # Production build
npm run lint         # ESLint

# Supabase
npx supabase db diff                                           # Generate migration
npx supabase db push                                           # Apply migrations
npx supabase gen types typescript --local > types/database.ts  # Regenerate DB types
```

No test framework is configured yet.

## Architecture

### Route Groups & Middleware

Three route groups with different access levels, enforced in `middleware.ts`:

- **`app/auth/`** — Public (login, signup, callback, forgot/update password)
- **`app/(app)/`** — Protected: requires authenticated user. Layout provides `AuthProvider`, `ChatSidebar`, header
- **`app/admin/`** — Protected: requires `profiles.role === 'admin'`. Layout provides `AdminSidebar`
- **`app/api/webhooks/*`** — Bypasses auth (signature-verified separately)

Middleware flow: `updateSession()` refreshes cookie → check auth → check admin role for `/admin/*`.

### AI Pipeline (critical path)

The chat flow in `app/api/chat/route.ts`:

1. Auth check → subscription check (`is_active` + `subscription_status === "active"`) + rate limit (`CHAT_RATE_LIMIT_PER_HOUR` user messages/hour, default 60; both bypassed in dev)
2. Zod validation (`lib/validations/chat.ts`)
3. Input sanitization via `lib/ai/guardrails.ts` (regex-based injection detection, max 4000 chars)
4. Get or create conversation (auto-titles from first 50 chars of message)
5. In parallel (`Promise.all`): save user message, fetch the 50 **most recent** messages as history (windowed to ~12k chars in `buildMessages`), RAG retrieval, build system prompt
6. **RAG retrieval** via `lib/ai/retrieval.ts` — embeds the user message (`lib/ai/embeddings.ts`, OpenAI `text-embedding-3-small`) and calls the `match_knowledge_chunks` RPC (pgvector cosine, `security definer`, similarity threshold 0.25) which returns the top relevant `knowledge_chunks` with their document title
7. Build system prompt via `lib/ai/promptBuilder.ts` (fetches `ai_config.system_prompt` + `guardrails` from DB, appends pillar-specific `pre_prompt`). **The system prompt contains only conversation-stable content**; the RAG passages are injected into the final user message via `buildUserMessage()` so the request prefix stays stable → OpenAI prompt caching applies. Only the raw user message is saved to DB (RAG context is never replayed in history)
8. `getAIProvider().stream(messages)` — singleton factory in `lib/ai/provider.ts`
9. **`stream.tee()`** — one fork returned to client, one fork saves assistant response to DB inside `after()` (survives client disconnect)
10. Returns `Response` with `X-Conversation-Id` header (used by client for new conversations)

Knowledge indexing (extract PDF → chunk → embed → insert `knowledge_chunks`) is centralized in `lib/ai/indexing.ts` — used by the admin knowledge/files routes and `scripts/reindex-knowledge.ts`. Admin API routes use `requireAdmin()` from `lib/auth/requireAdmin.ts` for the auth/role boilerplate.

### Provider Abstraction

```typescript
// lib/ai/types.ts
interface AIProvider {
  chat(messages: AIMessage[], config?: AIStreamConfig): Promise<string>;
  stream(messages: AIMessage[], config?: AIStreamConfig): Promise<ReadableStream<Uint8Array>>;
}
```

- `lib/ai/openai.ts` — Direct fetch to OpenAI API (model: `OPENAI_MODEL` env var or `gpt-4o`)
- `lib/ai/gemini.ts` — Direct fetch to Gemini API, converts message format (model: `GEMINI_MODEL` env var or `gemini-2.0-flash`)
- `lib/ai/provider.ts` — Factory with singleton caching, selected by `AI_PROVIDER` env var

### Supabase Client Patterns

Three client variants, use the right one depending on context:

- **`lib/supabase/client.ts`** — `createBrowserClient()` for client components
- **`lib/supabase/server.ts`** — `createServerClient()` for server components and route handlers (cookie-based)
- **`lib/supabase/middleware.ts`** — `updateSession()` for middleware session refresh

The Stripe webhook uses a service-role admin client to bypass RLS.

### Auth State

`contexts/AuthContext.tsx` provides `useAuth()` hook with:
- `user`, `profile`, `isLoading`
- `isAdmin` (computed: `profile.role === 'admin'`)
- `isSubscribed` (computed: `profile.subscription_status === 'active'`)
- `refreshProfile()` — re-fetches profile from DB
- Subscribes to `onAuthStateChange()` for real-time session updates

### Streaming on the Client

`components/chat/ChatInterface.tsx` consumes the AI stream:
- POST to `/api/chat`, read `X-Conversation-Id` from response header
- `response.body.getReader()` + `TextDecoder` to incrementally render `streamingContent`
- Optimistic UI: user message appears immediately before response starts

### Database Schema

8 migrations in `supabase/migrations/` (001–008):
- `profiles` — extends `auth.users` with `role`, `subscription_status`, `subscription_type`, `is_active`. Auto-created via trigger on user signup
- `promo_codes` — code validation and redemption
- `conversations` — `user_id`, `title`, `pillar_id`
- `messages` — `conversation_id`, `role` (user/assistant), `content`
- `pillars` — 5 coaching pillars with `name`, `description`, `icon`, `pre_prompt`, `display_order`
- `knowledge_documents` — admin-managed knowledge base content, indexed into `knowledge_chunks` for RAG (not readable directly by non-admin users since migration 015)
- `guardrails` — rules (forbidden/exception) injected into system prompt
- `ai_config` — key-value store for main system prompt and other AI config

All tables have RLS. Users see only their own data. Admins have elevated policies.

### Naming Conventions

| Context | Convention | Examples |
|---------|-----------|----------|
| DB tables/columns | `snake_case` | `knowledge_documents`, `user_id` |
| API endpoints | `kebab-case` | `/api/admin/knowledge-documents` |
| JSON body/params | `camelCase` | `conversationId`, `pillarId` |
| Components | `PascalCase.tsx` | `ChatMessage.tsx`, `PillarCard.tsx` |
| Lib/utils | `camelCase.ts` | `promptBuilder.ts`, `guardrails.ts` |
| Types/Interfaces | `PascalCase` | `AIProvider`, `ChatMessage` |

### API Response Format

```typescript
{ success: true, data: T }                              // Success
{ success: false, error: { message: string, code: string } }  // Error
```

Exception: the chat endpoint returns a raw `ReadableStream` (not JSON).

### Stripe Webhook Flow

`app/api/webhooks/stripe/route.ts` handles:
- `checkout.session.completed` → activates subscription (resolves user via metadata/client_reference_id/email)
- `customer.subscription.updated` → maps Stripe status to `active`/`inactive`/`past_due`
- `customer.subscription.deleted` → sets `inactive`

Signature verification in `lib/stripe.ts` using HMAC-SHA256 with timing-safe comparison.

### Environment Variables

Required in `.env.local` (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, for webhook admin operations)
- `AI_PROVIDER` (`openai` or `gemini`), `OPENAI_API_KEY`, `GEMINI_API_KEY`
- `OPENAI_MODEL`, `GEMINI_MODEL` (optional overrides)
- `EMBEDDING_MODEL` (optional, default `text-embedding-3-small` — RAG embeddings via OpenAI, independent of `AI_PROVIDER`)
- `CHAT_RATE_LIMIT_PER_HOUR` (optional, default 60 — max user messages per hour per user)
- `STRIPE_WEBHOOK_SECRET`

## Planning Documents

Detailed requirements in `_bmad-output/planning-artifacts/`:
- `prd.md` — 38 functional + 16 non-functional requirements
- `architecture.md` — Full architecture decisions and patterns
- `epics.md` — 8 epics, 19 stories with Given/When/Then acceptance criteria
