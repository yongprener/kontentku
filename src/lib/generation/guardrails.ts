export const SIMILARITY_RETRY_LIMIT = 2 as const;
export const PARTIAL_FAILURE_INTERVAL = 7 as const;

const approvedSnapshotIds = new Set<string>();
const generatedSignaturesBySnapshot = new Map<string, Set<string>>();

const getSignatureSet = (snapshotId: string): Set<string> => {
  const existing = generatedSignaturesBySnapshot.get(snapshotId);

  if (existing !== undefined) {
    return existing;
  }

  const created = new Set<string>();
  generatedSignaturesBySnapshot.set(snapshotId, created);

  return created;
};

export const resetGenerateMoreGuardrails = (): void => {
  approvedSnapshotIds.clear();
  generatedSignaturesBySnapshot.clear();
};

export const markSnapshotApprovedForGenerateMore = (snapshotId: string): void => {
  const normalized = snapshotId.trim();

  if (normalized.length > 0) {
    approvedSnapshotIds.add(normalized);
  }
};

export const isSnapshotApprovedForGenerateMore = (snapshotId: string): boolean => approvedSnapshotIds.has(snapshotId.trim());

export const buildGenerateMoreVariantSignature = (snapshotId: string, contentCount: number, itemNumber: number): string =>
  `${snapshotId}:${contentCount}:${itemNumber}`;

export const isGenerateMoreExactDuplicate = (snapshotId: string, signature: string): boolean =>
  getSignatureSet(snapshotId).has(signature);

export const rememberGenerateMoreVariant = (snapshotId: string, signature: string): void => {
  getSignatureSet(snapshotId).add(signature);
};

export const getGenerateMoreRetryBudget = (itemNumber: number): number => {
  if (itemNumber % 5 === 0) {
    return SIMILARITY_RETRY_LIMIT;
  }

  if (itemNumber % 3 === 0) {
    return 1;
  }

  return 0;
};

export const isGenerateMoreValidationFailure = (itemNumber: number): boolean => itemNumber % PARTIAL_FAILURE_INTERVAL === 0;

export const buildGenerateMoreDuplicateReason = (itemNumber: number): string =>
  `Generated item ${itemNumber} was blocked as an exact duplicate.`;

export const buildGenerateMoreSimilarityFailureReason = (itemNumber: number): string =>
  `Generated item ${itemNumber} exceeded the similarity retry limit after ${SIMILARITY_RETRY_LIMIT} retries.`;

export const buildGenerateMoreValidationFailureReason = (itemNumber: number): string =>
  `Generated item ${itemNumber} failed deterministic validation.`;
