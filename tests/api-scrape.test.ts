import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { apiFailureResponseSchema } from '@/lib/api/contracts';
import { getSnapshot, resetReviewFlowStore } from '@/lib/review-flow-store';
import { POST } from '@/app/api/scrape/route';

const successHtml = `
  <!doctype html>
  <html>
    <head>
      <meta property="og:title" content="Tokopedia Product | Tokopedia" />
      <meta property="og:description" content="Best product description" />
      <meta property="og:image" content="https://images.tokopedia.net/product-1.jpg" />
      <script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Tokopedia Product","description":"Best product description","image":["https://images.tokopedia.net/product-1.jpg","https://images.tokopedia.net/product-2.jpg"]}</script>
    </head>
    <body><h1>Tokopedia Product</h1></body>
  </html>
`;

const blockedHtml = `
  <!doctype html>
  <html>
    <head><title>Security Check</title></head>
    <body>Mohon tunggu sebentar, kami sedang memeriksa browser Anda.</body>
  </html>
`;

const previewOgInfo = encodeURIComponent(JSON.stringify({
  title: 'Tokopedia Preview Product | Tokopedia',
  image: 'https://images.tokopedia.net/preview-product.jpg',
}));

describe('POST /api/scrape', () => {
  beforeEach(() => {
    resetReviewFlowStore();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('persists and returns a scraped snapshot after redirect resolution', async () => {
    const shortUrl = 'https://vt.tokopedia.com/t/ZS9N3WDPgRU3X-WKUVc/';
    const finalUrl = 'https://www.tokopedia.com/seller/tokopedia-product';

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const currentUrl = typeof input === 'string' ? input : input.toString();

      if (currentUrl === shortUrl) {
        return new Response('', {
          status: 302,
          headers: new Headers({ location: finalUrl }),
        });
      }

      return new Response(successHtml, {
        status: 200,
        headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      });
    }));

    const response = await POST(
      new Request('http://localhost/api/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: shortUrl }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload).toMatchObject({
      ok: true,
      endpoint: '/api/scrape',
      snapshot: {
        projectId: 'project_1',
        sourceUrl: finalUrl,
        title: 'Tokopedia Product',
        description: 'Best product description',
        status: 'draft',
        approvedAt: null,
      },
    });

    expect(payload.snapshot.media).toHaveLength(2);
    expect(getSnapshot(payload.snapshot.id)).toEqual(payload.snapshot);
  });

  it('returns a failure response when Tokopedia blocks scraping', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(blockedHtml, {
      status: 403,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
    })));

    const response = await POST(
      new Request('http://localhost/api/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://vt.tokopedia.com/t/ZS9N3Wu7DHBFj-sdhM0/' }),
      }),
    );

    expect(response.status).toBe(502);
    expect(apiFailureResponseSchema.parse(await response.json())).toEqual({
      ok: false,
      endpoint: '/api/scrape',
      errorCode: 'SCRAPE_FAILED',
      message: 'Tokopedia responded with HTTP 403.',
    });
  });

  it('creates a limited draft snapshot from redirect preview metadata on a challenge page', async () => {
    const shortUrl = 'https://vt.tokopedia.com/t/ZS9N3WDPgRU3X-WKUVc/';
    const finalUrl = `https://www.tokopedia.com/security-check?og_info=${previewOgInfo}`;

    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const currentUrl = typeof input === 'string' ? input : input.toString();

      if (currentUrl === shortUrl) {
        return new Response('', {
          status: 302,
          headers: new Headers({ location: finalUrl }),
        });
      }

      return new Response(blockedHtml, {
        status: 403,
        headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
      });
    }));

    const response = await POST(
      new Request('http://localhost/api/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: shortUrl }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = await response.json();

    expect(payload).toMatchObject({
      ok: true,
      endpoint: '/api/scrape',
      snapshot: {
        projectId: 'project_1',
        sourceUrl: finalUrl,
        title: 'Tokopedia Preview Product',
        description: 'Tokopedia preview metadata only; full product details were unavailable because the page was protected by a security check.',
        status: 'draft',
        approvedAt: null,
      },
    });

    expect(payload.snapshot.media).toHaveLength(1);
    expect(payload.snapshot.media[0]).toMatchObject({
      sourceType: 'scraped',
      urlOrPath: 'https://images.tokopedia.net/preview-product.jpg',
      isActive: true,
    });
    expect(getSnapshot(payload.snapshot.id)).toEqual(payload.snapshot);
  });

  it('rejects invalid scrape payloads', async () => {
    const response = await POST(
      new Request('http://localhost/api/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: 'not-a-url' }),
      }),
    );

    expect(response.status).toBe(400);
    expect(apiFailureResponseSchema.parse(await response.json())).toEqual({
      ok: false,
      endpoint: '/api/scrape',
      errorCode: 'SCRAPE_FAILED',
      message: 'Invalid scrape request.',
    });
  });
});
