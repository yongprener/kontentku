import type { DraftProductSnapshot } from '@/lib/domain/contracts';

import { persistScrapedDraftSnapshot } from '@/lib/review-flow-store';

import { detectTokopediaBlockedPage, extractTokopediaPreviewMetadata, extractTokopediaProductData } from './extract';
import { normalizeTokopediaUrl, resolveTokopediaProductPage } from './resolve';
import type { TokopediaScrapeFailure, TokopediaScrapeOptions, TokopediaScrapeResult } from './types';

const DEFAULT_PROJECT_ID = 'project_1';
const LIMITED_PREVIEW_DESCRIPTION =
  'Tokopedia preview metadata only; full product details were unavailable because the page was protected by a security check.';
const TOKOPEDIA_CHALLENGE_TEXT_PATTERN =
  /captcha|recaptcha|hcaptcha|access denied|security check|verify (?:you are )?human|unusual traffic|robot check|cloudflare|ddos|mohon tunggu sebentar|permintaan anda tidak dapat diproses|sistem keamanan|akses diblokir/i;

function getTokopediaHostSegment(): string {
  return 'tokopedia';
}

function buildSlug(input: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
}

function buildSnapshotId(normalizedUrl: string): string {
  return `snapshot-${getTokopediaHostSegment()}-${buildSlug(normalizedUrl).slice(0, 6)}`;
}

function buildMediaAssets(snapshotId: string, mediaUrls: readonly string[]): DraftProductSnapshot['media'] {
  return mediaUrls.map((url, index) => ({
    id: `${snapshotId}-media-${index + 1}`,
    snapshotId,
    sourceType: 'scraped',
    urlOrPath: url,
    isActive: true,
  }));
}

function createFailure(reason: TokopediaScrapeFailure['reason'], message: string, finalUrl?: string): TokopediaScrapeFailure {
  return {
    ok: false,
    reason,
    message,
    finalUrl,
  };
}

function normalizeSnapshotSourceUrl(rawUrl: string, finalUrl: string): string {
  try {
    return new URL(finalUrl).toString();
  } catch {
    return normalizeTokopediaUrl(rawUrl);
  }
}

function buildDraftSnapshot(sourceUrl: string, title: string, description: string, mediaUrls: readonly string[]): DraftProductSnapshot {
  const id = buildSnapshotId(sourceUrl);

  return {
    id,
    projectId: DEFAULT_PROJECT_ID,
    sourceUrl,
    title,
    description,
    media: buildMediaAssets(id, mediaUrls),
    status: 'draft',
    approvedAt: null,
  };
}

function isTokopediaChallengeMetadata(value: string | null): boolean {
  return value !== null && TOKOPEDIA_CHALLENGE_TEXT_PATTERN.test(value);
}

function sanitizeBlockedPageMetadata(extracted: {
  title: string | null;
  description: string | null;
  mediaUrls: readonly string[];
}): {
  title: string | null;
  description: string | null;
  mediaUrls: readonly string[];
} {
  return {
    title: isTokopediaChallengeMetadata(extracted.title) ? null : extracted.title,
    description: isTokopediaChallengeMetadata(extracted.description) ? null : extracted.description,
    mediaUrls: extracted.mediaUrls,
  };
}

function buildPreviewBackedSnapshot(
  sourceUrl: string,
  extracted: { title: string | null; description: string | null; mediaUrls: readonly string[] },
  preview: { title: string | null; mediaUrls: readonly string[] },
): DraftProductSnapshot | null {
  const title = extracted.title ?? preview.title;
  const mediaUrls = extracted.mediaUrls.length > 0 ? extracted.mediaUrls : preview.mediaUrls;
  const description = extracted.description ?? LIMITED_PREVIEW_DESCRIPTION;

  if (!title || mediaUrls.length === 0) {
    return null;
  }

  return buildDraftSnapshot(sourceUrl, title, description, mediaUrls);
}

export async function scrapeTokopediaProduct(
  rawUrl: string,
  options: TokopediaScrapeOptions = {},
): Promise<TokopediaScrapeResult> {
  let normalizedUrl: string;

  try {
    normalizedUrl = normalizeTokopediaUrl(rawUrl);
  } catch (error) {
    return createFailure('invalid_url', error instanceof Error ? error.message : 'Tokopedia URL is required.');
  }

  try {
    const resolvedPage = await resolveTokopediaProductPage(normalizedUrl, options);
    const finalHost = new URL(resolvedPage.finalUrl).hostname.toLowerCase();

    if (!/(^|\.)tokopedia\.com$/.test(finalHost)) {
      return createFailure('unreliable', 'Tokopedia URL did not resolve to a Tokopedia product page.', resolvedPage.finalUrl);
    }

    const blocked = detectTokopediaBlockedPage(resolvedPage.html, resolvedPage.response.status);
    const preview = extractTokopediaPreviewMetadata(resolvedPage.finalUrl);
    const extracted = extractTokopediaProductData(resolvedPage.html, resolvedPage.finalUrl);

    if (blocked.blocked) {
      if (preview.title === null && preview.mediaUrls.length === 0) {
        return createFailure('blocked', blocked.message ?? 'Tokopedia challenge or security page detected.', resolvedPage.finalUrl);
      }

      const sourceUrl = normalizeSnapshotSourceUrl(normalizedUrl, resolvedPage.finalUrl);
      const previewSnapshot = buildPreviewBackedSnapshot(sourceUrl, sanitizeBlockedPageMetadata(extracted), preview);

      if (previewSnapshot === null) {
        return createFailure('unreliable', 'Tokopedia preview metadata could not be extracted reliably.', resolvedPage.finalUrl);
      }

      const snapshot = persistScrapedDraftSnapshot(previewSnapshot);

      return {
        ok: true,
        finalUrl: resolvedPage.finalUrl,
        snapshot,
      };
    }

    if (!extracted.title || !extracted.description || extracted.mediaUrls.length === 0) {
      return createFailure('unreliable', 'Tokopedia product metadata could not be extracted reliably.', resolvedPage.finalUrl);
    }

    const sourceUrl = normalizeSnapshotSourceUrl(normalizedUrl, resolvedPage.finalUrl);
    const snapshot = persistScrapedDraftSnapshot(
      buildDraftSnapshot(sourceUrl, extracted.title, extracted.description, extracted.mediaUrls),
    );

    return {
      ok: true,
      finalUrl: resolvedPage.finalUrl,
      snapshot,
    };
  } catch (error) {
    return createFailure('network', error instanceof Error ? error.message : 'Unable to scrape Tokopedia product page.', normalizedUrl);
  }
}
