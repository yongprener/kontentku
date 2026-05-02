import { NextResponse } from 'next/server';

import { createApiFailureResponse, apiEndpointContracts, apiRoutePaths } from '@/lib/api/contracts';
import { scrapeRequestSchema } from '@/lib/domain';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = scrapeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      createApiFailureResponse(apiRoutePaths.scrape, apiEndpointContracts.scrape.failureCode, 'Invalid scrape request.'),
      { status: 400 },
    );
  }

  return NextResponse.json(
    createApiFailureResponse(apiRoutePaths.scrape, apiEndpointContracts.scrape.failureCode, 'Scrape pipeline is not wired yet.'),
    { status: 501 },
  );
}
