import { beforeEach, describe, expect, it } from 'vitest';

import { apiFailureResponseSchema } from '@/lib/api/contracts';
import { POST } from '@/app/api/generate/route';
import { resetGenerationEngine } from '@/lib/generation/engine-v1';

describe('POST /api/generate', () => {
  beforeEach(() => {
    resetGenerationEngine();
  });

  it('returns a deterministic job summary with partial failure details', async () => {
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

    expect(response.status).toBe(200);

    const payload = await response.json();

    expect(payload).toEqual({
      ok: true,
      endpoint: '/api/generate',
      job: {
        id: 'generation-snapshot_1-001',
        snapshotId: 'snapshot_1',
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
