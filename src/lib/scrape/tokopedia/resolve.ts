import type { TokopediaResolvedPage } from './types';

export const TOKOPEDIA_BROWSER_HEADERS: HeadersInit = {
  'user-agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'accept-language': 'id-ID,id;q=0.9,en;q=0.8',
  'cache-control': 'no-cache',
  pragma: 'no-cache',
  'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", ";Not A Brand";v="99"',
  'sec-ch-ua-mobile': '?0',
  'sec-ch-ua-platform': '"Windows"',
  'sec-fetch-dest': 'document',
  'sec-fetch-mode': 'navigate',
  'sec-fetch-site': 'none',
  'sec-fetch-user': '?1',
  'upgrade-insecure-requests': '1',
};

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function normalizeTokopediaUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();

  if (trimmed.length === 0) {
    throw new Error('Tokopedia URL is required.');
  }

  return isAbsoluteHttpUrl(trimmed) ? trimmed : `https://${trimmed}`;
}

function resolveRedirectLocation(currentUrl: string, location: string): string {
  return new URL(location, currentUrl).toString();
}

async function fetchWithTimeout(
  fetchImpl: typeof fetch,
  url: string,
  timeoutMs: number,
): Promise<Response> {
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    return fetchImpl(url, {
      headers: TOKOPEDIA_BROWSER_HEADERS,
      redirect: 'manual',
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetchImpl(url, {
      headers: TOKOPEDIA_BROWSER_HEADERS,
      redirect: 'manual',
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function resolveTokopediaProductPage(
  rawUrl: string,
  options: {
    fetchImpl?: typeof fetch;
    timeoutMs?: number;
    maxRedirects?: number;
  } = {},
): Promise<TokopediaResolvedPage> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxRedirects = options.maxRedirects ?? 5;

  const initialUrl = normalizeTokopediaUrl(rawUrl);
  let currentUrl = initialUrl;
  const redirects: string[] = [];

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const response = await fetchWithTimeout(fetchImpl, currentUrl, timeoutMs);

    if (REDIRECT_STATUSES.has(response.status)) {
      const location = response.headers.get('location');

      if (!location) {
        throw new Error(`Tokopedia redirect response from ${currentUrl} did not include a Location header.`);
      }

      const nextUrl = resolveRedirectLocation(currentUrl, location);

      if (nextUrl === currentUrl || redirects.includes(nextUrl)) {
        throw new Error('Tokopedia redirect loop detected.');
      }

      redirects.push(nextUrl);
      currentUrl = nextUrl;
      continue;
    }

    const html = await response.text();

    return {
      initialUrl,
      finalUrl: currentUrl,
      html,
      response,
      redirects,
    };
  }

  throw new Error('Tokopedia redirect limit exceeded.');
}
