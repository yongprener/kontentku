const TOKOPEDIA_CHALLENGE_PATTERNS = [
  /captcha/i,
  /recaptcha/i,
  /hcaptcha/i,
  /access denied/i,
  /security check/i,
  /verify (?:you are )?human/i,
  /unusual traffic/i,
  /robot check/i,
  /cloudflare/i,
  /ddos/i,
  /mohon tunggu sebentar/i,
  /permintaan anda tidak dapat diproses/i,
  /sistem keamanan/i,
  /akses diblokir/i,
];

const HTML_ENTITY_MAP: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

function decodeHtmlEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_match, entity: string) => {
    const normalized = entity.toLowerCase();

    if (normalized.startsWith('#x')) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);

      return Number.isNaN(codePoint) ? _match : String.fromCodePoint(codePoint);
    }

    if (normalized.startsWith('#')) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);

      return Number.isNaN(codePoint) ? _match : String.fromCodePoint(codePoint);
    }

    return HTML_ENTITY_MAP[normalized] ?? _match;
  });
}

function stripHtml(value: string): string {
  return value.replace(/<[^>]+>/g, ' ');
}

function normalizeText(value: string): string {
  return decodeHtmlEntities(stripHtml(value)).replace(/\s+/g, ' ').trim();
}

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const attributePattern = /([\w:-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/g;
  let match: RegExpExecArray | null;

  while ((match = attributePattern.exec(tag)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? '';

    attributes[key] = value;
  }

  return attributes;
}

function collectMetaValues(html: string): Record<string, string[]> {
  const values: Record<string, string[]> = {};
  const metaPattern = /<meta\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = metaPattern.exec(html)) !== null) {
    const attributes = parseAttributes(match[0]);
    const content = attributes.content?.trim();
    const key = (attributes.property ?? attributes.name ?? attributes.itemprop)?.trim().toLowerCase();

    if (!key || !content) {
      continue;
    }

    values[key] ??= [];
    values[key].push(content);
  }

  return values;
}

function parsePossiblyEncodedJson(value: string): unknown | null {
  const candidates = [value];

  try {
    candidates.push(decodeURIComponent(value));
  } catch {
    // ignore malformed URI sequences and keep the raw value
  }

  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      continue;
    }
  }

  return null;
}

function readTagText(html: string, tagName: string): string | null {
  const pattern = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
  const match = pattern.exec(html);

  return match ? normalizeText(match[1]) : null;
}

function cleanProductTitle(value: string): string {
  return normalizeText(value).replace(/\s*[|•-]\s*tokopedia(?:\.com)?\s*$/i, '').trim();
}

function uniqueStrings(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const value of values) {
    const normalized = value.trim();

    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    unique.push(normalized);
  }

  return unique;
}

function isProductType(typeValue: unknown): boolean {
  if (typeof typeValue === 'string') {
    return typeValue.toLowerCase() === 'product';
  }

  if (Array.isArray(typeValue)) {
    return typeValue.some((item) => typeof item === 'string' && item.toLowerCase() === 'product');
  }

  return false;
}

function findJsonLdProductNode(value: unknown, visited = new Set<unknown>()): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || visited.has(value)) {
    return null;
  }

  visited.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findJsonLdProductNode(item, visited);

      if (found) {
        return found;
      }
    }

    return null;
  }

  const record = value as Record<string, unknown>;

  if (isProductType(record['@type'])) {
    return record;
  }

  for (const nestedValue of Object.values(record)) {
    const found = findJsonLdProductNode(nestedValue, visited);

    if (found) {
      return found;
    }
  }

  return null;
}

function extractJsonLdProduct(html: string): Record<string, unknown> | null {
  const jsonLdPattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;

  while ((match = jsonLdPattern.exec(html)) !== null) {
    const rawValue = match[1]
      .replace(/^[\s\n\r]*<!--/, '')
      .replace(/-->[\s\n\r]*$/, '')
      .replace(/^\s*<!\[CDATA\[/, '')
      .replace(/\]\]>\s*$/, '')
      .trim();

    if (rawValue.length === 0) {
      continue;
    }

    try {
      const parsed = JSON.parse(rawValue) as unknown;
      const product = findJsonLdProductNode(parsed);

      if (product) {
        return product;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function collectImageCandidatesFromJsonLd(value: unknown): string[] {
  const candidates: string[] = [];

  const visit = (node: unknown): void => {
    if (node === null || node === undefined) {
      return;
    }

    if (typeof node === 'string') {
      candidates.push(node);
      return;
    }

    if (Array.isArray(node)) {
      for (const item of node) {
        visit(item);
      }

      return;
    }

    if (typeof node === 'object') {
      const record = node as Record<string, unknown>;

      for (const key of ['url', 'contentUrl', 'image', 'thumbnailUrl', 'imageUrl']) {
        if (key in record) {
          visit(record[key]);
        }
      }
    }
  };

  visit(value);

  return candidates;
}

function collectStringCandidatesFromObject(value: unknown, keys: readonly string[]): string[] {
  const candidates: string[] = [];
  const visited = new Set<unknown>();

  const visit = (node: unknown): void => {
    if (node === null || node === undefined || visited.has(node)) {
      return;
    }

    if (typeof node === 'string') {
      candidates.push(node);
      return;
    }

    if (Array.isArray(node)) {
      visited.add(node);

      for (const item of node) {
        visit(item);
      }

      return;
    }

    if (typeof node === 'object') {
      visited.add(node);
      const record = node as Record<string, unknown>;

      for (const key of keys) {
        if (key in record) {
          visit(record[key]);
        }
      }
    }
  };

  visit(value);

  return candidates;
}

function resolveAbsoluteUrl(candidate: string, baseUrl: string): string | null {
  const trimmed = candidate.trim();

  if (trimmed.length === 0) {
    return null;
  }

  try {
    return new URL(trimmed, baseUrl).toString();
  } catch {
    return null;
  }
}

export function extractTokopediaPreviewMetadata(finalUrl: string): { title: string | null; mediaUrls: string[] } {
  try {
    const url = new URL(finalUrl);
    const rawOgInfo = url.searchParams.get('og_info');

    if (!rawOgInfo) {
      return { title: null, mediaUrls: [] };
    }

    const parsed = parsePossiblyEncodedJson(rawOgInfo);

    if (parsed === null || typeof parsed !== 'object') {
      return { title: null, mediaUrls: [] };
    }

    const titleCandidates = uniqueStrings(
      collectStringCandidatesFromObject(parsed, ['title', 'name', 'productTitle', 'headline', 'displayName']),
    );
    const imageCandidates = uniqueStrings(collectImageCandidatesFromJsonLd(parsed));

    return {
      title: titleCandidates.map(cleanProductTitle).find((value) => value.length > 0) ?? null,
      mediaUrls: uniqueStrings(
        imageCandidates
          .map((candidate) => resolveAbsoluteUrl(candidate, finalUrl))
          .filter((candidate): candidate is string => candidate !== null),
      ),
    };
  } catch {
    return { title: null, mediaUrls: [] };
  }
}

export function detectTokopediaBlockedPage(html: string, responseStatus: number): { blocked: boolean; message?: string } {
  if ([401, 403, 429].includes(responseStatus)) {
    return {
      blocked: true,
      message: `Tokopedia responded with HTTP ${responseStatus}.`,
    };
  }

  const text = normalizeText(html).toLowerCase();

  if (TOKOPEDIA_CHALLENGE_PATTERNS.some((pattern) => pattern.test(text))) {
    return {
      blocked: true,
      message: 'Tokopedia challenge or security page detected.',
    };
  }

  return { blocked: false };
}

export function extractTokopediaProductData(
  html: string,
  baseUrl: string,
): { title: string | null; description: string | null; mediaUrls: string[] } {
  const meta = collectMetaValues(html);
  const productJsonLd = extractJsonLdProduct(html);

  const titleCandidates = uniqueStrings([
    ...(productJsonLd && typeof productJsonLd.name === 'string' ? [productJsonLd.name] : []),
    ...(meta['og:title'] ?? []),
    ...(meta['twitter:title'] ?? []),
    readTagText(html, 'title') ?? '',
    readTagText(html, 'h1') ?? '',
  ]);

  const descriptionCandidates = uniqueStrings([
    ...(productJsonLd && typeof productJsonLd.description === 'string' ? [productJsonLd.description] : []),
    ...(meta['og:description'] ?? []),
    ...(meta['twitter:description'] ?? []),
    ...(meta.description ?? []),
  ]);

  const imageCandidates = uniqueStrings([
    ...collectImageCandidatesFromJsonLd(productJsonLd),
    ...(meta['og:image'] ?? []),
    ...(meta['og:image:url'] ?? []),
    ...(meta['twitter:image'] ?? []),
    ...(meta['twitter:image:src'] ?? []),
  ]);

  const title = titleCandidates.map(cleanProductTitle).find((value) => value.length > 0) ?? null;
  const description = descriptionCandidates.map(normalizeText).find((value) => value.length > 0) ?? null;
  const mediaUrls = uniqueStrings(
    imageCandidates
      .map((candidate) => resolveAbsoluteUrl(candidate, baseUrl))
      .filter((candidate): candidate is string => candidate !== null),
  );

  return {
    title,
    description,
    mediaUrls,
  };
}
