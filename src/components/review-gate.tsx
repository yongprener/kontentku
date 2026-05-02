'use client';

import { useMemo, useState, type CSSProperties } from 'react';

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

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();

  if (!trimmed) {
    return '';
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function deriveDraftFromUrl(rawUrl: string): { title: string; description: string; media: MediaItem[] } {
  const normalized = normalizeUrl(rawUrl);

  if (!normalized) {
    return {
      title: '',
      description: '',
      media: [],
    };
  }

  let host = 'product';

  try {
    host = new URL(normalized).hostname.replace(/^www\./, '').split('.')[0] || 'product';
  } catch {
    host = 'product';
  }

  const displayHost = host.charAt(0).toUpperCase() + host.slice(1);

  return {
    title: `${displayHost} spotlight bundle`,
    description: `High-intent product snapshot from ${normalized}. Review, curate media, and approve before generation.`,
    media: [
      {
        id: 'media-1',
        kind: 'Image',
        label: `${displayHost} hero angle`,
        source: 'Scraped asset',
      },
      {
        id: 'media-2',
        kind: 'Image',
        label: `${displayHost} detail shot`,
        source: 'Scraped asset',
      },
      {
        id: 'media-3',
        kind: 'Video',
        label: `${displayHost} lifestyle clip`,
        source: 'Scraped asset',
      },
    ],
  };
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

export function ReviewGate() {
  const [productUrl, setProductUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isApproved, setIsApproved] = useState(false);
  const [hasScraped, setHasScraped] = useState(false);
  const [generated, setGenerated] = useState<GeneratedVariant[]>([]);

  const canScrape = productUrl.trim().length > 0;
  const canApprove = hasScraped && title.trim().length > 0 && description.trim().length > 0;
  const canGenerate = isApproved;

  const approvalStateLabel = useMemo(() => {
    if (isApproved) {
      return 'Approved snapshot';
    }

    if (hasScraped) {
      return 'Awaiting approval';
    }

    return 'No snapshot yet';
  }, [hasScraped, isApproved]);

  const handleScrape = () => {
    const draft = deriveDraftFromUrl(productUrl);

    setTitle(draft.title);
    setDescription(draft.description);
    setMediaItems(draft.media);
    setIsApproved(false);
    setGenerated([]);
    setHasScraped(true);
  };

  const handleEditTitle = (nextTitle: string) => {
    setTitle(nextTitle);
    setIsApproved(false);
  };

  const handleEditDescription = (nextDescription: string) => {
    setDescription(nextDescription);
    setIsApproved(false);
  };

  const handleRemoveMedia = (id: string) => {
    setMediaItems((current) => current.filter((item) => item.id !== id));
    setIsApproved(false);
  };

  const handleApprove = () => {
    if (!canApprove) {
      return;
    }

    setIsApproved(true);
  };

  const handleGenerate = () => {
    if (!canGenerate) {
      return;
    }

    setGenerated((current) => [...current, buildVariant(title, description, current.length + 1)]);
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
              This local-only flow mirrors the dashboard gate: scrape from URL, edit snapshot fields, prune media,
              approve, then unlock generation.
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
                  placeholder="https://brand.com/product"
                  style={{ ...fieldStyle, flex: '1 1 380px', minWidth: 0 }}
                />
                <button
                  type="button"
                  onClick={handleScrape}
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
                onChange={(event) => handleEditTitle(event.target.value)}
                placeholder="Scraped title appears here"
                style={fieldStyle}
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
                onChange={(event) => handleEditDescription(event.target.value)}
                rows={4}
                placeholder="Scraped description appears here"
                style={{ ...fieldStyle, resize: 'vertical', minHeight: 110 }}
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
                        onClick={() => handleRemoveMedia(item.id)}
                        style={{
                          ...actionButtonStyle,
                          padding: '8px 10px',
                          borderRadius: 10,
                          background: 'rgba(248, 113, 113, 0.12)',
                          border: '1px solid rgba(248, 113, 113, 0.34)',
                          color: '#fecaca',
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
                      <span>Scrape a product URL to load assets, then curate the list.</span>
                    </div>
                  </li>
                )}
              </ul>
            </div>
          </article>

          <aside className="card" style={{ display: 'grid', gap: 14 }}>
            <div className="stack" style={{ gap: 6 }}>
              <span className="eyebrow">Workflow actions</span>
              <p>
                Approve to unlock generation. Any title, description, or media edit returns the gate to pending.
              </p>
            </div>

            <button
              type="button"
              onClick={handleApprove}
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
              onClick={handleGenerate}
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
              <button type="button" onClick={handleGenerate} style={actionButtonStyle}>
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
