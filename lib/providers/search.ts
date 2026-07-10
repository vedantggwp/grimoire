export interface SearchResult {
  readonly url: string;
  readonly title: string;
  readonly snippet: string;
}

export interface SearchWebOptions {
  readonly fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
  readonly timeoutMs?: number;
  readonly maxResults?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_RESULTS = 10;
const USER_AGENT = 'grimoire-research/0.1 (+https://github.com/vedantggwp/grimoire)';

function decodeEntities(text: string): string {
  const named: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, body: string) => {
    if (body[0] === '#') {
      const codePoint = body[1]?.toLowerCase() === 'x'
        ? Number.parseInt(body.slice(2), 16)
        : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : entity;
    }
    return named[body.toLowerCase()] ?? entity;
  });
}

function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

function attr(attrs: string, name: string): string | null {
  const match = attrs.match(new RegExp(`\\b${name}=(["'])(.*?)\\1`, 'i'));
  return match ? decodeEntities(match[2]) : null;
}

function classContains(attrs: string, name: string): boolean {
  const className = attr(attrs, 'class');
  return className?.split(/\s+/).includes(name) ?? false;
}

function unwrapDuckDuckGoUrl(href: string): string | null {
  const absolute = href.startsWith('//') ? `https:${href}` : href;
  try {
    const parsed = new URL(absolute, 'https://duckduckgo.com');
    if (parsed.hostname.endsWith('duckduckgo.com') && parsed.pathname === '/l/') {
      const wrapped = parsed.searchParams.get('uddg');
      return wrapped ? decodeURIComponent(wrapped) : null;
    }
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.toString();
  } catch {
    return null;
  }
  return null;
}

function normalizeResultUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    parsed.hostname = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const serialized = parsed.toString();
    return serialized.endsWith('/') && !parsed.search ? serialized.slice(0, -1) : serialized;
  } catch {
    return url.trim();
  }
}

function snippetFromSegment(segment: string): string {
  const tag = [...segment.matchAll(/<(a|div|td)\b([^>]*)>([\s\S]*?)<\/\1>/gi)]
    .find(match => classContains(match[2], 'result__snippet'));
  return tag ? stripTags(tag[3]) : '';
}

export function parseDuckDuckGoHtml(html: string, maxResults = DEFAULT_MAX_RESULTS): SearchResult[] {
  const anchors = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
    .filter(match => classContains(match[1], 'result__a'))
    .map(match => ({
      attrs: match[1],
      body: match[2],
      index: match.index ?? 0,
    }));

  const results: SearchResult[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < anchors.length && results.length < maxResults; i += 1) {
    const href = attr(anchors[i].attrs, 'href');
    const url = href ? unwrapDuckDuckGoUrl(href) : null;
    const title = stripTags(anchors[i].body);
    if (!url || !title) continue;

    const dedupeKey = normalizeResultUrl(url);
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const nextIndex = anchors[i + 1]?.index ?? html.length;
    const segment = html.slice(anchors[i].index, nextIndex);
    results.push({ url, title, snippet: snippetFromSegment(segment) });
  }

  return results;
}

export async function searchWeb(query: string, options: SearchWebOptions = {}): Promise<SearchResult[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxResults = options.maxResults ?? DEFAULT_MAX_RESULTS;
  const endpoint = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(endpoint, {
      headers: {
        accept: 'text/html,application/xhtml+xml',
        'user-agent': USER_AGENT,
      },
      signal: controller.signal,
    });
    if (!response.ok) return [];
    return parseDuckDuckGoHtml(await response.text(), maxResults);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}
