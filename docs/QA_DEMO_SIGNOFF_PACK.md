# Kontentku QA Demo Signoff Pack

Source of truth:

- `docs/PRODUCT_FLOW_v2.2.md`
- `docs/NEXT_STEPS_SPRINT0.md`

Use this pack to close the MVP phase.

## Demo steps

1. Open `tests/product-urls.signoff.json`.
2. Pick one live URL first, start with `V-01`.
3. Run scrape and wait for the review screen.
4. Edit title, description, or media as needed.
5. Approve the snapshot.
6. Generate content with any count between 1 and 30.
7. Run Generate More from the same approved snapshot.
8. Repeat with another URL if you want a second pass.

## Acceptance checklist

- [ ] Review happens before any generate action.
- [ ] Title edits persist into the snapshot.
- [ ] Description edits persist into the snapshot.
- [ ] Media delete and media upload are available in review.
- [ ] Generate only accepts a user chosen content count.
- [ ] Generate More works after a successful batch.
- [ ] Batch output shows requestedCount, successCount, failedCount, and failureReasons.
- [ ] Duplicate and similarity failures are reported, not hidden.
- [ ] No generate before approve is enforced.

## Scenario matrix

<!-- markdownlint-disable MD013 MD034 -->

Rows V-05 to V-10 are placeholders.
The repo currently contains 4 live URLs.
Keep the placeholder rows so the demo set stays at 10 entries, then replace them with live URLs when they are available.

| ID | URL | Type | Demo action | Expected result |
| --- | --- | --- | --- | --- |
| V-01 | https://vt.tokopedia.com/t/ZS9N3WDPgRU3X-WKUVc/ | live | Scrape, review, approve, generate | Review screen loads, approve gate works, generation can start after approve |
| V-02 | https://vt.tokopedia.com/t/ZS9N3Wu7DHBFj-sdhM0/ | live | Scrape, review, approve, generate more | Same as V-01, then Generate More is available after the batch |
| V-03 | https://vt.tokopedia.com/t/ZS9N3WgNtWtVP-DGgic/ | live | Scrape and edit fields | Title, description, and media edits remain in the snapshot |
| V-04 | https://vt.tokopedia.com/t/ZS9N371ugjR34-uAx3f/ | live | Scrape with a different count | User chosen count is accepted within the 1 to 30 limit |
| V-05 | https://example.invalid/qa-placeholder-05 | placeholder | Demo set entry only | Use only after replacing with a live product URL |
| V-06 | https://example.invalid/qa-placeholder-06 | placeholder | Demo set entry only | Use only after replacing with a live product URL |
| V-07 | https://example.invalid/qa-placeholder-07 | placeholder | Demo set entry only | Use only after replacing with a live product URL |
| V-08 | https://example.invalid/qa-placeholder-08 | placeholder | Demo set entry only | Use only after replacing with a live product URL |
| V-09 | https://example.invalid/qa-placeholder-09 | placeholder | Demo set entry only | Use only after replacing with a live product URL |
| V-10 | https://example.invalid/qa-placeholder-10 | placeholder | Demo set entry only | Use only after replacing with a live product URL |

## Failure scenarios

| ID | Input | Expected failure | Proof point |
| --- | --- | --- | --- |
| F-01 | Inaccessible or malformed URL | `SCRAPE_FAILED` | Scrape fails cleanly and does not reach generate |
| F-02 | Draft snapshot generate attempt | `SNAPSHOT_NOT_APPROVED` | Generate is blocked until approval |

<!-- markdownlint-enable MD013 MD034 -->

## No generate before approve proof points

- Generate stays blocked until the snapshot is approved.
- A direct generate attempt on a draft snapshot returns `SNAPSHOT_NOT_APPROVED`.
- The approved snapshot is the only source for generation and Generate More.

## Closure rule

Treat MVP as closed only after every checklist item passes.
Confirm both failure scenarios before signoff.
