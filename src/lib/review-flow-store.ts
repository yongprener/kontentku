import type { ApprovedProductSnapshot, DraftProductSnapshot, MediaAsset, ProductSnapshot, UpdateSnapshotRequest } from '@/lib/domain/contracts';

const DEFAULT_PROJECT_ID = 'project_1';
const APPROVAL_TIMESTAMP = '2026-05-02T00:00:00.000Z';

const snapshotsById = new Map<string, ProductSnapshot>();

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return '';
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getHostSegment(normalizedUrl: string): string {
  try {
    return new URL(normalizedUrl).hostname.replace(/^www\./, '').split('.')[0] || 'product';
  } catch {
    return 'product';
  }
}

function buildSlug(input: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
}

function buildSnapshotId(normalizedUrl: string): string {
  return `snapshot-${getHostSegment(normalizedUrl)}-${buildSlug(normalizedUrl).slice(0, 6)}`;
}

function buildMediaAssets(snapshotId: string, hostSegment: string): MediaAsset[] {
  return [
    {
      id: `${snapshotId}-media-1`,
      snapshotId,
      sourceType: 'scraped',
      urlOrPath: `https://cdn.kontentku.local/${hostSegment}/hero.jpg`,
      isActive: true,
    },
    {
      id: `${snapshotId}-media-2`,
      snapshotId,
      sourceType: 'scraped',
      urlOrPath: `https://cdn.kontentku.local/${hostSegment}/detail.jpg`,
      isActive: true,
    },
    {
      id: `${snapshotId}-media-3`,
      snapshotId,
      sourceType: 'scraped',
      urlOrPath: `https://cdn.kontentku.local/${hostSegment}/lifestyle.mp4`,
      isActive: true,
    },
  ];
}

function buildDraftSnapshot(normalizedUrl: string): DraftProductSnapshot {
  const hostSegment = getHostSegment(normalizedUrl);
  const displayHost = hostSegment.charAt(0).toUpperCase() + hostSegment.slice(1);
  const id = buildSnapshotId(normalizedUrl);

  return {
    id,
    projectId: DEFAULT_PROJECT_ID,
    sourceUrl: normalizedUrl,
    title: `${displayHost} spotlight bundle`,
    description: `High-intent product snapshot from ${normalizedUrl}. Review, curate media, and approve before generation.`,
    media: buildMediaAssets(id, hostSegment),
    status: 'draft',
    approvedAt: null,
  };
}

export function resetReviewFlowStore(): void {
  snapshotsById.clear();
}

export function scrapeSnapshot(rawUrl: string): DraftProductSnapshot {
  const normalizedUrl = normalizeUrl(rawUrl);
  const snapshot = buildDraftSnapshot(normalizedUrl);

  snapshotsById.set(snapshot.id, snapshot);

  return snapshot;
}

export function getSnapshot(snapshotId: string): ProductSnapshot | null {
  const snapshot = snapshotsById.get(snapshotId.trim());

  return snapshot ?? null;
}

export function updateSnapshot(snapshotId: string, updates: UpdateSnapshotRequest): ProductSnapshot | null {
  const existing = snapshotsById.get(snapshotId.trim());

  if (existing === undefined || existing.status === 'approved') {
    return null;
  }

  const nextSnapshot: DraftProductSnapshot = {
    ...existing,
    title: updates.title ?? existing.title,
    description: updates.description ?? existing.description,
    media: updates.media?.map((asset) => ({
      ...asset,
      snapshotId: existing.id,
    })) ?? existing.media,
    status: 'draft',
    approvedAt: null,
  };

  snapshotsById.set(nextSnapshot.id, nextSnapshot);

  return nextSnapshot;
}

export function approveSnapshot(snapshotId: string): ApprovedProductSnapshot | null {
  const existing = snapshotsById.get(snapshotId.trim());

  if (existing === undefined) {
    return null;
  }

  if (existing.status === 'approved') {
    return existing;
  }

  const approvedSnapshot: ApprovedProductSnapshot = {
    ...existing,
    status: 'approved',
    approvedAt: APPROVAL_TIMESTAMP,
  };

  snapshotsById.set(approvedSnapshot.id, approvedSnapshot);

  return approvedSnapshot;
}

export function isSnapshotApproved(snapshotId: string): boolean {
  return snapshotsById.get(snapshotId.trim())?.status === 'approved';
}
