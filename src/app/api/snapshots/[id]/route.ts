import { NextResponse } from 'next/server';

import { apiEndpointContracts, apiRoutePaths, createApiFailureResponse } from '@/lib/api/contracts';
import { updateSnapshotRequestSchema } from '@/lib/domain';
import { getSnapshot, updateSnapshot } from '@/lib/review-flow-store';

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

  const snapshot = updateSnapshot(id, parsed.data);

  if (snapshot === null) {
    return NextResponse.json(
      createApiFailureResponse(apiRoutePaths.snapshotById, apiEndpointContracts.updateSnapshot.failureCode, 'Snapshot not found or already approved.'),
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      endpoint: apiRoutePaths.snapshotById,
      snapshot,
    },
    { status: 200 },
  );
}

export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  if (id.trim().length === 0) {
    return NextResponse.json(
      createApiFailureResponse(apiRoutePaths.snapshotById, apiEndpointContracts.updateSnapshot.failureCode, 'Snapshot id is required.'),
      { status: 400 },
    );
  }

  const snapshot = getSnapshot(id);

  if (snapshot === null) {
    return NextResponse.json(
      createApiFailureResponse(apiRoutePaths.snapshotById, apiEndpointContracts.updateSnapshot.failureCode, 'Snapshot not found.'),
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      endpoint: apiRoutePaths.snapshotById,
      snapshot,
    },
    { status: 200 },
  );
}
