'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { apiRoutePaths } from '@/lib/api/contracts';
import type { MediaAsset, ProductSnapshot } from '@/lib/domain/contracts';

type MediaItem = {
  id: string;
  kind: 'Image' | 'Video';
  label: string;
  source: string;
};

type DurationTarget = '15s' | '25s' | '35s';
type LanguageTarget = 'id' | 'en';
type AngleTarget = '' | 'problem_solution' | 'testimonial_style' | 'comparison' | 'how_to' | 'benefit_showcase';
type ReviewTab = 'subtitle' | 'hook';
type VariantStatus = 'Siap' | 'Gagal' | 'Sedang Retry';

type SubtitleRow = {
  id: string;
  start: string;
  end: string;
  text: string;
  desyncSeconds: number;
};

type GeneratedVariant = {
  id: string;
  index: number;
  title: string;
  caption: string;
  hashtags: [string, string, string];
  status: VariantStatus;
  previewSeed: number;
  durationLabel: string;
  hook: string;
  reviewRows: SubtitleRow[];
  retryCount: number;
};

const durationOptions: Array<{ value: DurationTarget; label: string; helper: string }> = [
  { value: '15s', label: '15 detik', helper: '4–6 scene' },
  { value: '25s', label: '25 detik', helper: '7–10 scene' },
  { value: '35s', label: '35 detik', helper: '11–14 scene' },
];

const languageOptions: Array<{ value: LanguageTarget; label: string }> = [
  { value: 'id', label: 'Indonesia' },
  { value: 'en', label: 'English' },
];

const angleOptions: Array<{ value: AngleTarget; label: string }> = [
  { value: '', label: '(Auto)' },
  { value: 'problem_solution', label: 'Problem — Solution' },
  { value: 'testimonial_style', label: 'Testimonial Style' },
  { value: 'comparison', label: 'Comparison' },
  { value: 'how_to', label: 'How To' },
  { value: 'benefit_showcase', label: 'Benefit Showcase' },
];

const progressStages = ['Extracting', 'Planning', 'Scripting', 'TTS', 'Rendering', 'Thumbnail', 'Packaging'] as const;

const previewGradients = [
  'linear-gradient(160deg, #f7ede2 0%, #d7c5a8 55%, #6b7280 100%)',
  'linear-gradient(160deg, #f0d9b5 0%, #7f5f3f 50%, #2f2620 100%)',
  'linear-gradient(160deg, #e6d8c9 0%, #f5f0ea 52%, #9ca3af 100%)',
  'linear-gradient(160deg, #ece8df 0%, #d4d8de 50%, #303846 100%)',
  'linear-gradient(160deg, #f4f1ec 0%, #cfd8e3 52%, #818181 100%)',
];

const recentProjects = [
  { title: 'Sikat Pembersih Sepatu', meta: '15 detik · ID · 5 video', status: 'Selesai', tone: 'success' as const },
  { title: 'Lampu Tidur LED', meta: '25 detik · ID · 5 video', status: 'Selesai', tone: 'accent' as const },
  { title: 'Alat Pel Lantai', meta: '35 detik · ID · 5 video', status: 'Generating', tone: 'warning' as const },
];

const sidebarItems = [
  { label: 'Dashboard', icon: '⌂', active: true },
  { label: 'Projects', icon: '▣', active: false },
  { label: 'Settings', icon: '⚙', active: false },
  { label: 'Help', icon: '◌', active: false },
];

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

function readErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'object' && payload !== null && 'message' in payload && typeof payload.message === 'string') {
    return payload.message;
  }

  return fallback;
}

async function readJson(response: Response): Promise<unknown> {
  return response.json().catch(() => null);
}

function buildHashtags(title: string, index: number): [string, string, string] {
  const tokens = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const first = tokens[0] ?? 'produk';
  const second = tokens[1] ?? tokens[0] ?? 'review';

  return [`#${first}`, `#${second}`, `#video${index}`];
}

function buildSubtitleRows(title: string, index: number): SubtitleRow[] {
  const base = title.trim() || 'Produk ini';

  return [
    { id: `${index}-1`, start: '00:00', end: '00:03', text: `${base} bikin hasil lebih cepat terlihat.`, desyncSeconds: 0.2 },
    { id: `${index}-2`, start: '00:03', end: '00:07', text: 'Pakai angle yang tepat untuk menonjolkan manfaat utama.', desyncSeconds: 0.7 },
    { id: `${index}-3`, start: '00:07', end: '00:15', text: 'Cek hasilnya sebelum stok habis.', desyncSeconds: 0.3 },
  ];
}

function formatAngle(value: AngleTarget): string {
  return angleOptions.find((option) => option.value === value)?.label ?? '(Auto)';
}

function formatDurationLabel(value: DurationTarget): string {
  return durationOptions.find((option) => option.value === value)?.label ?? value;
}

function buildVariant(
  title: string,
  description: string,
  index: number,
  duration: DurationTarget,
  language: LanguageTarget,
  angle: AngleTarget,
): GeneratedVariant {
  const safeTitle = title.trim() || 'Approved product';
  const safeDescription = description.trim() || 'Curated content ready for publishing.';
  const statusCycle: VariantStatus[] = ['Siap', 'Gagal', 'Sedang Retry', 'Siap', 'Siap'];
  const variantLabel = `Video ${String(index).padStart(2, '0')}`;
  const angleLabel = formatAngle(angle).replace(' — ', ' · ');

  return {
    id: `variant-${index}`,
    index,
    title: `${safeTitle} — ${variantLabel}`,
    caption: `${safeDescription} · ${angleLabel} · ${language === 'id' ? 'siap posting' : 'ready to post'}`,
    hashtags: buildHashtags(safeTitle, index),
    status: statusCycle[(index - 1) % statusCycle.length],
    previewSeed: (index - 1) % previewGradients.length,
    durationLabel: formatDurationLabel(duration),
    hook: `${index}. ${safeTitle} — stop-scroll concept`,
    reviewRows: buildSubtitleRows(safeTitle, index),
    retryCount: 0,
  };
}

function buildVariants(
  title: string,
  description: string,
  startIndex: number,
  count: number,
  duration: DurationTarget,
  language: LanguageTarget,
  angle: AngleTarget,
): GeneratedVariant[] {
  return Array.from({ length: count }, (_, offset) => buildVariant(title, description, startIndex + offset, duration, language, angle));
}

function formatCopyBlock(variant: GeneratedVariant): string {
  return [variant.title, variant.caption, '', variant.hashtags.join(' ')].join('\n');
}

export function ReviewGate() {
  const [productUrl, setProductUrl] = useState('');
  const [snapshot, setSnapshot] = useState<ProductSnapshot | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isBusy, setIsBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Siap menunggu URL produk');
  const [generated, setGenerated] = useState<GeneratedVariant[]>([]);
  const [durationTarget, setDurationTarget] = useState<DurationTarget>('25s');
  const [languageTarget, setLanguageTarget] = useState<LanguageTarget>('id');
  const [angleTarget, setAngleTarget] = useState<AngleTarget>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);
  const [reviewTab, setReviewTab] = useState<ReviewTab>('subtitle');
  const [reviewRows, setReviewRows] = useState<SubtitleRow[]>([]);
  const [reviewCurrentHook, setReviewCurrentHook] = useState('');
  const [reviewGeneratedHook, setReviewGeneratedHook] = useState('');
  const [isGeneratingHook, setIsGeneratingHook] = useState(false);
  const [isSavingReview, setIsSavingReview] = useState(false);
  const timersRef = useRef<number[]>([]);

  const selectedVariant = useMemo(
    () => generated.find((variant) => variant.id === selectedVariantId) ?? null,
    [generated, selectedVariantId],
  );

  const canScrape = productUrl.trim().length > 0 && !isBusy;
  const canApprove = snapshot?.status === 'draft' && title.trim().length > 0 && description.trim().length > 0 && !isBusy;
  const canGenerate = snapshot?.status === 'approved' && !isBusy;

  const workflowLabel = useMemo(() => {
    if (isBusy) {
      return 'Sedang membuat video kamu...';
    }

    if (generated.length > 0) {
      return 'Hasil video siap';
    }

    if (snapshot?.status === 'approved') {
      return 'Snapshot sudah disetujui';
    }

    if (snapshot) {
      return 'Menunggu approval';
    }

    return 'Belum ada snapshot';
  }, [generated.length, isBusy, snapshot]);

  const workflowHint = useMemo(() => {
    if (isBusy) {
      return 'Tunggu sebentar, hampir selesai!';
    }

    if (generated.length > 0) {
      return 'Review, retry, atau regenerate hook langsung dari kartu video.';
    }

    return 'Paste URL, pilih durasi, bahasa, dan angle sebelum approval.';
  }, [generated.length, isBusy]);

  const progressValue = useMemo(() => {
    if (isBusy) {
      return 62;
    }

    if (generated.length > 0) {
      return 100;
    }

    if (snapshot?.status === 'approved') {
      return 38;
    }

    if (snapshot) {
      return 18;
    }

    return 8;
  }, [generated.length, isBusy, snapshot]);

  const activeStageIndex = useMemo(() => {
    if (isBusy) {
      return 4;
    }

    if (generated.length > 0) {
      return progressStages.length - 1;
    }

    if (snapshot?.status === 'approved') {
      return 2;
    }

    if (snapshot) {
      return 0;
    }

    return -1;
  }, [generated.length, isBusy, snapshot]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => window.clearTimeout(timer));
      timersRef.current = [];
    };
  }, []);

  const scheduleTimer = (callback: () => void, delay: number): void => {
    const timer = window.setTimeout(callback, delay);
    timersRef.current.push(timer);
  };

  const updateGeneratedVariant = (variantId: string, updater: (variant: GeneratedVariant) => GeneratedVariant): void => {
    setGenerated((current) => current.map((variant) => (variant.id === variantId ? updater(variant) : variant)));
  };

  const applySnapshotResponse = (nextSnapshot: ProductSnapshot): void => {
    setSnapshot(nextSnapshot);
    setTitle(nextSnapshot.title);
    setDescription(nextSnapshot.description);
    setMediaItems(toMediaItems(nextSnapshot.media));
  };

  const handleScrape = async (): Promise<void> => {
    setIsBusy(true);
    setErrorMessage(null);

    try {
      const response = await fetch(apiRoutePaths.scrape, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: normalizeUrl(productUrl) }),
      });

      const payload = await readJson(response);

      if (!response.ok) {
        setErrorMessage(readErrorMessage(payload, 'Scrape failed.'));
        return;
      }

      const nextSnapshot = (payload as { snapshot: ProductSnapshot }).snapshot;

      applySnapshotResponse(nextSnapshot);
      setGenerated([]);
      setSelectedVariantId(null);
      setStatusMessage(`Snapshot dimuat: ${nextSnapshot.id}`);
    } catch {
      setErrorMessage('Scrape failed.');
    } finally {
      setIsBusy(false);
    }
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

  const handleApprove = async (): Promise<void> => {
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

  const handleGenerate = async (): Promise<void> => {
    if (snapshot === null || snapshot.status !== 'approved') {
      return;
    }

    setIsBusy(true);
    setErrorMessage(null);

    try {
      const response = await fetch(apiRoutePaths.generate, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snapshotId: snapshot.id,
          contentCount: 5,
          duration: durationTarget,
          language: languageTarget,
          ...(angleTarget ? { angle: angleTarget } : {}),
        }),
      });

      const payload = await readJson(response);

      if (!response.ok) {
        setErrorMessage(readErrorMessage(payload, 'Generate failed.'));
        return;
      }

      const summary = (payload as { summary: { successCount: number } }).summary;
      const nextStartIndex = generated.length + 1;

      setGenerated((current) => [
        ...current,
        ...buildVariants(title, description, nextStartIndex, summary.successCount || 5, durationTarget, languageTarget, angleTarget),
      ]);
      setStatusMessage(`Generated ${summary.successCount} approved-content variant(s)`);
      setSelectedVariantId(null);
    } catch {
      setErrorMessage('Generate failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleGenerateMore = async (count: 5 | 10): Promise<void> => {
    if (snapshot === null || snapshot.status !== 'approved') {
      return;
    }

    setIsBusy(true);
    setErrorMessage(null);

    try {
      const response = await fetch(apiRoutePaths.generateMore, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          snapshotId: snapshot.id,
          contentCount: count,
        }),
      });

      const payload = await readJson(response);

      if (!response.ok) {
        setErrorMessage(readErrorMessage(payload, 'Generate more failed.'));
        return;
      }

      const summary = (payload as { summary: { successCount: number } }).summary;
      const nextStartIndex = generated.length + 1;

      setGenerated((current) => [
        ...current,
        ...buildVariants(title, description, nextStartIndex, summary.successCount || count, durationTarget, languageTarget, angleTarget),
      ]);
      setStatusMessage(`Generated more: ${summary.successCount} accepted`);
    } catch {
      setErrorMessage('Generate more failed.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemoveMedia = async (id: string): Promise<void> => {
    const nextMedia = mediaItems.filter((item) => item.id !== id);
    setMediaItems(nextMedia);
    await persistDraft({ media: nextMedia });
  };

  const handleCopyVariant = async (variant: GeneratedVariant): Promise<void> => {
    try {
      await navigator.clipboard.writeText(formatCopyBlock(variant));
      setStatusMessage(`Copied ${variant.title}`);
    } catch {
      setStatusMessage('Clipboard tidak tersedia.');
    }
  };

  const handleDownloadVariant = (variant: GeneratedVariant, kind: 'MP4' | 'Thumbnail'): void => {
    setStatusMessage(`${kind} diminta untuk ${variant.title}`);
  };

  const openReviewModal = (variant: GeneratedVariant): void => {
    setSelectedVariantId(variant.id);
    setReviewTab('subtitle');
    setReviewRows(variant.reviewRows.map((row) => ({ ...row })));
    setReviewCurrentHook(variant.hook);
    setReviewGeneratedHook('');
    setIsGeneratingHook(false);
    setIsSavingReview(false);
  };

  const closeReviewModal = (): void => {
    setSelectedVariantId(null);
    setReviewRows([]);
    setReviewCurrentHook('');
    setReviewGeneratedHook('');
    setReviewTab('subtitle');
    setIsGeneratingHook(false);
    setIsSavingReview(false);
  };

  const handleAddSubtitleRow = (): void => {
    setReviewRows((current) => {
      const index = current.length + 1;
      return [
        ...current,
        { id: `row-${Date.now()}`, start: '00:00', end: '00:02', text: `Baris subtitle baru ${index}`, desyncSeconds: 0.1 },
      ];
    });
  };

  const handleSubtitleRowChange = (rowId: string, field: keyof SubtitleRow, value: string): void => {
    setReviewRows((current) =>
      current.map((row) => {
        if (row.id !== rowId) {
          return row;
        }

        return {
          ...row,
          [field]: field === 'desyncSeconds' ? Number(value) : value,
        };
      }),
    );
  };

  const handleDeleteSubtitleRow = (rowId: string): void => {
    setReviewRows((current) => current.filter((row) => row.id !== rowId));
  };

  const handleGenerateHook = (): void => {
    if (selectedVariant === null) {
      return;
    }

    setIsGeneratingHook(true);
    scheduleTimer(() => {
      const nextHook = `Hook baru untuk ${selectedVariant.title.toLowerCase()} dengan angle ${formatAngle(angleTarget).toLowerCase()}.`;
      setReviewGeneratedHook(nextHook);
      setIsGeneratingHook(false);
      setStatusMessage(`Hook baru dihasilkan untuk ${selectedVariant.title}`);
    }, 650);
  };

  const handleUseHookAndRerender = (): void => {
    if (selectedVariant === null) {
      return;
    }

    const nextHook = reviewGeneratedHook.trim() || reviewCurrentHook.trim();

    if (!nextHook) {
      return;
    }

    setIsSavingReview(true);
    updateGeneratedVariant(selectedVariant.id, (variant) => ({
      ...variant,
      hook: nextHook,
      status: 'Sedang Retry',
      retryCount: variant.retryCount + 1,
    }));

    setStatusMessage(`Re-render dimulai untuk ${selectedVariant.title}`);
    scheduleTimer(() => {
      updateGeneratedVariant(selectedVariant.id, (variant) => ({
        ...variant,
        hook: nextHook,
        status: 'Siap',
      }));
      setIsSavingReview(false);
      setStatusMessage(`Variant selesai di-render ulang: ${selectedVariant.title}`);
    }, 1200);
  };

  const handleSaveSubtitleAndRerender = (): void => {
    if (selectedVariant === null) {
      return;
    }

    setIsSavingReview(true);
    updateGeneratedVariant(selectedVariant.id, (variant) => ({
      ...variant,
      reviewRows: reviewRows.map((row) => ({ ...row })),
      status: 'Sedang Retry',
      retryCount: variant.retryCount + 1,
    }));

    setStatusMessage(`Subtitle disimpan untuk ${selectedVariant.title}`);
    scheduleTimer(() => {
      updateGeneratedVariant(selectedVariant.id, (variant) => ({
        ...variant,
        reviewRows: reviewRows.map((row) => ({ ...row })),
        status: 'Siap',
      }));
      setIsSavingReview(false);
      setStatusMessage(`Re-render subtitle selesai: ${selectedVariant.title}`);
    }, 1200);
  };

  const primaryAction = snapshot === null
    ? { label: 'Scrape & Load', onClick: handleScrape, disabled: !canScrape }
    : snapshot.status === 'draft'
      ? { label: 'Approve & Continue', onClick: handleApprove, disabled: !canApprove }
      : { label: 'Generate 3–5 Video', onClick: handleGenerate, disabled: !canGenerate };

  const currentProjectName = snapshot?.title?.trim() || 'Sikat Pembersih Sepatu';
  const currentProjectMeta = `${formatDurationLabel(durationTarget)} · ${languageOptions.find((option) => option.value === languageTarget)?.label ?? 'Indonesia'} · ${snapshot ? 'Live' : 'Preview'}`;
  const resultLabel = generated.length > 0 ? `Hasil Video (${generated.length} Variasi)` : 'Hasil Video';

  return (
    <main className="app-shell">
      <aside className="sidebar surface">
        <div className="brand">
          <div className="brand-mark">▶</div>
          <div className="brand-copy">
            <strong>AI Affiliate</strong>
            <span>Video Generator</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {sidebarItems.map((item) => (
            <button key={item.label} type="button" className={`sidebar-item${item.active ? ' is-active' : ''}`}>
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-links">
          <button type="button" className="sidebar-item">
            <span className="sidebar-icon">⚙</span>
            <span>Settings</span>
          </button>
          <button type="button" className="sidebar-item">
            <span className="sidebar-icon">◌</span>
            <span>Help</span>
          </button>
        </div>

        <div className="creator-card">
          <div className="avatar">C</div>
          <div>
            <strong>Creator</strong>
            <span>Personal Plan</span>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header surface">
          <div className="breadcrumbs">
            <span>Dashboard</span>
            <span>Projects</span>
            <span>{currentProjectName}</span>
          </div>

          <div className="header-actions">
            <span className="status-pill success">Credits: Unlimited</span>
            <button type="button" className="icon-button" aria-label="Open settings">
              ⚙
            </button>
          </div>
        </header>

        <div className="workspace-grid">
          <section className="panel panel-hero">
            <div className="hero-copy">
              <h1>Buat Video Affiliate Dari Satu URL Produk</h1>
              <p>Hasilkan 3–5 video siap posting dalam hitungan menit.</p>
            </div>

            <div className="controls-grid">
              <div className="control-group control-group-wide">
                <label htmlFor="product-url" className="field-label">
                  1. URL Produk
                </label>
                <div className="inline-actions">
                  <input
                    id="product-url"
                    name="product-url"
                    value={productUrl}
                    onChange={(event) => setProductUrl(event.target.value)}
                    placeholder="https://vt.tokopedia.com/t/xxxxx"
                    type="url"
                    className="field"
                    disabled={isBusy}
                  />
                  <button type="button" className="button button-primary" onClick={() => void primaryAction.onClick()} disabled={primaryAction.disabled}>
                    {primaryAction.label}
                  </button>
                </div>
                <p className="field-caption">Contoh: link ke halaman produk di Shopee, Lazada, Tokopedia, dll.</p>
              </div>

              <div className="control-group">
                <span className="field-label">2. Durasi Video</span>
                <div className="toggle-group" role="tablist" aria-label="Video duration">
                  {durationOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`toggle${durationTarget === option.value ? ' is-active' : ''}`}
                      onClick={() => setDurationTarget(option.value)}
                      disabled={isBusy}
                    >
                      <strong>{option.label}</strong>
                      <span>{option.helper}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="control-group">
                <label htmlFor="language" className="field-label">
                  3. Bahasa
                </label>
                <select id="language" className="field" value={languageTarget} onChange={(event) => setLanguageTarget(event.target.value as LanguageTarget)} disabled={isBusy}>
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="control-group">
                <label htmlFor="angle" className="field-label">
                  4. Angle (Gaya Konten)
                </label>
                <select id="angle" className="field" value={angleTarget} onChange={(event) => setAngleTarget(event.target.value as AngleTarget)} disabled={isBusy}>
                  {angleOptions.map((option) => (
                    <option key={option.value || 'auto'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="control-group control-group-wide">
                <span className="field-label">5. Upload Gambar (Optional)</span>
                <p className="field-caption">Upload hingga 5 gambar produk untuk hasil lebih maksimal.</p>
                <div className="asset-grid">
                  {mediaItems.length > 0 ? (
                    mediaItems.map((item, index) => (
                      <article key={item.id} className="asset-card">
                        <div className="asset-thumb">
                          <span>{String(index + 1).padStart(2, '0')}</span>
                        </div>
                        <div className="asset-content">
                          <strong>{item.label}</strong>
                          <span>{item.kind}</span>
                        </div>
                        <button
                          type="button"
                          className="asset-action"
                          onClick={() => void handleRemoveMedia(item.id)}
                          disabled={snapshot?.status === 'approved' || isBusy}
                        >
                          Remove
                        </button>
                      </article>
                    ))
                  ) : (
                    <div className="asset-empty">Belum ada gambar yang tersinkron.</div>
                  )}

                  <button type="button" className="asset-card asset-card-add" disabled title="Upload lokal belum aktif di flow ini">
                    <div className="asset-thumb asset-thumb-add">+</div>
                    <div className="asset-content">
                      <strong>Tambah Gambar</strong>
                      <span>Opsional</span>
                    </div>
                  </button>
                </div>
              </div>

              <div className="control-group control-group-wide button-stack">
                <button type="button" className="button button-primary button-wide" onClick={() => void primaryAction.onClick()} disabled={primaryAction.disabled}>
                  {primaryAction.label}
                </button>
                <p className="field-caption">Estimasi: 3–5 menit</p>
              </div>
            </div>

            <div className="recent-block">
              <div className="section-head">
                <div>
                  <h2>Proyek Terbaru</h2>
                </div>
                <button type="button" className="link-button">
                  Lihat semua →
                </button>
              </div>

              <div className="recent-grid">
                {recentProjects.map((project, index) => (
                  <article key={project.title} className="recent-card">
                    <div className="recent-thumb" data-tone={project.tone}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                    </div>
                    <div className="recent-content">
                      <strong>{project.title}</strong>
                      <span>{project.meta}</span>
                    </div>
                    <span className={`recent-status ${project.tone}`}>{project.status}</span>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <aside className="panel panel-progress">
            <div className="progress-card">
              <div className="progress-head">
                <div>
                  <span className="status-pill progress">{isBusy ? 'Generating (60%)' : generated.length > 0 ? 'Selesai' : 'Draft'}</span>
                  <h2>{workflowLabel}</h2>
                  <p>{workflowHint}</p>
                </div>

                <div className="progress-metrics">
                  <strong>{isBusy ? '02:34' : generated.length > 0 ? '00:00' : '--:--'}</strong>
                  <span>Est. remaining: {isBusy ? '01:45' : generated.length > 0 ? 'done' : '--:--'}</span>
                </div>
              </div>

              <div className="progress-bar">
                <span style={{ width: `${progressValue}%` }} />
              </div>

              <div className="stage-tracker" aria-label="Progress tracker">
                {progressStages.map((stage, index) => {
                  const isComplete = activeStageIndex >= index;
                  const isActive = activeStageIndex === index;

                  return (
                    <div key={stage} className={`stage-step${isComplete ? ' is-complete' : ''}${isActive ? ' is-active' : ''}`}>
                      <span className="stage-dot" />
                      <span>{stage}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="results-section">
              <div className="section-head results-head">
                <div>
                  <h2>{resultLabel}</h2>
                  <p>{generated.length > 0 ? 'Selesai' : 'Belum ada hasil yang di-generate.'}</p>
                </div>

                {generated.length > 0 ? (
                  <div className="quick-actions">
                    <button type="button" className="button button-outline" onClick={() => void handleGenerateMore(5)} disabled={!canGenerate}>
                      + 5 Video
                    </button>
                    <button type="button" className="button button-primary" onClick={() => void handleGenerateMore(10)} disabled={!canGenerate}>
                      + 10 Video
                    </button>
                  </div>
                ) : null}
              </div>

              {generated.length > 0 ? (
                <>
                  <div className="results-grid">
                    {generated.map((variant) => (
                      <article key={variant.id} className="variant-card">
                        <div className="variant-preview" style={{ background: previewGradients[variant.previewSeed] }}>
                          <span className={`variant-badge ${variant.status === 'Siap' ? 'success' : variant.status === 'Gagal' ? 'danger' : 'warning'}`}>{variant.status}</span>
                          <span className="variant-index">{String(variant.index).padStart(2, '0')}</span>
                          <button type="button" className="variant-play" onClick={() => openReviewModal(variant)} aria-label={`Preview ${variant.title}`}>
                            ▶
                          </button>
                          <span className="variant-time">00:{variant.durationLabel.replace(' detik', '')}</span>
                        </div>

                        <div className="variant-body">
                          <div>
                            <strong className="variant-title">{variant.title}</strong>
                            <p className="variant-caption">{variant.caption}</p>
                          </div>

                          <div className="variant-meta">
                            <span>{variant.status}</span>
                            <span>{variant.hashtags.join(' ')}</span>
                          </div>

                          <div className="variant-actions">
                            <button type="button" className="button button-outline" onClick={() => void handleCopyVariant(variant)}>
                              Copy
                            </button>
                            <button type="button" className="button button-outline" onClick={() => handleDownloadVariant(variant, 'MP4')}>
                              Download MP4
                            </button>
                            <button type="button" className="button button-outline" onClick={() => handleDownloadVariant(variant, 'Thumbnail')}>
                              Download Thumbnail
                            </button>
                            <button type="button" className="button button-outline wide" onClick={() => openReviewModal(variant)}>
                              Review
                            </button>
                            <button
                              type="button"
                              className="button button-primary wide"
                              onClick={() => {
                                updateGeneratedVariant(variant.id, (current) => ({ ...current, status: 'Sedang Retry', retryCount: current.retryCount + 1 }));
                                setStatusMessage(`Retry queued for ${variant.title}`);
                                scheduleTimer(() => {
                                  updateGeneratedVariant(variant.id, (current) => ({ ...current, status: 'Siap' }));
                                  setStatusMessage(`Retry selesai untuk ${variant.title}`);
                                }, 1200);
                              }}
                              disabled={variant.status === 'Sedang Retry'}
                            >
                              Retry
                            </button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="bottom-actions">
                    <button type="button" className="button button-outline" onClick={() => void handleGenerateMore(5)} disabled={!canGenerate}>
                      + 5 Video
                    </button>
                    <button type="button" className="button button-primary" onClick={() => void handleGenerateMore(10)} disabled={!canGenerate}>
                      + 10 Video
                    </button>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <strong>No output yet</strong>
                  <span>Generate stays disabled until the snapshot is approved.</span>
                </div>
              )}
            </div>
          </aside>
        </div>

        <footer className="footer-bar surface">
          <div>
            <strong>{currentProjectName}</strong>
            <span>{currentProjectMeta}</span>
          </div>
          <div className="footer-status">
            <span className="status-pill success">{snapshot?.status === 'approved' ? 'Approved' : snapshot ? 'Draft' : 'Waiting'}</span>
            <span className="status-note">{statusMessage}</span>
          </div>
        </footer>
      </section>

      {selectedVariant ? (
        <div className="review-backdrop" role="presentation" onClick={closeReviewModal}>
          <section className="review-modal" role="dialog" aria-modal="true" aria-labelledby="review-modal-title" onClick={(event) => event.stopPropagation()}>
            <div className="review-header">
              <div>
                <h2 id="review-modal-title">Review Video #{String(selectedVariant.index).padStart(2, '0')}</h2>
                <p>{selectedVariant.title}</p>
              </div>
              <button type="button" className="icon-button" onClick={closeReviewModal} aria-label="Close review modal">
                ×
              </button>
            </div>

            <div className="review-tabs" role="tablist" aria-label="Review tabs">
              <button type="button" className={`review-tab${reviewTab === 'subtitle' ? ' is-active' : ''}`} onClick={() => setReviewTab('subtitle')}>
                Subtitle
              </button>
              <button type="button" className={`review-tab${reviewTab === 'hook' ? ' is-active' : ''}`} onClick={() => setReviewTab('hook')}>
                Regenerate Hook
              </button>
            </div>

            <div className="review-body">
              {reviewTab === 'subtitle' ? (
                <>
                  <div className="review-box">
                    <div className="field-label">Subtitle Rows</div>
                    <div className="review-rows">
                      {reviewRows.map((row) => (
                        <div key={row.id} className={`review-row${row.desyncSeconds > 0.5 ? ' is-warning' : ''}`}>
                          <div className="review-time">{row.start} — {row.end}</div>
                          <textarea className="field review-text" value={row.text} onChange={(event) => handleSubtitleRowChange(row.id, 'text', event.target.value)} />
                          <div className="review-row-actions">
                            {row.desyncSeconds > 0.5 ? <span className="review-warning">⚠</span> : <span className="review-warning review-warning-soft">✓</span>}
                            <button type="button" className="icon-button review-delete" onClick={() => handleDeleteSubtitleRow(row.id)} aria-label="Delete subtitle row">
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="review-footer">
                    <button type="button" className="button button-outline" onClick={handleAddSubtitleRow}>
                      Add Row
                    </button>
                    <div className="review-footer-actions">
                      <button type="button" className="button button-outline" onClick={closeReviewModal}>
                        Batal
                      </button>
                      <button type="button" className="button button-primary" onClick={handleSaveSubtitleAndRerender} disabled={isSavingReview}>
                        Simpan & Render Ulang
                      </button>
                    </div>
                  </div>
                  <p className="field-caption">Re-render memakan waktu ~1 menit</p>
                </>
              ) : (
                <>
                  <div className="review-box">
                    <div className="field-label">Hook Saat Ini</div>
                    <input className="field" value={reviewCurrentHook} readOnly />
                  </div>

                  <button type="button" className="button button-primary button-wide" onClick={handleGenerateHook} disabled={isGeneratingHook}>
                    {isGeneratingHook ? 'Generating Hook...' : 'Generate Hook Baru'}
                  </button>

                  <p className="field-caption">AI akan membuat hook baru berdasarkan angle yang sama</p>

                  {reviewGeneratedHook ? (
                    <div className="review-box">
                      <div className="review-label-row">
                        <div className="field-label">Hook Baru</div>
                        <span className="status-pill success">Baru</span>
                      </div>
                      <textarea className="field" value={reviewGeneratedHook} onChange={(event) => setReviewGeneratedHook(event.target.value)} />
                    </div>
                  ) : null}

                  <div className="review-footer">
                    <button type="button" className="button button-outline" onClick={closeReviewModal}>
                      Batal
                    </button>
                    <div className="review-footer-actions review-footer-actions-right">
                      <button type="button" className="button button-primary" onClick={handleUseHookAndRerender} disabled={isSavingReview || !reviewGeneratedHook.trim()}>
                        Gunakan & Render Ulang
                      </button>
                    </div>
                  </div>
                  <p className="field-caption">Re-render memakan waktu ~1 menit</p>
                </>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {errorMessage ? <div className="toast toast-error">{errorMessage}</div> : null}
    </main>
  );
}
