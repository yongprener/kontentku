import { beforeEach, describe, expect, it } from 'vitest';

import { approveSnapshot, getSnapshot, isSnapshotApproved, resetReviewFlowStore, scrapeSnapshot, updateSnapshot } from '@/lib/review-flow-store';

describe('review-flow store', () => {
  beforeEach(() => {
    resetReviewFlowStore();
  });

  it('creates deterministic draft snapshots from a URL', () => {
    const first = scrapeSnapshot('vt.tokopedia.com/t/xxxxx');
    const second = scrapeSnapshot('https://vt.tokopedia.com/t/xxxxx');

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      projectId: 'project_1',
      sourceUrl: 'https://vt.tokopedia.com/t/xxxxx',
      status: 'draft',
      approvedAt: null,
    });
    expect(getSnapshot(first.id)).toEqual(first);
  });

  it('updates and locks snapshots after approval', () => {
    const draft = scrapeSnapshot('https://vt.tokopedia.com/t/xxxxx');

    const updated = updateSnapshot(draft.id, {
      title: 'Updated title',
      description: 'Updated description',
    });

    expect(updated).toMatchObject({
      id: draft.id,
      title: 'Updated title',
      description: 'Updated description',
      status: 'draft',
    });

    const approved = approveSnapshot(draft.id);

    expect(approved).toMatchObject({
      id: draft.id,
      status: 'approved',
      approvedAt: '2026-05-02T00:00:00.000Z',
    });
    expect(isSnapshotApproved(draft.id)).toBe(true);
    expect(updateSnapshot(draft.id, { title: 'Blocked edit' })).toBeNull();
  });
});
