import { NextResponse } from 'next/server';

import { apiEndpointContracts, apiRoutePaths, createApiFailureResponse } from '@/lib/api/contracts';
import { approveSnapshot } from '@/lib/review-flow-store';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (id.trim().length === 0) {
    return NextResponse.json(
      createApiFailureResponse(apiRoutePaths.approveSnapshotById, 'VALIDATION_FAILED', 'Snapshot id is required.'),
      { status: 400 },
    );
  }

  const snapshot = approveSnapshot(id);

  if (snapshot === null) {
    return NextResponse.json(
      createApiFailureResponse(apiRoutePaths.approveSnapshotById, apiEndpointContracts.approveSnapshot.failureCode, 'Snapshot not found.'),
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      endpoint: apiRoutePaths.approveSnapshotById,
      snapshot,
    },
    { status: 200 },
  );
}
