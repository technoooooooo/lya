import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/env";

// No-op lock to avoid Navigator Lock API hanging in certain environments.
// Auth verification is handled server-side by the middleware.
const noopLock = async (
  _name: string,
  _acquireTimeout: number,
  fn: (...args: unknown[]) => Promise<unknown>,
) => {
  return await fn();
};

export function createClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY,
    {
      auth: {
        lock: noopLock,
      } as Record<string, unknown>,
    },
  );
}
