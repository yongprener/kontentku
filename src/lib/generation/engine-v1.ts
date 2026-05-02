import type { GenerateRequest, GenerationJob, GenerationSummary } from '@/lib/domain/contracts';

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

export function submitGenerationJob(request: GenerateRequest): GenerationJobRecord {
  generationSequence += 1;

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

export function listGenerationJobs(): readonly GenerationJobRecord[] {
  return generationJobs;
}

export function resetGenerationEngine(): void {
  generationJobs.length = 0;
  generationSequence = 0;
}
