const VIMEO_PATTERNS = [
  /(?:https?:\/\/)?(?:www\.)?vimeo\.com\/(\d+)/,
  /(?:https?:\/\/)?player\.vimeo\.com\/video\/(\d+)/,
  /(?:https?:\/\/)?vimeo\.com\/channels\/[^/]+\/(\d+)/,
  /(?:https?:\/\/)?vimeo\.com\/groups\/[^/]+\/videos\/(\d+)/,
  /(?:https?:\/\/)?vimeo\.com\/album\/[^/]+\/video\/(\d+)/,
  /(?:https?:\/\/)?vimeo\.com\/[^/]+\/review\/(\d+)/,
];

export function extractVimeoId(url: string): string | null {
  for (const pattern of VIMEO_PATTERNS) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function normalizeVimeoUrl(url: string): string {
  if (!url.trim()) return url;
  const id = extractVimeoId(url);
  if (!id) return url;
  return `https://player.vimeo.com/video/${id}`;
}

export function isVimeoUrl(url: string): boolean {
  return extractVimeoId(url) !== null;
}

export function vimeoEmbedUrl(id: string): string {
  return `https://player.vimeo.com/video/${id}?title=0&byline=0&portrait=0&dnt=1`;
}
