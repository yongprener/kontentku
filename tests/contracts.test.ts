import { describe, expect, it } from 'vitest';

import {
  apiErrorCodes,
  contentVariantSchema,
  generateMoreResponseSchema,
  generateMoreSummarySchema,
  generateMoreRequestSchema,
  generateRequestSchema,
  productSnapshotSchema,
  scrapeRequestSchema,
  updateSnapshotRequestSchema,
} from '@/lib/domain';

describe('domain contracts', () => {
  it('validates an approved product snapshot', () => {
    const snapshot = {
      id: 'snapshot_1',
      projectId: 'project_1',
      sourceUrl: 'https://example.com/product',
      title: 'Portable Speaker',
      description: 'A compact Bluetooth speaker with rich bass.',
      media: [
        {
          id: 'media_1',
          snapshotId: 'snapshot_1',
          sourceType: 'scraped',
          urlOrPath: 'https://cdn.example.com/media-1.jpg',
          isActive: true,
        },
      ],
      status: 'approved',
      approvedAt: new Date('2026-05-02T00:00:00.000Z').toISOString(),
    } as const;

    expect(productSnapshotSchema.parse(snapshot)).toEqual(snapshot);
  });

  it('rejects a content variant with duplicated hashtags', () => {
    const result = contentVariantSchema.safeParse({
      id: 'variant_1',
      jobId: 'job_1',
      hook: 'Stop scrolling.',
      script: 'Three quick reasons this works.',
      caption: 'Clean launch copy for the product.',
      hashtags: ['#kontentku', '#kontentku', '#launch'],
      mediaSelection: ['media_1'],
      status: 'generated',
    });

    expect(result.success).toBe(false);
  });

  it('enforces the MVP content count limit on generate requests', () => {
    expect(
      generateRequestSchema.parse({
        snapshotId: 'snapshot_1',
        contentCount: 30,
        duration: '15s',
        language: 'en',
        angle: 'benefit-led',
      }),
    ).toMatchObject({ contentCount: 30 });

    expect(
      generateRequestSchema.safeParse({
        snapshotId: 'snapshot_1',
        contentCount: 31,
        duration: '15s',
        language: 'en',
      }).success,
    ).toBe(false);
  });

  it('covers the required API request schemas and error codes', () => {
    expect(scrapeRequestSchema.parse({ url: 'https://example.com/product' })).toEqual({
      url: 'https://example.com/product',
    });

    expect(
      updateSnapshotRequestSchema.parse({
        title: 'Updated title',
      }),
    ).toEqual({ title: 'Updated title' });

    expect(generateMoreRequestSchema.parse({ snapshotId: 'snapshot_1', contentCount: 2 })).toEqual({
      snapshotId: 'snapshot_1',
      contentCount: 2,
    });

    expect(
      generateMoreSummarySchema.parse({
        requestedCount: 2,
        successCount: 1,
        failedCount: 1,
        failureReasons: ['Generated item 2 exceeded the similarity retry limit after 2 retries.'],
        exactDuplicateCount: 0,
        similarityRetryCount: 2,
        similarityRetryLimit: 2,
      }),
    ).toMatchObject({ similarityRetryLimit: 2 });

    expect(
      generateMoreResponseSchema.parse({
        job: {
          id: 'generation-snapshot_1-001',
          snapshotId: 'snapshot_1',
          requestedCount: 2,
          type: 'generate_more',
          status: 'partial_failed',
        },
        summary: {
          requestedCount: 2,
          successCount: 1,
          failedCount: 1,
          failureReasons: ['Generated item 2 exceeded the similarity retry limit after 2 retries.'],
          exactDuplicateCount: 0,
          similarityRetryCount: 2,
          similarityRetryLimit: 2,
        },
      }),
    ).toMatchObject({ job: { type: 'generate_more' } });

    expect(apiErrorCodes).toEqual([
      'SNAPSHOT_NOT_APPROVED',
      'CONTENT_COUNT_LIMIT_EXCEEDED',
      'SCRAPE_FAILED',
      'VALIDATION_FAILED',
    ]);
  });
});
