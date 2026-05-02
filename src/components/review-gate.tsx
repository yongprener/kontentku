'use client';

import { useMemo, useRef, useState, type CSSProperties } from 'react';

import { apiRoutePaths } from '@/lib/api/contracts';
import type { MediaAsset, ProductSnapshot } from '@/lib/domain/contracts';

type MediaItem = {
  id: string;
  kind: 'Image' | 'Video';
  label: string;
  source: string;
};

type GeneratedVariant = {
  id: string;
  hook: string;
  caption: string;
};

const fieldStyle: CSSProperties = {
  width: '100%',
  border: '1px solid var(--border)',
  borderRadius: 12,
  background: 'rgba(15, 23, 42, 0.72)',
  color: 'var(--text)',
  padding: '12px 14px',
  fontSize: '0.96rem',
  outline: 'none',
};

const actionButtonStyle: CSSProperties = {
  borderRadius: 12,
  border: '1px solid var(--border)',
  background: 'rgba(30, 41, 59, 0.72)',
  color: 'var(--text)',
  padding: '10px 14px',
  fontWeight: 600,
  cursor: 'pointer',
};

const primaryButtonStyle: CSSProperties = {
  ...actionButtonStyle,
  background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.28), rgba(56, 189, 248, 0.14))',
  border: '1px solid rgba(125, 211, 252, 0.42)',
  color: '#d3f0ff',
};

function buildRoutePath(template: string, id: string): string {
  return template.replace(':id', encodeURIComponent(id));
}

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return '';
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function toMediaItems(media: readonly MediaAsset[]): MediaItem[] {
  return media.map((asset, index) => ({
    id: asset.id,
    kind: asset.urlOrPath.toLowerCase().endsWith('.mp4') ? 'Video' : 'Image',
    label: `${asset.sourceType === 'scraped' ? 'Scraped' : 'Uploaded'} asset ${index + 1}`,
    source: asset.urlOrPath,
  }));
}

function buildVariant(title: string, description: string, index: number): GeneratedVariant {
  const safeTitle = title.trim() || 'Approved product';
  const shortDescription = description.trim() || 'Curated content ready for publishing.';

  return {
    id: `variant-${index}`,
    hook: `${index}. ${safeTitle} — stop-scroll concept`,
    caption: `${shortDescription} #launch #social #kontentku`,
  };
}

function buildVariants(title: string, description: string, startIndex: number, count: number): GeneratedVariant[] {
  return Array.from({ length: count }, (_, offset) => buildVariant(title, description, startIndex + offset));
}

function readErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string') {
    return payload.message;
  }

  return fallback;
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

export function ReviewGate() {
  const [productUrl, setProductUrl] = useState('');
  const [snapshot, setSnapshot] = useState<ProductSnapshot | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('No snapshot yet');
  const [generated, setGenerated] = useState<GeneratedVariant[]>([]);
  const nextBatchSizeRef = useRef(1);

  const canScrape = productUrl.trim().length > 0 && !isBusy;
  const canApprove = snapshot?.status === 'draft' && title.trim().length > 0 && description.trim().length > 0 && !isBusy;
  const canGenerate = snapshot?.status === 'approved' && !isBusy;

  const approvalStateLabel = useMemo(() => {
    if (snapshot?.status === 'approved') {
      return 'Approved snapshot';
    }

    if (snapshot) {
      return 'Awaiting approval';
    }

    return 'No snapshot yet';
  }, [snapshot]);

  const applySnapshotResponse = (nextSnapshot: ProductSnapshot): void => {
    setSnapshot(nextSnapshot);
    setTitle(nextSnapshot.title);
    setDescription(nextSnapshot.description);
    setMediaItems(toMediaItems(nextSnapshot.media));
  };

  const persistDraft = async (overrides?: { title?: string; description?: string; media?: MediaItem[] }): Promise<boolean> => {
    if (snapshot === null || snapshot.status === 'approved') {
      return false;
    }

    try {
      const response = await fetch(buildRoutePath(apiRoutePaths.snapshotById, snapshot.id), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: overrides?.title ?? title,
          description: overrides?.description ?? description,
          media:
            overrides?.media?.map((asset) => ({
              id: asset.id,
              snapshotId: snapshot.id,
              sourceType: 'scraped',
              urlOrPath: asset.source,
              isActive: true,
            })) ?? snapshot.media,
        }),
      });

      const payload = await readJson(response);

      if (!response.ok) {
        setErrorMessage(readErrorMessage(payload, 'Failed to save snapshot changes.'));
        return false;
      }

      applySnapshotResponse((payload as { snapshot: ProductSnapshot }).snapshot);
      setStatusMessage('Draft changes saved');

      return true;
    } catch {
      setErrorMessage('Failed to save snapshot changes.');
      return false;
    }
  };

  const handleScrape = async () => {
    setIsBusy(true);
    setErrorMessage(null);

    try {
      const normalizedUrl = normalizeUrl(productUrl);

      const response = await fetch(apiRoutePaths.scrape, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: normalizedUrl }),
      });

      const payload = await readJson(response);

      if (!response.ok) {
        setErrorMessage(readErrorMessage(payload, 'Scrape failed.'));
        return;
      }

      const nextSnapshot = (payload as { snapshot: ProductSnapshot }).snapshot;

      applySnapshotResponse(nextSnapshot);
      setGenerated([]);
      nextBatchSizeRef.current = 1;
      setStatusMessage(`Loaded snapshot ${nextSnapshot.id}`);
    } catch {
      setErrorMessage('Scrape failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleApprove = async () => {
    if (!(await persistDraft())) {
      return;
    }

    if (snapshot === null) {
      return;
    }

    setIsBusy(true);
    setErrorMessage(null);

    try {
      const response = await fetch(buildRoutePath(apiRoutePaths.approveSnapshotById, snapshot.id), {
        method: 'POST',
      });

      const payload = await readJson(response);

      if (!response.ok) {
        setErrorMessage(readErrorMessage(payload, 'Approval failed.'));
        return;
      }

      applySnapshotResponse((payload as { snapshot: ProductSnapshot }).snapshot);
      setStatusMessage('Snapshot approved');
    } catch {
      setErrorMessage('Approval failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleGenerate = async () => {
    if (snapshot === null || snapshot.status !== 'approved') {
      return;
    }

    setIsBusy(true);
    setErrorMessage(null);

    try {
      const requestedCount = nextBatchSizeRef.current;
      const response = await fetch(apiRoutePaths.generate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snapshotId: snapshot.id,
          contentCount: requestedCount,
          duration: '15s',
          language: 'en',
        }),
      });

      const payload = await readJson(response);

      if (!response.ok) {
        setErrorMessage(readErrorMessage(payload, 'Generate failed.'));
        return;
      }

      const summary = (payload as { summary: { successCount: number } }).summary;

      setGenerated((current) => [...current, ...buildVariants(title, description, current.length + 1, summary.successCount)]);
      nextBatchSizeRef.current = requestedCount + 1;
      setStatusMessage(`Generated ${summary.successCount} approved-content variant(s)`);
    } catch {
      setErrorMessage('Generate failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleGenerateMore = async () => {
    if (snapshot === null || snapshot.status !== 'approved') {
      return;
    }

    setIsBusy(true);
    setErrorMessage(null);

    try {
      const requestedCount = nextBatchSizeRef.current;
      const response = await fetch(apiRoutePaths.generateMore, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snapshotId: snapshot.id,
          contentCount: requestedCount,
        }),
      });

      const payload = await readJson(response);

      if (!response.ok) {
        setErrorMessage(readErrorMessage(payload, 'Generate more failed.'));
        return;
      }

      const summary = (payload as { summary: { successCount: number } }).summary;

      setGenerated((current) => [...current, ...buildVariants(title, description, current.length + 1, summary.successCount)]);
      nextBatchSizeRef.current = requestedCount + 1;
      setStatusMessage(`Generated more: ${summary.successCount} accepted`);
    } catch {
      setErrorMessage('Generate more failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemoveMedia = async (id: string) => {
    const nextMedia = mediaItems.filter((item) => item.id !== id);
    setMediaItems(nextMedia);
    await persistDraft({ media: nextMedia });
  };

  return (
    <main>
      <section className="surface shell" style={{ display: 'grid', gap: 18 }}>
        <div className="topbar" style={{ marginBottom: 0 }}>
          <div>
            <div className="eyebrow">Kontentku / review gate</div>
            <h1 className="title" style={{ fontSize: 'clamp(1.75rem, 3.3vw, 2.8rem)' }}>
              Review, curate, and approve before content generation.
            </h1>
            <p className="subtitle" style={{ maxWidth: '58ch' }}>
              URL → scrape → review/edit → approve snapshot → generate → generate more.
            </p>
          </div>
          <div className="pill" style={{ alignSelf: 'start' }}>
            <span className="pill-dot" />
            {approvalStateLabel}
          </div>
        </div>

        <section className="hero" style={{ gridTemplateColumns: '1.55fr 1fr' }}>
          <article className="card" style={{ display: 'grid', gap: 16 }}>
            <div className="stack" style={{ gap: 10 }}>
              <label htmlFor="product-url" className="eyebrow" style={{ letterSpacing: '0.12em' }}>
                Product URL
              </label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <input
                  id="product-url"
                  name="product-url"
                  value={productUrl}
                  onChange={(event) => setProductUrl(event.target.value)}
                  placeholder="https://vt.tokopedia.com/t/xxxxx"
                  type="url"
                  style={{ ...fieldStyle, flex: '1 1 380px', minWidth: 0 }}
                  disabled={isBusy}
                />
                <button
                  type="button"
                  onClick={() => void handleScrape()}
                  disabled={!canScrape}
                  style={{ ...primaryButtonStyle, opacity: canScrape ? 1 : 0.48, cursor: canScrape ? 'pointer' : 'not-allowed' }}
                >
                  Scrape
                </button>
              </div>
            </div>

            <div className="stack" style={{ gap: 10 }}>
              <label htmlFor="draft-title" className="eyebrow" style={{ letterSpacing: '0.12em' }}>
                Editable title
              </label>
              <input
                id="draft-title"
                name="draft-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onBlur={() => void persistDraft({ title })}
                placeholder="Scraped title appears here"
                style={fieldStyle}
                disabled={snapshot?.status === 'approved' || isBusy}
              />
            </div>

            <div className="stack" style={{ gap: 10 }}>
              <label htmlFor="draft-description" className="eyebrow" style={{ letterSpacing: '0.12em' }}>
                Editable description
              </label>
              <textarea
                id="draft-description"
                name="draft-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                onBlur={() => void persistDraft({ description })}
                rows={4}
                placeholder="Scraped description appears here"
                style={{ ...fieldStyle, resize: 'vertical', minHeight: 110 }}
                disabled={snapshot?.status === 'approved' || isBusy}
              />
            </div>

            <div className="stack" style={{ gap: 10 }}>
              <div className="eyebrow" style={{ letterSpacing: '0.12em' }}>
                Media list ({mediaItems.length})
              </div>
              <ul className="list">
                {mediaItems.length > 0 ? (
                  mediaItems.map((item) => (
                    <li className="list-item" key={item.id} style={{ alignItems: 'center' }}>
                      <div>
                        <strong>{item.label}</strong>
                        <span>
                          {item.kind} · {item.source}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleRemoveMedia(item.id)}
                        disabled={snapshot?.status === 'approved' || isBusy}
                        style={{
                          ...actionButtonStyle,
                          padding: '8px 10px',
                          borderRadius: 10,
                          background: 'rgba(248, 113, 113, 0.12)',
                          border: '1px solid rgba(248, 113, 113, 0.34)',
                          color: '#fecaca',
                          opacity: snapshot?.status === 'approved' || isBusy ? 0.6 : 1,
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="list-item">
                    <div>
                      <strong>No media selected</strong>
                      <span>Scrape https://vt.tokopedia.com/t/xxxxx to load assets, then curate the list.</span>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </article>

          <aside className="card" style={{ display: 'grid', gap: 14 }}>
            <div className="stack" style={{ gap: 6 }}>
              <span className="eyebrow">Workflow actions</span>
              <p>Approve to unlock generation. Any title, description, or media edit returns the gate to pending.</p>
              <p style={{ color: 'var(--muted)', margin: 0 }}>{statusMessage}</p>
              {errorMessage ? <p style={{ color: '#fecaca', margin: 0 }}>{errorMessage}</p> : null}
            </div>

            <button
              type="button"
              onClick={() => void handleApprove()}
              disabled={!canApprove}
              style={{
                ...primaryButtonStyle,
                opacity: canApprove ? 1 : 0.5,
                cursor: canApprove ? 'pointer' : 'not-allowed',
              }}
            >
              Approve & Continue
            </button>

            <button
              type="button"
              onClick={() => void handleGenerate()}
              disabled={!canGenerate}
              style={{
                ...actionButtonStyle,
                opacity: canGenerate ? 1 : 0.5,
                cursor: canGenerate ? 'pointer' : 'not-allowed',
              }}
            >
              Generate
            </button>

            {generated.length > 0 ? (
              <button type="button" onClick={() => void handleGenerateMore()} style={actionButtonStyle} disabled={!canGenerate}>
                Generate More
              </button>
            ) : null}

            <div className="stack" style={{ gap: 8 }}>
              <span className="eyebrow">Generated variants ({generated.length})</span>
              <ul className="list">
                {generated.length > 0 ? (
                  generated.map((variant) => (
                    <li className="list-item" key={variant.id} style={{ display: 'grid', gap: 6 }}>
                      <strong>{variant.hook}</strong>
                      <span>{variant.caption}</span>
                    </li>
                  ))
                ) : (
                  <li className="list-item">
                    <div>
                      <strong>No output yet</strong>
                      <span>Generate stays disabled until the snapshot is approved.</span>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
