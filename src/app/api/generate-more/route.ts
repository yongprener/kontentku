import { NextResponse } from 'next/server';

import { apiEndpointContracts, apiRoutePaths, createApiFailureResponse } from '@/lib/api/contracts';
import { generateMoreRequestSchema } from '@/lib/domain';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = generateMoreRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      createApiFailureResponse(apiRoutePaths.generateMore, apiEndpointContracts.generateMore.failureCode, 'Invalid generate-more request.'),
      { status: 400 },
    );
  }

  return NextResponse.json(
    createApiFailureResponse(apiRoutePaths.generateMore, apiEndpointContracts.generateMore.failureCode, 'Generate-more pipeline is not wired yet.'),
    { status: 501 },
  );
}
