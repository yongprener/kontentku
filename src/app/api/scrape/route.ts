import { NextResponse } from 'next/server';

import { createApiFailureResponse, apiEndpointContracts, apiRoutePaths } from '@/lib/api/contracts';
import { scrapeRequestSchema } from '@/lib/domain';
import { scrapeSnapshot } from '@/lib/review-flow-store';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = scrapeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      createApiFailureResponse(apiRoutePaths.scrape, apiEndpointContracts.scrape.failureCode, 'Invalid scrape request.'),
      { status: 400 },
    );
  }

  const snapshot = scrapeSnapshot(parsed.data.url);

  return NextResponse.json(
    {
      ok: true,
      endpoint: apiRoutePaths.scrape,
      snapshot,
    },
    { status: 200 },
  );
}
