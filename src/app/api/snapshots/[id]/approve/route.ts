import { NextResponse } from 'next/server';

import { apiEndpointContracts, apiRoutePaths, createApiFailureResponse } from '@/lib/api/contracts';

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

  return NextResponse.json(
    createApiFailureResponse(apiRoutePaths.approveSnapshotById, apiEndpointContracts.approveSnapshot.failureCode, 'Snapshot approval flow is not wired yet.'),
    { status: 501 },
  );
}
