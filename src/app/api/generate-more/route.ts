import { NextResponse } from 'next/server';

import { apiEndpointContracts, apiRoutePaths, createApiFailureResponse } from '@/lib/api/contracts';
import { generateMoreRequestSchema } from '@/lib/domain';
import { submitGenerateMoreJob } from '@/lib/generation/engine-v1';
import { isSnapshotApprovedForGenerateMore } from '@/lib/generation/guardrails';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = generateMoreRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      createApiFailureResponse(apiRoutePaths.generateMore, apiEndpointContracts.generateMore.failureCode, 'Invalid generate-more request.'),
      { status: 400 },
    );
  }

  if (!isSnapshotApprovedForGenerateMore(parsed.data.snapshotId)) {
    return NextResponse.json(
      createApiFailureResponse(apiRoutePaths.generateMore, 'SNAPSHOT_NOT_APPROVED', 'Snapshot must be approved before generating more content.'),
      { status: 400 },
    );
  }

  const { job, summary } = submitGenerateMoreJob(parsed.data);

  return NextResponse.json(
    {
      ok: true,
      endpoint: apiRoutePaths.generateMore,
      job,
      summary,
    },
    { status: 200 },
  );
}
