import { beforeEach, describe, expect, it } from 'vitest';

import { apiFailureResponseSchema } from '@/lib/api/contracts';
import { POST } from '@/app/api/scrape/route';
import { resetReviewFlowStore } from '@/lib/review-flow-store';

describe('POST /api/scrape', () => {
  beforeEach(() => {
    resetReviewFlowStore();
  });

  it('returns a deterministic draft snapshot', async () => {
    const response = await POST(
      new Request('http://localhost/api/scrape', {
        method: 'POST',
        body: JSON.stringify({ url: 'https://vt.tokopedia.com/t/xxxxx' }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      ok: true,
      endpoint: '/api/scrape',
      snapshot: {
        projectId: 'project_1',
        sourceUrl: 'https://vt.tokopedia.com/t/xxxxx',
        status: 'draft',
        approvedAt: null,
      },
    });
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
