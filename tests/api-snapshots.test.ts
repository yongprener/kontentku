import { beforeEach, describe, expect, it } from 'vitest';

import { apiFailureResponseSchema } from '@/lib/api/contracts';
import { POST as approvePOST } from '@/app/api/snapshots/[id]/approve/route';
import { GET as snapshotGET, PUT as snapshotPUT } from '@/app/api/snapshots/[id]/route';
import { POST as scrapePOST } from '@/app/api/scrape/route';
import { resetGenerationEngine } from '@/lib/generation/engine-v1';
import { resetReviewFlowStore } from '@/lib/review-flow-store';

const routeContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

describe('snapshot routes', () => {
  beforeEach(() => {
    resetReviewFlowStore();
    resetGenerationEngine();
  });

  it('returns, updates, and approves a scraped snapshot', async () => {
    const scrapeResponse = await scrapePOST(
      new Request('http://localhost/api/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://vt.tokopedia.com/t/xxxxx' }),
      }),
    );

    const scraped = await scrapeResponse.json();
    const snapshotId = scraped.snapshot.id as string;

    const getResponse = await snapshotGET(new Request('http://localhost/api/snapshots/' + snapshotId), routeContext(snapshotId));
    expect(getResponse.status).toBe(200);

    const putResponse = await snapshotPUT(
      new Request('http://localhost/api/snapshots/' + snapshotId, {
        method: 'PUT',
        body: JSON.stringify({ title: 'Updated title' }),
      }),
      routeContext(snapshotId),
    );

    expect(putResponse.status).toBe(200);
    expect((await putResponse.json()).snapshot).toMatchObject({
      id: snapshotId,
      title: 'Updated title',
      status: 'draft',
    });

    const approveResponse = await approvePOST(new Request('http://localhost/api/snapshots/' + snapshotId + '/approve'), routeContext(snapshotId));
    expect(approveResponse.status).toBe(200);
    expect((await approveResponse.json()).snapshot).toMatchObject({
      id: snapshotId,
      status: 'approved',
      approvedAt: '2026-05-02T00:00:00.000Z',
    });
  });

  it('returns failure envelopes for missing snapshots', async () => {
    const getResponse = await snapshotGET(new Request('http://localhost/api/snapshots/missing'), routeContext('missing'));
    expect(getResponse.status).toBe(404);
    expect(apiFailureResponseSchema.parse(await getResponse.json())).toEqual({
      ok: false,
      endpoint: '/api/snapshots/:id',
      errorCode: 'VALIDATION_FAILED',
      message: 'Snapshot not found.',
    });

    const approveResponse = await approvePOST(new Request('http://localhost/api/snapshots/missing/approve'), routeContext('missing'));
    expect(approveResponse.status).toBe(404);
    expect(apiFailureResponseSchema.parse(await approveResponse.json())).toEqual({
      ok: false,
      endpoint: '/api/snapshots/:id/approve',
      errorCode: 'SNAPSHOT_NOT_APPROVED',
      message: 'Snapshot not found.',
    });
  });
});
