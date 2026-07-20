export type VideoProvider = "youtube" | "vimeo" | "direct";

export type VideoEmbed = {
  provider: VideoProvider;
  embedUrl: string;
  canonicalUrl: string;
  id?: string;
};

const VIMEO_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/,
  /(?:https?:\/\/)?player\.vimeo\.com\/video\/(\d+)/,
  /(?:https?:\/\/)?vimeo\.com\/channels\/[^/]+\/(\d+)/,
  /(?:https?:\/\/)?vimeo\.com\/groups\/[^/]+\/videos\/(\d+)/,
  /(?:https?:\/\/)?vimeo\.com\/album\/[^/]+\/video\/(\d+)/,
  /(?:https?:\/\/)?vimeo\.com\/[^/]+\/review\/(\d+)/,
];

const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      return id && YOUTUBE_ID_PATTERN.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const watchId = parsed.searchParams.get("v");
      if (watchId && YOUTUBE_ID_PATTERN.test(watchId)) return watchId;

      const [, route, id] = parsed.pathname.split("/");
      if ((route === "embed" || route === "shorts" || route === "live") && YOUTUBE_ID_PATTERN.test(id)) {
        return id;
      }
    }
  } catch {
    const match = trimmed.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match?.[1] ?? null;
  }

  return null;
}

export function extractVimeoId(url: string): string | null {
  for (const pattern of VIMEO_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
}

export function vimeoEmbedUrl(id: string): string {
  return `https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0&dnt=1&transparent=0&fullscreen=1`;
}

export function parseVideoUrl(url: string | null | undefined): VideoEmbed | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();

  const youtubeId = extractYouTubeId(trimmed);
  if (youtubeId) {
    return {
      provider: "youtube",
      id: youtubeId,
      embedUrl: youtubeEmbedUrl(youtubeId),
      canonicalUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
    };
  }

  const vimeoId = extractVimeoId(trimmed);
  if (vimeoId) {
    return {
      provider: "vimeo",
      id: vimeoId,
      embedUrl: vimeoEmbedUrl(vimeoId),
      canonicalUrl: `https://player.vimeo.com/video/${vimeoId}`,
    };
  }

  return { provider: "direct", embedUrl: trimmed, canonicalUrl: trimmed };
}

export function normalizeVideoUrl(url: string): string {
  return parseVideoUrl(url)?.canonicalUrl ?? url;
}

export function isEmbeddableVideoUrl(url: string): boolean {
  const video = parseVideoUrl(url);
  return video?.provider === "youtube" || video?.provider === "vimeo";
}
