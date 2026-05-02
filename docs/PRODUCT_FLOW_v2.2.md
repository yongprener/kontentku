# Kontentku — Product Flow Update v2.2

Dokumen ini memperbarui alur utama dari versi PRD sebelumnya.

## 1) Keputusan Produk (Disepakati)

1. **Review hasil scrape adalah langkah wajib** sebelum konten dibuat.
2. User dapat **edit judul, deskripsi, dan media** (hapus/ganti/upload).
3. Jumlah konten **tidak fixed 3–5**. User bebas menentukan jumlah saat generate.
4. Setelah selesai, user bisa **generate more** kapan pun dengan jumlah tambahan bebas.
5. Generate lanjutan tetap memakai **approved product snapshot** agar konsisten.

---

## 2) End-to-End Flow Baru

1. **Input URL produk**
2. **Scrape & normalisasi data**
3. **Review Scrape (Human-in-the-loop)**
   - Edit `title`
   - Edit `description`
   - Hapus media yang tidak relevan
   - Upload media pengganti/tambahan
4. **Approve snapshot** (snapshot di-lock sebagai sumber generate)
5. **Set jumlah konten** (contoh: 1–30, default 5)
6. **Generate konten**
7. **Generate More** (jumlah bebas per batch, tetap anti-duplikasi)

---

## 3) Perubahan UX yang Wajib

### A. Screen: Scrape Review (baru/wajib)
- Section Product Info:
  - `Title` (editable)
  - `Description` (editable)
- Section Media Library:
  - Grid media hasil scrape
  - Aksi per item: `Delete`
  - Aksi global: `Upload Media`
- CTA:
  - `Approve & Continue`
  - `Re-scrape` (opsional)

### B. Screen: Generate Setup
- Input jumlah konten:
  - `contentCount` (number)
  - Rekomendasi awal: min 1, max 30 per batch
- Opsi tetap: duration, language, angle

### C. Screen: Results
- Setelah batch selesai:
  - Tombol `Generate More`
  - Input jumlah tambahan bebas (tetap max per batch)

---

## 4) Data Contract (Usulan)

## `ProductSnapshot`
- `id`
- `projectId`
- `sourceUrl`
- `title` (edited/final)
- `description` (edited/final)
- `media[]` (final curated list)
- `status`: `draft | approved`
- `approvedAt`

## `MediaAsset`
- `id`
- `snapshotId`
- `sourceType`: `scraped | uploaded`
- `urlOrPath`
- `isActive` (false jika dihapus user)

## `GenerationJob`
- `id`
- `snapshotId` (harus `approved`)
- `requestedCount`
- `type`: `initial | generate_more`
- `status`: `queued | processing | completed | partial_failed | failed | cancelled`
- Terminal status: `completed | partial_failed | failed | cancelled`

## `ContentVariant`
- `id`
- `jobId`
- `hook`
- `script`
- `caption`
- `hashtags[3]`
- `mediaSelection`
- `status`: `generated | regenerated | failed_similar | failed_validation | failed_runtime`

---

## 5) API Shape (MVP)

1. `POST /api/scrape`
   - input: `{ url }`
   - output: draft snapshot + scraped media

2. `PUT /api/snapshots/:id`
   - update title/description/media (delete/upload mapping)

3. `POST /api/snapshots/:id/approve`
   - lock snapshot untuk generation

4. `POST /api/generate`
   - input: `{ snapshotId, contentCount, duration, language, angle? }`

5. `POST /api/generate-more`
   - input: `{ snapshotId, contentCount }`
   - catatan MVP: mode bercabang (`fresh_angles | remix_winners`) belum diaktifkan agar reliabilitas monolith + single-worker tetap terjaga

---

## 6) Authenticity & Anti-Duplicate Rules

Setiap generate (awal maupun lanjutan) harus melewati guardrail:

1. **Exact duplicate block**
   - Larang kombinasi `hook + caption + mediaSelection` yang sama persis.

2. **Similarity threshold**
   - Jika similarity score >0.85, variant wajib diregenerate maksimal 2 kali.
   - Jika setelah 2 kali masih >0.85, tandai `failed_similar` dan tampilkan alasannya di hasil job.

3. **Diversity knobs**
   - Variasikan angle, struktur script, CTA, dan urutan media.

4. **Metadata validator**
   - Setiap variant wajib punya paket metadata lengkap: title SEO non-empty, caption non-empty, dan **tepat 3 hashtag unik valid**.
   - Variant yang gagal validasi ditandai `failed_validation`.

---

## 7) Batasan Operasional (MVP)

- Batas MVP: **maks 30 konten per batch (hard limit)**
- Request di atas limit wajib ditolak dengan error yang dapat ditampilkan ke user
- Generate more boleh berkali-kali selama quota/job policy memungkinkan
- Snapshot harus `approved` sebelum job generation dibuat
- Jika snapshot diubah lagi, sistem membuat **snapshot version baru** (opsional tahap lanjut)

---

## 8) Acceptance Criteria (Revisi)

1. User tidak bisa generate sebelum review + approve snapshot.
2. User bisa edit title/description dan kurasi media sebelum generate.
3. User bisa menentukan jumlah konten sendiri (bukan fixed 3–5).
4. User bisa generate more dengan jumlah bebas setelah batch selesai.
5. Untuk setiap batch, sistem mengembalikan ringkasan `requestedCount`, `successCount`, `failedCount`, plus alasan gagal per variant.
6. Setiap variant sukses wajib berisi `hook`, `script`, `caption`, tepat 3 hashtag valid, dan `mediaSelection`; jika tidak, variant berstatus gagal.
7. Job `partial_failed` atau `failed` menampilkan aksi Retry untuk variant gagal tanpa mengulang variant yang sudah sukses.

---

## 9) Dampak terhadap PRD Sebelumnya

- Bagian fixed 3–5 diubah menjadi **dynamic content count**.
- Tahap review manusia dipindah menjadi **pre-generation mandatory gate**.
- Fitur `Generate More` diperluas dari preset (+5/+10) menjadi input jumlah fleksibel.

Dokumen ini menjadi referensi implementasi untuk sprint berikutnya.
