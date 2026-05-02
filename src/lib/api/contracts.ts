import { z } from 'zod';

import {
  apiErrorCodeSchema,
  contentCountSchema,
  generateMoreRequestSchema,
  generateRequestSchema,
  scrapeRequestSchema,
  updateSnapshotRequestSchema,
} from '@/lib/domain';

export const apiRoutePaths = {
  scrape: '/api/scrape',
  snapshotById: '/api/snapshots/:id',
  approveSnapshotById: '/api/snapshots/:id/approve',
  generate: '/api/generate',
  generateMore: '/api/generate-more',
} as const;

export const apiEndpointMethods = {
  scrape: 'POST',
  updateSnapshot: 'PUT',
  approveSnapshot: 'POST',
  generate: 'POST',
  generateMore: 'POST',
} as const;

export const apiFailureResponseSchema = z
  .object({
    ok: z.literal(false),
    endpoint: z.string().min(1),
    errorCode: apiErrorCodeSchema,
    message: z.string().min(1),
  })
  .strict();

export type ApiFailureResponse = z.infer<typeof apiFailureResponseSchema>;

export const apiEndpointContracts = {
  scrape: {
    method: apiEndpointMethods.scrape,
    path: apiRoutePaths.scrape,
    requestSchema: scrapeRequestSchema,
    failureCode: 'SCRAPE_FAILED' as const,
  },
  updateSnapshot: {
    method: apiEndpointMethods.updateSnapshot,
    path: apiRoutePaths.snapshotById,
    requestSchema: updateSnapshotRequestSchema,
    failureCode: 'VALIDATION_FAILED' as const,
  },
  approveSnapshot: {
    method: apiEndpointMethods.approveSnapshot,
    path: apiRoutePaths.approveSnapshotById,
    failureCode: 'SNAPSHOT_NOT_APPROVED' as const,
  },
  generate: {
    method: apiEndpointMethods.generate,
    path: apiRoutePaths.generate,
    requestSchema: generateRequestSchema,
    contentCountSchema,
    failureCode: 'VALIDATION_FAILED' as const,
  },
  generateMore: {
    method: apiEndpointMethods.generateMore,
    path: apiRoutePaths.generateMore,
    requestSchema: generateMoreRequestSchema,
    contentCountSchema,
    failureCode: 'VALIDATION_FAILED' as const,
  },
} as const;

export const createApiFailureResponse = (
  endpoint: string,
  errorCode: ApiFailureResponse['errorCode'],
  message: string,
): ApiFailureResponse => ({
  ok: false,
  endpoint,
  errorCode,
  message,
});
