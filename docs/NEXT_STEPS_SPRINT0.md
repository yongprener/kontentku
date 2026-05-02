# Kontentku — Next Steps (Sprint 0 → Sprint 1)

Dokumen ini adalah langkah lanjutan praktis setelah `docs/PRODUCT_FLOW_v2.2.md` disepakati.

## Goal Utama

Membuat flow berjalan end-to-end:

`URL -> Scrape -> Review/Edit -> Approve Snapshot -> Generate (count fleksibel) -> Generate More`

---

## Langkah Selanjutnya (Urutan Eksekusi)

## Step 1 — Finalisasi Kontrak Data & API (Hari 1)

### Output wajib
1. Definisi final entity:
   - `ProductSnapshot`
   - `MediaAsset`
   - `GenerationJob`
   - `ContentVariant`
2. Definisi endpoint MVP:
   - `POST /api/scrape`
   - `PUT /api/snapshots/:id`
   - `POST /api/snapshots/:id/approve`
   - `POST /api/generate`
   - `POST /api/generate-more`
3. Daftar error code minimal:
   - `SNAPSHOT_NOT_APPROVED`
   - `CONTENT_COUNT_LIMIT_EXCEEDED`
   - `SCRAPE_FAILED`
   - `VALIDATION_FAILED`

### Acceptance check
- Semua endpoint punya request/response schema jelas.
- Hard limit `max 30 / batch` dinyatakan eksplisit di API validation.

---

## Step 2 — Build Scrape Review Gate (Hari 2)

### Output wajib
1. UI review scrape:
   - Edit title
   - Edit description
   - Delete media scraped
   - Upload media replacement
2. Tombol `Approve & Continue` untuk lock snapshot.
3. Guard: generate disabled jika snapshot belum approved.

### Acceptance check
- User tidak bisa generate tanpa approve.
- Perubahan title/description/media tersimpan ke snapshot final.

---

## Step 3 — Build Generation Engine v1 (Hari 3)

### Output wajib
1. `POST /api/generate` menerima `contentCount` (1..30).
2. Job summary output:
   - `requestedCount`
   - `successCount`
   - `failedCount`
   - `failureReasons[]`
3. Variant status minimal:
   - `generated`
   - `failed_validation`
   - `failed_runtime`

### Acceptance check
- 1 job bisa menghasilkan lebih dari 5 konten (sesuai input user).
- Ringkasan hasil selalu tersedia walau partial failure.

---

## Step 4 — Build Generate More + Authenticity Guard (Hari 4)

### Output wajib
1. `POST /api/generate-more` dengan `contentCount` fleksibel.
2. Similarity rule:
   - threshold >0.85
   - regenerate otomatis max 2x
   - gagal -> `failed_similar`
3. Exact duplicate blocker untuk `hook + caption + mediaSelection`.

### Acceptance check
- Generate more bisa dipanggil berulang dari snapshot yang sama.
- Sistem menolak/menandai konten terlalu mirip secara deterministik.

---

## Step 5 — QA Scenario & Demo Gate (Hari 5)

### Output wajib
1. 10 URL uji nyata + 2 skenario scrape gagal.
2. Checklist QA:
   - flow gate bekerja
   - edit media/title/description tersimpan
   - contentCount fleksibel berjalan
   - retry/failure reason tampil
3. Demo script internal.

### Acceptance check
- Seluruh flow end-to-end lolos tanpa dead state.
- Tidak ada generate yang bypass review gate.

---

## Prioritas Implementasi (kalau waktu mepet)

1. **P0**: Review gate + approve lock + generate by count
2. **P1**: Generate more + anti-duplicate
3. **P2**: Penyempurnaan retry UX dan analytics

---

## Definition of Done (Sprint)

Sprint dianggap selesai jika:

1. Flow mandatory review sebelum generate sudah enforced.
2. Jumlah konten bisa ditentukan user (initial & generate more).
3. Authenticity guard aktif (duplicate + similarity handling).
4. Job summary + failure reasons tersedia untuk user.
