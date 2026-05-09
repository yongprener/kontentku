import { NextResponse } from 'next/server';

import { apiEndpointContracts, apiRoutePaths, createApiFailureResponse } from '@/lib/api/contracts';
import { generateRequestSchema } from '@/lib/domain';
import { submitGenerationJob } from '@/lib/generation/engine-v1';
import { isSnapshotApproved } from '@/lib/review-flow-store';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = generateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      createApiFailureResponse(apiRoutePaths.generate, apiEndpointContracts.generate.failureCode, 'Invalid generate request.'),
      { status: 400 },
    );
  }

  if (!isSnapshotApproved(parsed.data.snapshotId)) {
    return NextResponse.json(
      createApiFailureResponse(apiRoutePaths.generate, 'SNAPSHOT_NOT_APPROVED', 'Snapshot must be approved before generation can begin.'),
      { status: 400 },
    );
  }

  const { job, summary } = submitGenerationJob(parsed.data);

  return NextResponse.json(
    {
      ok: true,
      endpoint: apiRoutePaths.generate,
      job,
      summary,
    },
    { status: 200 },
  );
}
