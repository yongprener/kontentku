import { beforeEach, describe, expect, it } from 'vitest';

import { apiFailureResponseSchema } from '@/lib/api/contracts';
import { POST as approvePOST } from '@/app/api/snapshots/[id]/approve/route';
import { POST as scrapePOST } from '@/app/api/scrape/route';
import { POST } from '@/app/api/generate/route';
import { resetGenerationEngine } from '@/lib/generation/engine-v1';
import { resetReviewFlowStore } from '@/lib/review-flow-store';

const routeContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe('POST /api/generate', () => {
  beforeEach(() => {
    resetGenerationEngine();
    resetReviewFlowStore();
  });

  it('blocks unapproved snapshots', async () => {
    const response = await POST(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          snapshotId: 'snapshot_1',
          contentCount: 7,
          duration: '15s',
          language: 'en',
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(apiFailureResponseSchema.parse(await response.json())).toEqual({
      ok: false,
      endpoint: '/api/generate',
      errorCode: 'SNAPSHOT_NOT_APPROVED',
      message: 'Snapshot must be approved before generation can begin.',
    });
  });

  it('returns a deterministic job summary with partial failure details', async () => {
    const scrapeResponse = await scrapePOST(
      new Request('http://localhost/api/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://vt.tokopedia.com/t/xxxxx' }),
      }),
    );

    const scraped = await scrapeResponse.json();
    const snapshotId = scraped.snapshot.id as string;

    await approvePOST(new Request(`http://localhost/api/snapshots/${snapshotId}/approve`), routeContext(snapshotId));

    const response = await POST(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          snapshotId,
          contentCount: 7,
          duration: '15s',
          language: 'en',
        }),
      }),
    );

    expect(response.status).toBe(200);

    const payload = await response.json();

    expect(payload).toEqual({
      ok: true,
      endpoint: '/api/generate',
      job: {
        id: `generation-${snapshotId}-001`,
        snapshotId,
        requestedCount: 7,
        type: 'initial',
        status: 'partial_failed',
      },
      summary: {
        requestedCount: 7,
        successCount: 6,
        failedCount: 1,
        failureReasons: ['Generated item 7 failed deterministic validation.'],
      },
    });
  });

  it('rejects content counts above the MVP limit', async () => {
    const response = await POST(
      new Request('http://localhost/api/generate', {
        method: 'POST',
        body: JSON.stringify({
          snapshotId: 'snapshot_1',
          contentCount: 31,
          duration: '15s',
          language: 'en',
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(apiFailureResponseSchema.parse(await response.json())).toEqual({
      ok: false,
      endpoint: '/api/generate',
      errorCode: 'VALIDATION_FAILED',
      message: 'Invalid generate request.',
    });
  });
});
