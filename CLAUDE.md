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
- **AI:** OpenAI (`gpt-5.5`) or Gemini (`gemini-2.0-flash`), swappable via `AI_PROVIDER` env var
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

1. Auth check → subscription check (`is_active` + `subscription_status === "active"`) + rate limit (`CHAT_RATE_LIMIT_PER_HOUR` user messages/hour, default 60; all bypassed in dev **and for admins** — admins test the app without a Stripe subscription)
2. Zod validation (`lib/validations/chat.ts`, max `MAX_MESSAGE_LENGTH` = 30 000 chars — long pasted training plans are a core use case)
3. Input sanitization via `lib/ai/guardrails.ts` (regex-based injection detection, deliberately narrow to avoid false positives on pasted documents)
4. Get or create conversation (auto-titles from first 50 chars of message)
5. In parallel (`Promise.all`): save user message, fetch the 50 **most recent** messages as history (windowed to ~60k chars in `buildMessages`), build system prompt. RAG retrieval runs **after** (its query is contextualized with the history)
6. **RAG retrieval** via `retrieveForMessage()` in `lib/ai/retrieval.ts` — embeds the user message prefixed with the last 2 user messages (`lib/ai/embeddings.ts`, OpenAI `text-embedding-3-small`) and calls the `match_knowledge_chunks` RPC (pgvector cosine, `security definer`, similarity threshold 0.25, 8 chunks per query). Training-plan requests (`isPlanRequest()`) trigger extra support queries (plan structure, drills catalog), merged + deduped, capped at 14 chunks. Retrieved titles + similarities are logged with a `[RAG]` prefix
7. Build system prompt via `lib/ai/promptBuilder.ts` (fetches `ai_config.system_prompt` + `guardrails` from DB, appends pillar-specific `pre_prompt`). **The system prompt contains only conversation-stable content**; the RAG passages are injected into the final user message via `buildUserMessage()` so the request prefix stays stable → OpenAI prompt caching applies. Only the raw user message is saved to DB (RAG context is never replayed in history)
8. **Attachments**: uploaded files are referenced as markdown at the end of the user message content (single source of truth, no schema change — conventions in `lib/chat/attachments.ts`). The model context is assembled in `lib/chat/attachmentContext.ts`, over the **current message plus the history** (a photo sent at message N must still be readable at N+1): up to 4 images become `image_url` parts with **`detail: "high"`** (score cards and course maps are unreadable at default resolution), and up to 2 documents are injected either as extracted text (`.txt` sidecar written at upload time, when it holds ≥200 chars) or — for scanned PDFs with no usable text — as a native base64 `file` part that gpt-5.5 reads page by page. Upload route `app/api/chat/uploads/route.ts` detects the format from the file's **magic bytes**, not its extension or browser MIME type (a course map exported to PDF and renamed `.jpg` used to be stored as an image and rejected by the vision API); HEIC gets an explicit error message. Detection lives in `lib/chat/fileFormat.ts` and runs **twice**: at upload, and again on every stored image before it is sent to the model (16-byte ranged GET). Never trust the `![…](…)` markdown in history — messages written before magic-byte detection reference PDFs and HEIC photos as images, and a single one of them made the vision API return 400 on **every** subsequent message of that conversation. A file that turns out to be a PDF is rerouted to the document path (native `file` part, filename normalized to `.pdf`), anything unreadable is dropped. `[PJ]`-prefixed logs report what was actually attached and what was skipped
9. `getAIProvider().stream(messages, { signal: request.signal })` — singleton factory in `lib/ai/provider.ts`. The abort signal propagates to the provider fetch so the client Stop button cancels the upstream generation
10. The response stream accumulates the streamed text as it is sent (NOT `stream.tee()` — on client abort a tee's save branch loses already-emitted chunks) and `after()` saves exactly what the user saw, full or partial, to DB
11. Returns `Response` with `X-Conversation-Id` header (used by client for new conversations)

Knowledge indexing (extract PDF → chunk → embed → insert `knowledge_chunks`) is centralized in `lib/ai/indexing.ts` — used by the admin knowledge/files routes and `scripts/reindex-knowledge.ts`. `scripts/audit-knowledge.ts` prints the KB inventory (docs/files/chunks, ai_config, guardrails) and runs test retrievals — use it when tuning RAG. Admin API routes use `requireAdmin()` from `lib/auth/requireAdmin.ts` for the auth/role boilerplate.

### Provider Abstraction

```typescript
// lib/ai/types.ts
interface AIProvider {
  chat(messages: AIMessage[], config?: AIStreamConfig): Promise<string>;
  stream(messages: AIMessage[], config?: AIStreamConfig): Promise<ReadableStream<Uint8Array>>;
}
```

- `lib/ai/openai.ts` — Direct fetch to OpenAI API (model: `OPENAI_MODEL` env var or `gpt-5.5`). Uses `max_completion_tokens` (default 8192); `temperature` is only sent to non-reasoning models (gpt-5.x/o-series reject custom values)
- `lib/ai/gemini.ts` — Direct fetch to Gemini API, converts message format (model: `GEMINI_MODEL` env var or `gemini-2.0-flash`)
- `lib/ai/provider.ts` — Factory with singleton caching, selected by `AI_PROVIDER` env var

### Supabase Client Patterns

Three client variants, use the right one depending on context:

- **`lib/supabase/client.ts`** — `createBrowserClient()` for client components
- **`lib/supabase/server.ts`** — `createServerClient()` for server components and route handlers (cookie-based)
- **`lib/supabase/middleware.ts`** — `updateSession()` for middleware session refresh

The Stripe webhook uses a service-role admin client to bypass RLS.

### Signup Flow

`/auth/signup` is a 2-step flow (`components/auth/SignUpFlow.tsx`): choose an offer (public offers read server-side with the service-role client — the `offers` RLS is `authenticated` only), then create the account. `POST /api/auth/signup` creates the user **already confirmed** (`auth.admin.createUser`, no confirmation email), the browser signs in with the password and goes straight to `/api/stripe/checkout`. An optional coach access code (`promo_codes`) replaces payment: it inserts an `access_grants` row (`source: 'promo'`). Accounts left unconfirmed by the old email flow (never signed in) are reclaimed instead of returning "email taken". Stripe discount codes are entered at Checkout (`allow_promotion_codes`). `?offre=<id|slug|internal_name>` preselects an offer.

### Admin Back-office (users & payments)

- `/admin` dashboard (Stripe KPIs + user metrics), `/admin/users` (list with filters/CSV) → `/admin/users/[userId]` (access grants: offer/revoke; Stripe subscriptions: cancel at period end / resume / cancel now; invoices: PDF, refund; role/active toggles; password-reset email), `/admin/payments` (Lya subscriptions + invoices, live), `/admin/promo-codes` (Stripe discount codes + free access codes).
- Shared UI in `components/admin/kit.tsx`; server helpers in `lib/admin/` (`users.ts`, `payments.ts` — 60 s in-memory cache, `http.ts`) and `lib/stripe/admin.ts`.
- **Shared Stripe account**: every list is filtered on the price ids of the `offers` table, every write checks the object is Lya's first (`ForeignStripeObjectError`). Coupons are created with `metadata.managed_by=lya` and `applies_to` the active Lya products only. Admin Stripe calls pin `Stripe-Version: 2024-06-20` so object shapes don't depend on the account default.
- Access codes (`promo_codes`, migration 021: `access_days`, `label`, `access_grants.promo_code_id`) and user activity (`admin_user_activity()` RPC, service-role only) need migration 021 applied.

### Auth State

`contexts/AuthContext.tsx` provides `useAuth()` hook with:
- `user`, `profile`, `isLoading`
- `isAdmin` (computed: `profile.role === 'admin'`)
- `isSubscribed` (computed: `profile.subscription_status === 'active'`)
- `refreshProfile()` — re-fetches profile from DB
- Subscribes to `onAuthStateChange()` for real-time session updates. **The callback must stay synchronous and never call Supabase**: supabase-js runs it inside its session lock, so an awaited `getSession()`/query inside it deadlocks the client — the lock is never released and every later auth call (`updateUser`, profile save…) hangs forever. This is what happened after each `TOKEN_REFRESHED`: students changing their password saw the button spin indefinitely. The profile is fetched by a separate effect keyed on `user.id`

### Streaming on the Client

`components/chat/ChatInterface.tsx` consumes the AI stream:
- POST to `/api/chat`, read `X-Conversation-Id` from response header
- `response.body.getReader()` + `TextDecoder` to incrementally render `streamingContent`
- Optimistic UI: user message appears immediately before response starts

Assistant messages render YouTube links as clickable thumbnail cards below the message (`components/chat/VideoLinkCards.tsx`): video IDs are extracted from the content, thumbnails come from `img.youtube.com` (no API key), and titles are resolved through `/api/youtube-meta` (server-side oEmbed proxy with in-memory cache — YouTube's oEmbed endpoint has no CORS). Bare YouTube URLs in the text are displayed as a compact "Voir la vidéo" label. Markdown images in assistant messages render inline (knowledge-base photos); user-bubble attachments render as thumbnails/file chips via `parseAttachments`.

Chat UX: auto-scroll only sticks while the user is at the bottom (scroll up to read during streaming, "Revenir en bas" floating button); the send button becomes a Stop button during generation (AbortController → partial response kept client-side and saved server-side).

**Gotcha**: `pdf-parse` must stay in `serverExternalPackages` (next.config.ts) — bundled, its text extraction fails silently in production builds (PDF uploads then behave like scanned PDFs).

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

**Always read env vars through `lib/env.ts`** (`SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `serverEnv(name)`), never `process.env` directly. Values pasted into the Vercel dashboard routinely carry a trailing newline: harmless in an HTTP header, fatal when the value is used to build or compare a URL. Every production var of this project had one — `${NEXT_PUBLIC_SUPABASE_URL}/storage/...` no longer matched attachment URLs, so **no image or PDF was ever forwarded to the model in production** while the code looked correct. `lib/env.ts` trims at read time (the `NEXT_PUBLIC_*` constants use static access so Next.js still inlines them into the browser bundle).

## Planning Documents

Detailed requirements in `_bmad-output/planning-artifacts/`:
- `prd.md` — 38 functional + 16 non-functional requirements
- `architecture.md` — Full architecture decisions and patterns
- `epics.md` — 8 epics, 19 stories with Given/When/Then acceptance criteria
