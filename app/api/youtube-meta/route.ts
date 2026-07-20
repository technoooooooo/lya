import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Titres des vidéos YouTube via oEmbed, proxifié côté serveur : l'endpoint
// oEmbed de YouTube n'expose pas de CORS, le navigateur ne peut pas
// l'appeler directement. Cache mémoire par instance — un titre ne change pas.
const titleCache = new Map<string, string | null>();

const MAX_IDS = 12;
// Les IDs de vidéos YouTube font exactement 11 caractères.
const ID_RE = /^[\w-]{11}$/;

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { success: false, error: { message: "Non authentifié", code: "UNAUTHORIZED" } },
      { status: 401 }
    );
  }

  const idsParam = new URL(request.url).searchParams.get("ids") ?? "";
  const ids = [
    ...new Set(idsParam.split(",").filter((id) => ID_RE.test(id))),
  ].slice(0, MAX_IDS);

  const entries = await Promise.all(
    ids.map(async (id): Promise<readonly [string, string | null]> => {
      if (titleCache.has(id)) return [id, titleCache.get(id) ?? null];
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://youtu.be/${id}`)}&format=json`,
          { signal: AbortSignal.timeout(3000) }
        );
        // 404 = vidéo supprimée/privée : on cache le null. Erreur réseau ou
        // timeout : on ne cache pas, pour retenter plus tard.
        const title = res.ok ? ((await res.json()).title ?? null) : null;
        titleCache.set(id, title);
        return [id, title];
      } catch {
        return [id, null];
      }
    })
  );

  return NextResponse.json({
    success: true,
    data: Object.fromEntries(entries),
  });
}
