"use client";

import { useEffect, useState } from "react";
import { Play } from "lucide-react";

// Vignettes cliquables des vidéos YouTube citées dans une réponse de l'IA,
// affichées sous le message. Les liens de la base de connaissances TGA sont
// tous des liens YouTube (youtu.be / watch / shorts).

interface VideoInfo {
  id: string;
  url: string;
}

// Les IDs YouTube font exactement 11 caractères — un lien encore incomplet
// pendant le streaming ne matche donc pas.
const YOUTUBE_RE =
  /https?:\/\/(?:www\.)?(?:youtu\.be\/([\w-]{11})|youtube\.com\/(?:watch\?[^\s<>")\]]*?v=([\w-]{11})|shorts\/([\w-]{11})))/g;

export function extractYouTubeVideos(content: string): VideoInfo[] {
  const seen = new Set<string>();
  const videos: VideoInfo[] = [];
  for (const match of content.matchAll(YOUTUBE_RE)) {
    const id = match[1] || match[2] || match[3];
    if (!id || seen.has(id)) continue;
    seen.add(id);
    videos.push({ id, url: `https://www.youtube.com/watch?v=${id}` });
  }
  return videos;
}

// Cache module-level : les titres déjà résolus ne sont pas re-demandés quand
// on rouvre une conversation ou pendant les re-rendus du streaming.
const titleCache = new Map<string, string | null>();

export function VideoLinkCards({ content }: { content: string }) {
  const videos = extractYouTubeVideos(content);
  const idsKey = videos.map((v) => v.id).join(",");
  const [titles, setTitles] = useState<Record<string, string | null>>({});

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",") : [];
    if (ids.length === 0) return;

    const applyFromCache = () =>
      setTitles(
        Object.fromEntries(ids.map((id) => [id, titleCache.get(id) ?? null]))
      );

    const missing = ids.filter((id) => !titleCache.has(id));
    if (missing.length === 0) {
      applyFromCache();
      return;
    }

    let cancelled = false;
    fetch(`/api/youtube-meta?ids=${missing.join(",")}`)
      .then((res) => res.json())
      .then((json) => {
        if (json?.success && json.data) {
          for (const [id, title] of Object.entries(json.data)) {
            titleCache.set(id, (title as string | null) ?? null);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) applyFromCache();
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  if (videos.length === 0) return null;

  return (
    <div className="not-prose mt-3 border-t border-border/60 pt-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground">
        Vidéos de la méthode
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {videos.map((video) => (
          <a
            key={video.id}
            href={video.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block overflow-hidden rounded-lg border bg-background transition-shadow hover:shadow-md"
          >
            <div className="relative aspect-video">
              {/* Miniature publique YouTube — aucune clé API nécessaire */}
              <img
                src={`https://img.youtube.com/vi/${video.id}/hqdefault.jpg`}
                alt={titles[video.id] ?? "Vidéo YouTube"}
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/10">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-black/70 transition-transform group-hover:scale-110">
                  <Play className="h-4 w-4 translate-x-[1px] fill-white text-white" />
                </span>
              </div>
            </div>
            {titles[video.id] && (
              <p className="line-clamp-2 px-2 py-1.5 text-xs leading-snug">
                {titles[video.id]}
              </p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
