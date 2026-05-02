import { describe, expect, it } from 'vitest';

import {
  apiEndpointContracts,
  apiFailureResponseSchema,
  apiRoutePaths,
  createApiFailureResponse,
} from '@/lib/api/contracts';

describe('api contracts', () => {
  it('defines the MVP endpoint map', () => {
    expect(apiRoutePaths).toEqual({
      scrape: '/api/scrape',
      snapshotById: '/api/snapshots/:id',
      approveSnapshotById: '/api/snapshots/:id/approve',
      generate: '/api/generate',
      generateMore: '/api/generate-more',
    });

    expect(apiEndpointContracts.generate.requestSchema.parse({
      snapshotId: 'snapshot_1',
      contentCount: 5,
      duration: '15s',
      language: 'id',
    })).toMatchObject({ contentCount: 5 });
  });

  it('builds a valid failure response envelope', () => {
    const payload = createApiFailureResponse(
      '/api/generate',
      'VALIDATION_FAILED',
      'Content count is invalid.',
    );

    expect(apiFailureResponseSchema.parse(payload)).toEqual(payload);
  });
});
