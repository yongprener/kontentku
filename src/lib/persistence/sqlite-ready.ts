import type { ContentVariant, GenerationJob, MediaAsset, ProductSnapshot } from '@/lib/domain/contracts';

export const sqliteTableNames = {
  snapshots: 'product_snapshots',
  mediaAssets: 'media_assets',
  generationJobs: 'generation_jobs',
  contentVariants: 'content_variants',
} as const;

export interface SnapshotRow {
  id: string;
  project_id: string;
  source_url: string;
  title: string;
  description: string;
  status: ProductSnapshot['status'];
  approved_at: string | null;
}

export interface MediaAssetRow {
  id: string;
  snapshot_id: string;
  source_type: MediaAsset['sourceType'];
  url_or_path: string;
  is_active: 0 | 1;
}

export interface GenerationJobRow {
  id: string;
  snapshot_id: string;
  requested_count: number;
  type: GenerationJob['type'];
  status: GenerationJob['status'];
}

export interface ContentVariantRow {
  id: string;
  job_id: string;
  hook: string;
  script: string;
  caption: string;
  hashtags_json: string;
  media_selection_json: string;
  status: ContentVariant['status'];
}

export const encodeJson = <T>(value: T): string => JSON.stringify(value);

export const decodeJson = <T>(value: string): T => JSON.parse(value) as T;

export const snapshotToRow = (snapshot: ProductSnapshot): SnapshotRow => ({
  id: snapshot.id,
  project_id: snapshot.projectId,
  source_url: snapshot.sourceUrl,
  title: snapshot.title,
  description: snapshot.description,
  status: snapshot.status,
  approved_at: snapshot.approvedAt,
});

export const mediaAssetToRow = (asset: MediaAsset): MediaAssetRow => ({
  id: asset.id,
  snapshot_id: asset.snapshotId,
  source_type: asset.sourceType,
  url_or_path: asset.urlOrPath,
  is_active: asset.isActive ? 1 : 0,
});

export const generationJobToRow = (job: GenerationJob): GenerationJobRow => ({
  id: job.id,
  snapshot_id: job.snapshotId,
  requested_count: job.requestedCount,
  type: job.type,
  status: job.status,
});

export const contentVariantToRow = (variant: ContentVariant): ContentVariantRow => ({
  id: variant.id,
  job_id: variant.jobId,
  hook: variant.hook,
  script: variant.script,
  caption: variant.caption,
  hashtags_json: encodeJson(variant.hashtags),
  media_selection_json: encodeJson(variant.mediaSelection),
  status: variant.status,
});

export const mediaAssetFromRow = (row: MediaAssetRow): MediaAsset => ({
  id: row.id,
  snapshotId: row.snapshot_id,
  sourceType: row.source_type,
  urlOrPath: row.url_or_path,
  isActive: row.is_active === 1,
});

export const snapshotFromRow = (row: SnapshotRow, media: readonly MediaAsset[]): ProductSnapshot => ({
  id: row.id,
  projectId: row.project_id,
  sourceUrl: row.source_url,
  title: row.title,
  description: row.description,
  media,
  ...(row.status === 'approved'
    ? {
        status: 'approved' as const,
        approvedAt: row.approved_at ?? new Date(0).toISOString(),
      }
    : {
        status: 'draft' as const,
        approvedAt: null,
      }),
});

export const generationJobFromRow = (row: GenerationJobRow): GenerationJob => ({
  id: row.id,
  snapshotId: row.snapshot_id,
  requestedCount: row.requested_count,
  type: row.type,
  status: row.status,
});

export const contentVariantFromRow = (row: ContentVariantRow): ContentVariant => ({
  id: row.id,
  jobId: row.job_id,
  hook: row.hook,
  script: row.script,
  caption: row.caption,
  hashtags: decodeJson<ContentVariant['hashtags']>(row.hashtags_json),
  mediaSelection: decodeJson<ContentVariant['mediaSelection']>(row.media_selection_json),
  status: row.status,
});
