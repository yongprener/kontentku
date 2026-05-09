import { expect, it, vi } from 'vitest';

import { detectTokopediaBlockedPage, extractTokopediaProductData } from '@/lib/scrape/tokopedia/extract';
import { resolveTokopediaProductPage } from '@/lib/scrape/tokopedia/resolve';
import { scrapeTokopediaProduct } from '@/lib/scrape/tokopedia';

const productHtml = `
  <!doctype html>
  <html>
    <head>
      <meta property="og:title" content="Tokopedia Product | Tokopedia" />
      <meta property="og:description" content="Best product description" />
      <meta property="og:image" content="/images/product-1.jpg" />
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Tokopedia Product",
          "description": "Best product description",
          "image": ["/images/product-1.jpg", "https://images.tokopedia.net/product-2.jpg"]
        }
      </script>
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

it('follows Tokopedia redirects before fetching the final page', async () => {
  const shortUrl = 'https://vt.tokopedia.com/t/short';
  const finalUrl = 'https://www.tokopedia.com/shop/product';

  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const currentUrl = typeof input === 'string' ? input : input.toString();

    if (currentUrl === shortUrl) {
      return new Response('', {
        status: 302,
        headers: new Headers({ location: finalUrl }),
      });
    }

    return new Response(productHtml, {
      status: 200,
      headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
    });
  });

  const page = await resolveTokopediaProductPage(shortUrl, { fetchImpl });

  expect(page.initialUrl).toBe(shortUrl);
  expect(page.finalUrl).toBe(finalUrl);
  expect(page.redirects).toEqual([finalUrl]);
  expect(page.html).toContain('Tokopedia Product');
});

it('detects blocked Tokopedia challenge pages', () => {
  expect(detectTokopediaBlockedPage(blockedHtml, 403)).toEqual({
    blocked: true,
    message: 'Tokopedia responded with HTTP 403.',
  });
});

it('extracts real product metadata from Tokopedia HTML', () => {
  const data = extractTokopediaProductData(productHtml, 'https://www.tokopedia.com/shop/product');

  expect(data).toEqual({
    title: 'Tokopedia Product',
    description: 'Best product description',
    mediaUrls: [
      'https://www.tokopedia.com/images/product-1.jpg',
      'https://images.tokopedia.net/product-2.jpg',
    ],
  });
});

it('returns a failure when scraping is blocked', async () => {
  const fetchImpl = vi.fn(async () => new Response(blockedHtml, {
    status: 403,
    headers: new Headers({ 'content-type': 'text/html; charset=utf-8' }),
  }));

  const result = await scrapeTokopediaProduct('https://vt.tokopedia.com/t/blocked', { fetchImpl });

  expect(result).toEqual({
    ok: false,
    reason: 'blocked',
    message: 'Tokopedia responded with HTTP 403.',
    finalUrl: 'https://vt.tokopedia.com/t/blocked',
  });
});

it('uses preview metadata from the redirected URL when Tokopedia serves a challenge page', async () => {
  const shortUrl = 'https://vt.tokopedia.com/t/preview';
  const finalUrl = `https://www.tokopedia.com/security-check?og_info=${previewOgInfo}`;

  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
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
  });

  const result = await scrapeTokopediaProduct(shortUrl, { fetchImpl });

  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error('Expected preview-backed scrape to succeed.');
  }

  expect(result.finalUrl).toBe(finalUrl);
  expect(result.snapshot).toMatchObject({
    sourceUrl: finalUrl,
    title: 'Tokopedia Preview Product',
    description: 'Tokopedia preview metadata only; full product details were unavailable because the page was protected by a security check.',
    status: 'draft',
    approvedAt: null,
  });
  expect(result.snapshot.media).toHaveLength(1);
  expect(result.snapshot.media[0]).toMatchObject({
    urlOrPath: 'https://images.tokopedia.net/preview-product.jpg',
    sourceType: 'scraped',
    isActive: true,
  });
});
