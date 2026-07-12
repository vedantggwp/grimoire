export interface SearchResult {
  readonly url: string;
  readonly title: string;
  readonly snippet: string;
}

export type SearchErrorCode = 'blocked' | 'http' | 'network';

export interface SearchWebError {
  readonly code: SearchErrorCode;
  readonly message: string;
  readonly status?: number;
}

export type SearchWebResult =
  | { readonly ok: true; readonly results: readonly SearchResult[] }
  | { readonly ok: false; readonly results: readonly []; readonly error: SearchWebError };

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
      if (!Number.isFinite(codePoint)) return entity;
      if (codePoint > 0x10FFFF || (codePoint >= 0xD800 && codePoint <= 0xDFFF)) return '\uFFFD';
      return String.fromCodePoint(codePoint);
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

function isHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function unwrapDuckDuckGoUrl(href: string): string | null {
  const absolute = href.startsWith('//') ? `https:${href}` : href;
  try {
    const parsed = new URL(absolute, 'https://duckduckgo.com');
    if (parsed.hostname.endsWith('duckduckgo.com') && parsed.pathname === '/l/') {
      const wrapped = parsed.searchParams.get('uddg');
      if (!wrapped) return null;
      const unwrapped = decodeURIComponent(wrapped);
      return isHttpUrl(unwrapped) ? unwrapped : null;
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

function isDuckDuckGoBlockedPage(html: string): boolean {
  const withoutAnchors = !/<a\b[^>]*\bclass=(["'])[^"']*\bresult__a\b[^"']*\1/i.test(html);
  if (!withoutAnchors) return false;
  return /anomaly|captcha|automated|unusual traffic|verify you are human|bots use duckduckgo|not a robot/i.test(html);
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

export async function searchWeb(query: string, options: SearchWebOptions = {}): Promise<SearchWebResult> {
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
    if (!response.ok) {
      return {
        ok: false,
        results: [],
        error: {
          code: 'http',
          status: response.status,
          message: `DuckDuckGo returned HTTP ${response.status}`,
        },
      };
    }
    const html = await response.text();
    if (isDuckDuckGoBlockedPage(html)) {
      return {
        ok: false,
        results: [],
        error: {
          code: 'blocked',
          message: 'DuckDuckGo returned an anomaly or CAPTCHA page',
        },
      };
    }
    return { ok: true, results: parseDuckDuckGoHtml(html, maxResults) };
  } catch (error) {
    return {
      ok: false,
      results: [],
      error: {
        code: 'network',
        message: error instanceof Error ? error.message : String(error),
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}
