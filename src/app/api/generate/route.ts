import { NextResponse } from 'next/server';

import { apiEndpointContracts, apiRoutePaths, createApiFailureResponse } from '@/lib/api/contracts';
import { generateRequestSchema } from '@/lib/domain';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = generateRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      createApiFailureResponse(apiRoutePaths.generate, apiEndpointContracts.generate.failureCode, 'Invalid generate request.'),
      { status: 400 },
    );
  }

  return NextResponse.json(
    createApiFailureResponse(apiRoutePaths.generate, apiEndpointContracts.generate.failureCode, 'Generation pipeline is not wired yet.'),
    { status: 501 },
  );
}
