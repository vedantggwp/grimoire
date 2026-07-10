export type FetchFidelity = 'full' | 'extract' | 'failed';

export type FetchMethod =
  | 'md-variant'
  | 'llms-txt'
  | 'content-negotiation'
  | 'github-raw'
  | 'github-readme'
  | 'html-extract'
  | 'failed';

export interface FetchAttempt {
  readonly method: FetchMethod;
  readonly url: string;
  readonly status?: number;
  readonly accepted: boolean;
  readonly error?: string;
}

export interface FetchSourceResult {
  readonly text: string;
  readonly fidelity: FetchFidelity;
  readonly method: FetchMethod;
  readonly meta: {
    readonly url: string;
    readonly finalUrl?: string;
    readonly status?: number;
    readonly error?: string;
    readonly attempts: readonly FetchAttempt[];
  };
}

export interface FetchSourceOptions {
  readonly fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
  readonly timeoutMs?: number;
  readonly maxBytes?: number;
  readonly redirectLimit?: number;
}

interface FetchTextResult {
  readonly url: string;
  readonly status: number;
  readonly ok: boolean;
  readonly contentType: string;
  readonly text: string;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024;
const DEFAULT_REDIRECT_LIMIT = 5;
const USER_AGENT = 'grimoire-research/0.1 (+https://github.com/vedantggwp/grimoire)';

function stripTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

function isHtmlLike(text: string, contentType: string): boolean {
  if (/\bhtml\b/i.test(contentType)) return true;
  return /^\s*(?:<!doctype\s+html|<html[\s>])/i.test(text);
}

function hasMarkdownHeading(text: string): boolean {
  return /^#{1,6}\s+\S+/m.test(text);
}

function acceptsMarkdown(text: string, contentType: string): boolean {
  return text.trim().length > 500 && !isHtmlLike(text, contentType) && hasMarkdownHeading(text);
}

function acceptsVerbatimText(text: string, contentType: string): boolean {
  return text.trim().length > 0 && !isHtmlLike(text, contentType);
}

function docsVariantUrls(url: string): readonly { method: FetchMethod; url: string }[] {
  const urls: { method: FetchMethod; url: string }[] = [
    { method: 'md-variant', url: `${stripTrailingSlash(url)}.md` },
  ];

  try {
    const parsed = new URL(url);
    const docsLike = /\bdocs?\b/i.test(parsed.hostname) || /\/docs?\//i.test(parsed.pathname);
    if (docsLike) {
      urls.push(
        { method: 'llms-txt', url: new URL('/llms.txt', parsed.origin).toString() },
        { method: 'llms-txt', url: new URL('/llms-full.txt', parsed.origin).toString() },
      );
    }
  } catch {
    // Let the normal fetch path report the invalid URL.
  }

  return [...new Map(urls.map(candidate => [candidate.url, candidate])).values()];
}

function githubVerbatimUrls(url: string): readonly { method: FetchMethod; url: string }[] {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return [];
  }

  if (parsed.hostname !== 'github.com') return [];

  const parts = parsed.pathname.split('/').filter(Boolean);
  const [owner, repo, marker, branch, ...pathParts] = parts;
  if (!owner || !repo) return [];

  if (marker === 'blob' && branch && pathParts.length > 0) {
    return [{
      method: 'github-raw',
      url: `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${pathParts.join('/')}`,
    }];
  }

  if (parts.length === 2) {
    return [{
      method: 'github-readme',
      url: `https://api.github.com/repos/${owner}/${repo}/readme`,
    }];
  }

  return [];
}

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
  return decodeEntities(html.replace(/<[^>]+>/g, ' '));
}

function cleanText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map(line => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function contentScore(html: string): number {
  const textLength = stripTags(html).replace(/\s+/g, ' ').trim().length;
  const linkTextLength = [...html.matchAll(/<a\b[\s\S]*?<\/a>/gi)]
    .reduce((sum, match) => sum + stripTags(match[0]).length, 0);
  return textLength - linkTextLength * 0.5;
}

function firstTagInner(html: string, tag: string): string | null {
  const match = html.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return match?.[1] ?? null;
}

function chooseContentBlock(html: string): string {
  const direct = firstTagInner(html, 'main') ?? firstTagInner(html, 'article');
  if (direct) return direct;

  const candidates = [...html.matchAll(/<(section|div)\b[^>]*>[\s\S]*?<\/\1>/gi)];
  if (candidates.length === 0) return html;

  return candidates
    .map(match => ({ html: match[0], score: contentScore(match[0]) }))
    .sort((a, b) => b.score - a.score)[0]?.html ?? html;
}

export function extractMarkdownFromHtml(html: string): string {
  let body = chooseContentBlock(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|canvas)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(nav|header|footer|aside|form|button)\b[\s\S]*?<\/\1>/gi, ' ');

  body = body.replace(/<pre\b[^>]*>([\s\S]*?)<\/pre>/gi, (_, code: string) => {
    const cleaned = stripTags(code).replace(/\n{3,}/g, '\n\n').trim();
    return cleaned ? `\n\n\`\`\`\n${cleaned}\n\`\`\`\n\n` : '\n\n';
  });

  body = body.replace(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level: string, text: string) => {
    const heading = stripTags(text).replace(/\s+/g, ' ').trim();
    return heading ? `\n\n${'#'.repeat(Number(level))} ${heading}\n\n` : '\n\n';
  });

  body = body.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (whole: string, attrs: string, text: string) => {
    const label = stripTags(text).replace(/\s+/g, ' ').trim();
    if (!label) return '';
    const href = attrs.match(/\bhref=(["'])(.*?)\1/i)?.[2];
    if (!href || href.startsWith('#') || /^javascript:/i.test(href)) return label;
    return `[${label}](${decodeEntities(href)})`;
  });

  body = body
    .replace(/<li\b[^>]*>/gi, '\n- ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|section|article|main|blockquote|ul|ol)>/gi, '\n\n')
    .replace(/<(p|div|section|article|main|blockquote|ul|ol)\b[^>]*>/gi, '\n\n');

  return cleanText(stripTags(body));
}

async function readResponseText(response: Response, maxBytes: number): Promise<string> {
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new Error(`response exceeded max size (${contentLength} > ${maxBytes})`);
  }

  if (!response.body) {
    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > maxBytes) {
      throw new Error(`response exceeded max size (${buffer.byteLength} > ${maxBytes})`);
    }
    return new TextDecoder().decode(buffer);
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    size += value.byteLength;
    if (size > maxBytes) {
      reader.releaseLock();
      throw new Error(`response exceeded max size (${size} > ${maxBytes})`);
    }
    chunks.push(value);
  }

  const merged = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(merged);
}

async function fetchText(
  url: string,
  init: RequestInit,
  opts: Required<Pick<FetchSourceOptions, 'fetchImpl' | 'timeoutMs' | 'maxBytes' | 'redirectLimit'>>,
): Promise<FetchTextResult> {
  let currentUrl = url;
  for (let redirects = 0; redirects <= opts.redirectLimit; redirects += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      const response = await opts.fetchImpl(currentUrl, {
        ...init,
        redirect: 'manual',
        signal: controller.signal,
      });
      const location = response.headers.get('location');
      if (response.status >= 300 && response.status < 400 && location) {
        currentUrl = new URL(location, currentUrl).toString();
        continue;
      }
      const text = await readResponseText(response, opts.maxBytes);
      return {
        url: response.url || currentUrl,
        status: response.status,
        ok: response.ok,
        contentType: response.headers.get('content-type') ?? '',
        text,
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`redirect limit exceeded (${opts.redirectLimit})`);
}

function attemptHeaders(extra?: HeadersInit): HeadersInit {
  return {
    'user-agent': USER_AGENT,
    ...extra,
  };
}

export async function fetchSource(url: string, options: FetchSourceOptions = {}): Promise<FetchSourceResult> {
  const opts = {
    fetchImpl: options.fetchImpl ?? fetch,
    timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    maxBytes: options.maxBytes ?? DEFAULT_MAX_BYTES,
    redirectLimit: options.redirectLimit ?? DEFAULT_REDIRECT_LIMIT,
  };
  const attempts: FetchAttempt[] = [];

  async function tryFull(
    method: FetchMethod,
    candidateUrl: string,
    headers: HeadersInit,
    accept: (text: string, contentType: string) => boolean,
  ): Promise<FetchSourceResult | null> {
    try {
      const response = await fetchText(candidateUrl, { headers }, opts);
      const accepted = response.ok && accept(response.text, response.contentType);
      attempts.push({ method, url: candidateUrl, status: response.status, accepted });
      if (!accepted) return null;
      return {
        text: response.text.trim(),
        fidelity: 'full',
        method,
        meta: { url, finalUrl: response.url, status: response.status, attempts },
      };
    } catch (error) {
      attempts.push({
        method,
        url: candidateUrl,
        accepted: false,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  for (const candidate of docsVariantUrls(url)) {
    const result = await tryFull(candidate.method, candidate.url, attemptHeaders({
      accept: 'text/markdown, text/plain;q=0.9, */*;q=0.1',
    }), acceptsMarkdown);
    if (result) return result;
  }

  const negotiated = await tryFull('content-negotiation', url, attemptHeaders({
    accept: 'text/markdown, text/plain;q=0.9',
  }), acceptsMarkdown);
  if (negotiated) return negotiated;

  for (const candidate of githubVerbatimUrls(url)) {
    const headers = candidate.method === 'github-readme'
      ? attemptHeaders({ accept: 'application/vnd.github.raw,text/markdown,text/plain;q=0.9' })
      : attemptHeaders({ accept: 'text/markdown, text/plain, */*;q=0.1' });
    const result = await tryFull(candidate.method, candidate.url, headers, acceptsVerbatimText);
    if (result) return result;
  }

  try {
    const response = await fetchText(url, { headers: attemptHeaders({ accept: 'text/html,application/xhtml+xml' }) }, opts);
    const markdown = extractMarkdownFromHtml(response.text);
    const accepted = response.ok && markdown.length >= 500;
    attempts.push({ method: 'html-extract', url, status: response.status, accepted });
    if (accepted) {
      return {
        text: markdown,
        fidelity: 'extract',
        method: 'html-extract',
        meta: { url, finalUrl: response.url, status: response.status, attempts },
      };
    }
  } catch (error) {
    attempts.push({
      method: 'html-extract',
      url,
      accepted: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return {
    text: '',
    fidelity: 'failed',
    method: 'failed',
    meta: {
      url,
      error: attempts.at(-1)?.error ?? 'no acceptable verbatim or extract capture',
      attempts,
    },
  };
}
