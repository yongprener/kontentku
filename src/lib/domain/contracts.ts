export const MIN_CONTENT_PER_BATCH = 1 as const;
export const MAX_CONTENT_PER_BATCH = 30 as const;

export const snapshotStatuses = ['draft', 'approved'] as const;
export type SnapshotStatus = (typeof snapshotStatuses)[number];

export const mediaSourceTypes = ['scraped', 'uploaded'] as const;
export type MediaSourceType = (typeof mediaSourceTypes)[number];

export const generationJobTypes = ['initial', 'generate_more'] as const;
export type GenerationJobType = (typeof generationJobTypes)[number];

export const generationJobStatuses = [
  'queued',
  'processing',
  'completed',
  'partial_failed',
  'failed',
  'cancelled',
] as const;
export type GenerationJobStatus = (typeof generationJobStatuses)[number];

export const contentVariantStatuses = [
  'generated',
  'regenerated',
  'failed_similar',
  'failed_validation',
  'failed_runtime',
] as const;
export type ContentVariantStatus = (typeof contentVariantStatuses)[number];

export const apiErrorCodes = [
  'SNAPSHOT_NOT_APPROVED',
  'CONTENT_COUNT_LIMIT_EXCEEDED',
  'SCRAPE_FAILED',
  'VALIDATION_FAILED',
] as const;
export type ApiErrorCode = (typeof apiErrorCodes)[number];

export type HashtagTriple = readonly [string, string, string];
export type MediaSelection = readonly string[];

export interface MediaAsset {
  id: string;
  snapshotId: string;
  sourceType: MediaSourceType;
  urlOrPath: string;
  isActive: boolean;
}

export interface ProductSnapshotBase {
  id: string;
  projectId: string;
  sourceUrl: string;
  title: string;
  description: string;
  media: readonly MediaAsset[];
}

export interface DraftProductSnapshot extends ProductSnapshotBase {
  status: 'draft';
  approvedAt: null;
}

export interface ApprovedProductSnapshot extends ProductSnapshotBase {
  status: 'approved';
  approvedAt: string;
}

export type ProductSnapshot = DraftProductSnapshot | ApprovedProductSnapshot;

export interface GenerationJob {
  id: string;
  snapshotId: string;
  requestedCount: number;
  type: GenerationJobType;
  status: GenerationJobStatus;
}

export interface ContentVariant {
  id: string;
  jobId: string;
  hook: string;
  script: string;
  caption: string;
  hashtags: HashtagTriple;
  mediaSelection: MediaSelection;
  status: ContentVariantStatus;
}

export interface ScrapeRequest {
  url: string;
}

export interface ScrapeResponse {
  snapshot: DraftProductSnapshot;
}

export interface UpdateSnapshotRequest {
  title?: string;
  description?: string;
  media?: readonly MediaAsset[];
}

export interface ApproveSnapshotResponse {
  snapshot: ApprovedProductSnapshot;
}

export interface GenerateRequest {
  snapshotId: string;
  contentCount: number;
  duration: string;
  language: string;
  angle?: string;
}

export interface GenerateMoreRequest {
  snapshotId: string;
  contentCount: number;
}

export interface GenerationSummary {
  requestedCount: number;
  successCount: number;
  failedCount: number;
  failureReasons: readonly string[];
}
