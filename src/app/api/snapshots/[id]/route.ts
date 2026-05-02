import { NextResponse } from 'next/server';

import { apiEndpointContracts, apiRoutePaths, createApiFailureResponse } from '@/lib/api/contracts';
import { updateSnapshotRequestSchema } from '@/lib/domain';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateSnapshotRequestSchema.safeParse(body);

  if (id.trim().length === 0 || !parsed.success) {
    return NextResponse.json(
      createApiFailureResponse(apiRoutePaths.snapshotById, apiEndpointContracts.updateSnapshot.failureCode, 'Invalid snapshot update request.'),
      { status: 400 },
    );
  }

  return NextResponse.json(
    createApiFailureResponse(apiRoutePaths.snapshotById, apiEndpointContracts.updateSnapshot.failureCode, 'Snapshot update flow is not wired yet.'),
    { status: 501 },
  );
}
