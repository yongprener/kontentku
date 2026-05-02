import type { GenerateMoreRequest, GenerateRequest, GenerationJob, GenerationSummary, GenerateMoreSummary } from '@/lib/domain/contracts';

import {
  buildGenerateMoreDuplicateReason,
  buildGenerateMoreSimilarityFailureReason,
  buildGenerateMoreValidationFailureReason,
  buildGenerateMoreVariantSignature,
  getGenerateMoreRetryBudget,
  isGenerateMoreExactDuplicate,
  isGenerateMoreValidationFailure,
  markSnapshotApprovedForGenerateMore,
  rememberGenerateMoreVariant,
  resetGenerateMoreGuardrails,
} from './guardrails';

export interface GenerationJobRecord {
  job: GenerationJob;
  summary: GenerationSummary;
}

const PARTIAL_FAILURE_INTERVAL = 7;

const generationJobs: GenerationJobRecord[] = [];

let generationSequence = 0;

function buildFailureReasons(requestedCount: number): string[] {
  return Array.from({ length: requestedCount }, (_, index) => index + 1)
    .filter((itemNumber) => itemNumber % PARTIAL_FAILURE_INTERVAL === 0)
    .map((itemNumber) => `Generated item ${itemNumber} failed deterministic validation.`);
}

function buildSummary(requestedCount: number): GenerationSummary {
  const failureReasons = buildFailureReasons(requestedCount);
  const failedCount = failureReasons.length;

  return {
    requestedCount,
    successCount: requestedCount - failedCount,
    failedCount,
    failureReasons,
  };
}

function buildStatus(summary: GenerationSummary): GenerationJob['status'] {
  if (summary.failedCount === 0) {
    return 'completed';
  }

  if (summary.successCount === 0) {
    return 'failed';
  }

  return 'partial_failed';
}

function buildJobId(request: GenerateRequest): string {
  return `generation-${request.snapshotId}-${String(generationSequence).padStart(3, '0')}`;
}

function buildGenerateMoreJobId(snapshotId: string): string {
  return `generation-${snapshotId}-${String(generationSequence).padStart(3, '0')}`;
}

function buildGenerateMoreSummary(request: GenerateMoreRequest): GenerateMoreSummary {
  let exactDuplicateCount = 0;
  let similarityRetryCount = 0;
  const failureReasons: string[] = [];

  for (let itemNumber = 1; itemNumber <= request.contentCount; itemNumber += 1) {
    const signature = buildGenerateMoreVariantSignature(request.snapshotId, request.contentCount, itemNumber);

    if (isGenerateMoreExactDuplicate(request.snapshotId, signature)) {
      exactDuplicateCount += 1;
      failureReasons.push(buildGenerateMoreDuplicateReason(itemNumber));
      continue;
    }

    if (isGenerateMoreValidationFailure(itemNumber)) {
      failureReasons.push(buildGenerateMoreValidationFailureReason(itemNumber));
      continue;
    }

    const retryBudget = getGenerateMoreRetryBudget(itemNumber);

    if (retryBudget === 0) {
      rememberGenerateMoreVariant(request.snapshotId, signature);
      continue;
    }

    similarityRetryCount += retryBudget;

    if (retryBudget === 1) {
      rememberGenerateMoreVariant(request.snapshotId, signature);
      continue;
    }

    failureReasons.push(buildGenerateMoreSimilarityFailureReason(itemNumber));
  }

  const failedCount = failureReasons.length;

  return {
    requestedCount: request.contentCount,
    successCount: request.contentCount - failedCount,
    failedCount,
    failureReasons,
    exactDuplicateCount,
    similarityRetryCount,
    similarityRetryLimit: 2,
  };
}

export function submitGenerationJob(request: GenerateRequest): GenerationJobRecord {
  generationSequence += 1;
  markSnapshotApprovedForGenerateMore(request.snapshotId);

  const summary = buildSummary(request.contentCount);
  const job: GenerationJob = {
    id: buildJobId(request),
    snapshotId: request.snapshotId,
    requestedCount: request.contentCount,
    type: 'initial',
    status: buildStatus(summary),
  };

  const record = { job, summary };

  generationJobs.push(record);

  return record;
}

export function submitGenerateMoreJob(request: GenerateMoreRequest): GenerationJobRecord {
  generationSequence += 1;

  const summary = buildGenerateMoreSummary(request);
  const job: GenerationJob = {
    id: buildGenerateMoreJobId(request.snapshotId),
    snapshotId: request.snapshotId,
    requestedCount: request.contentCount,
    type: 'generate_more',
    status: buildStatus(summary),
  };

  const record = { job, summary };

  generationJobs.push(record);

  return record;
}

export function listGenerationJobs(): readonly GenerationJobRecord[] {
  return generationJobs;
}

export function resetGenerationEngine(): void {
  generationJobs.length = 0;
  generationSequence = 0;
  resetGenerateMoreGuardrails();
}
