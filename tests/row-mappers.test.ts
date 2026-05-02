import { describe, expect, it } from 'vitest';

import {
  contentVariantFromRow,
  contentVariantToRow,
  generationJobFromRow,
  generationJobToRow,
  mediaAssetFromRow,
  mediaAssetToRow,
  snapshotFromRow,
  snapshotToRow,
} from '@/lib/persistence';

describe('row-mapper persistence scaffolding', () => {
  it('round-trips snapshot, media, job, and variant rows', () => {
    const mediaAsset = {
      id: 'media_1',
      snapshotId: 'snapshot_1',
      sourceType: 'uploaded',
      urlOrPath: '/uploads/media-1.jpg',
      isActive: true,
    } as const;

    const snapshot = {
      id: 'snapshot_1',
      projectId: 'project_1',
      sourceUrl: 'https://example.com/product',
      title: 'Portable Speaker',
      description: 'A compact Bluetooth speaker with rich bass.',
      media: [mediaAssetFromRow(mediaAssetToRow(mediaAsset))],
      status: 'draft',
      approvedAt: null,
    } as const;

    const generationJob = {
      id: 'job_1',
      snapshotId: 'snapshot_1',
      requestedCount: 5,
      type: 'initial',
      status: 'queued',
    } as const;

    const contentVariant = {
      id: 'variant_1',
      jobId: 'job_1',
      hook: 'Stop scrolling.',
      script: 'Three quick reasons this works.',
      caption: 'Clean launch copy for the product.',
      hashtags: ['#kontentku', '#launch', '#demo'] as const,
      mediaSelection: ['media_1'] as const,
      status: 'generated',
    } as const;

    expect(snapshotFromRow(snapshotToRow(snapshot), snapshot.media)).toEqual(snapshot);
    expect(generationJobFromRow(generationJobToRow(generationJob))).toEqual(generationJob);
    expect(contentVariantFromRow(contentVariantToRow(contentVariant))).toEqual(contentVariant);
  });
});
