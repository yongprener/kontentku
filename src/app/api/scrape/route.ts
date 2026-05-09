import { NextResponse } from 'next/server';

import { createApiFailureResponse, apiEndpointContracts, apiRoutePaths } from '@/lib/api/contracts';
import { scrapeRequestSchema } from '@/lib/domain';
import { scrapeTokopediaProduct } from '@/lib/scrape/tokopedia';

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = scrapeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      createApiFailureResponse(apiRoutePaths.scrape, apiEndpointContracts.scrape.failureCode, 'Invalid scrape request.'),
      { status: 400 },
    );
  }

  const result = await scrapeTokopediaProduct(parsed.data.url);

  if (!result.ok) {
    return NextResponse.json(
      createApiFailureResponse(apiRoutePaths.scrape, apiEndpointContracts.scrape.failureCode, result.message),
      { status: 502 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      endpoint: apiRoutePaths.scrape,
      snapshot: result.snapshot,
    },
    { status: 200 },
  );
}
