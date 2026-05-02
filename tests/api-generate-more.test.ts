import { beforeEach, describe, expect, it } from 'vitest';

import { apiFailureResponseSchema } from '@/lib/api/contracts';
import { POST as generateMorePOST } from '@/app/api/generate-more/route';
import { POST as generatePOST } from '@/app/api/generate/route';
import { POST as approvePOST } from '@/app/api/snapshots/[id]/approve/route';
import { POST as scrapePOST } from '@/app/api/scrape/route';
import { resetGenerationEngine } from '@/lib/generation/engine-v1';
import { resetReviewFlowStore } from '@/lib/review-flow-store';

const routeContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

const approveSnapshotForMore = async (snapshotId: string): Promise<void> => {
  await scrapePOST(
    new Request('http://localhost/api/scrape', {
      method: 'POST',
      body: JSON.stringify({
        url: 'https://vt.tokopedia.com/t/xxxxx',
      }),
    }),
  );

  await approvePOST(new Request(`http://localhost/api/snapshots/${snapshotId}/approve`), routeContext(snapshotId));

  await generatePOST(
    new Request('http://localhost/api/generate', {
      method: 'POST',
      body: JSON.stringify({
        snapshotId,
        contentCount: 1,
        duration: '15s',
        language: 'en',
      }),
    }),
  );
};

describe('POST /api/generate-more', () => {
  beforeEach(() => {
    resetGenerationEngine();
    resetReviewFlowStore();
  });

  it('returns a structured summary for approved snapshots', async () => {
    const scrapeResponse = await scrapePOST(
      new Request('http://localhost/api/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://vt.tokopedia.com/t/xxxxx' }),
      }),
    );

    const scraped = await scrapeResponse.json();
    const snapshotId = scraped.snapshot.id as string;

    await approveSnapshotForMore(snapshotId);

    const response = await generateMorePOST(
      new Request('http://localhost/api/generate-more', {
        method: 'POST',
        body: JSON.stringify({
          snapshotId,
          contentCount: 5,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      endpoint: '/api/generate-more',
      job: {
        id: `generation-${snapshotId}-002`,
        snapshotId,
        requestedCount: 5,
        type: 'generate_more',
        status: 'partial_failed',
      },
      summary: {
        requestedCount: 5,
        successCount: 4,
        failedCount: 1,
        failureReasons: ['Generated item 5 exceeded the similarity retry limit after 2 retries.'],
        exactDuplicateCount: 0,
        similarityRetryCount: 3,
        similarityRetryLimit: 2,
      },
    });
  });

  it('blocks exact duplicates on repeat requests', async () => {
    const scrapeResponse = await scrapePOST(
      new Request('http://localhost/api/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://vt.tokopedia.com/t/xxxxx' }),
      }),
    );

    const scraped = await scrapeResponse.json();
    const snapshotId = scraped.snapshot.id as string;

    await approveSnapshotForMore(snapshotId);

    await generateMorePOST(
      new Request('http://localhost/api/generate-more', {
        method: 'POST',
        body: JSON.stringify({
          snapshotId,
          contentCount: 2,
        }),
      }),
    );

    const response = await generateMorePOST(
      new Request('http://localhost/api/generate-more', {
        method: 'POST',
        body: JSON.stringify({
          snapshotId,
          contentCount: 2,
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      endpoint: '/api/generate-more',
      summary: {
        requestedCount: 2,
        successCount: 0,
        failedCount: 2,
        exactDuplicateCount: 2,
        similarityRetryCount: 0,
        similarityRetryLimit: 2,
      },
    });
  });

  it('rejects unapproved snapshots with a failure envelope', async () => {
    const response = await generateMorePOST(
      new Request('http://localhost/api/generate-more', {
        method: 'POST',
        body: JSON.stringify({
          snapshotId: 'snapshot_1',
          contentCount: 2,
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(apiFailureResponseSchema.parse(await response.json())).toEqual({
      ok: false,
      endpoint: '/api/generate-more',
      errorCode: 'SNAPSHOT_NOT_APPROVED',
      message: 'Snapshot must be approved before generating more content.',
    });
  });

  it('rejects invalid generate-more payloads', async () => {
    const response = await generateMorePOST(
      new Request('http://localhost/api/generate-more', {
        method: 'POST',
        body: JSON.stringify({
          snapshotId: 'snapshot_1',
          contentCount: 31,
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(apiFailureResponseSchema.parse(await response.json())).toEqual({
      ok: false,
      endpoint: '/api/generate-more',
      errorCode: 'VALIDATION_FAILED',
      message: 'Invalid generate-more request.',
    });
  });
});
