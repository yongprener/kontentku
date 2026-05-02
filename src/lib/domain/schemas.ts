import { z } from 'zod';

import {
  MAX_CONTENT_PER_BATCH,
  apiErrorCodes,
  contentVariantStatuses,
  generationJobStatuses,
  generationJobTypes,
  mediaSourceTypes,
} from './contracts';

const nonEmptyText = z.string().trim().min(1);

export const apiErrorCodeSchema = z.enum(apiErrorCodes);

export const mediaAssetSchema = z
  .object({
    id: nonEmptyText,
    snapshotId: nonEmptyText,
    sourceType: z.enum(mediaSourceTypes),
    urlOrPath: nonEmptyText,
    isActive: z.boolean(),
  })
  .strict();

const snapshotBaseSchema = z
  .object({
    id: nonEmptyText,
    projectId: nonEmptyText,
    sourceUrl: z.string().url(),
    title: nonEmptyText,
    description: nonEmptyText,
    media: z.array(mediaAssetSchema),
  })
  .strict();

export const draftProductSnapshotSchema = snapshotBaseSchema.extend({
  status: z.literal('draft'),
  approvedAt: z.null(),
});

export const approvedProductSnapshotSchema = snapshotBaseSchema.extend({
  status: z.literal('approved'),
  approvedAt: z.string().datetime(),
});

export const productSnapshotSchema = z.discriminatedUnion('status', [
  draftProductSnapshotSchema,
  approvedProductSnapshotSchema,
]);

export const generationJobSchema = z
  .object({
    id: nonEmptyText,
    snapshotId: nonEmptyText,
    requestedCount: z.number().int().min(1).max(MAX_CONTENT_PER_BATCH),
    type: z.enum(generationJobTypes),
    status: z.enum(generationJobStatuses),
  })
  .strict();

const hashtagSchema = nonEmptyText;

const hashtagsSchema = z
  .tuple([hashtagSchema, hashtagSchema, hashtagSchema])
  .refine((value) => new Set(value).size === 3, {
    message: 'hashtags must be unique',
  });

export const contentVariantSchema = z
  .object({
    id: nonEmptyText,
    jobId: nonEmptyText,
    hook: nonEmptyText,
    script: nonEmptyText,
    caption: nonEmptyText,
    hashtags: hashtagsSchema,
    mediaSelection: z.array(nonEmptyText).min(1),
    status: z.enum(contentVariantStatuses),
  })
  .strict();

export const scrapeRequestSchema = z
  .object({
    url: z.string().url(),
  })
  .strict();

export const updateSnapshotRequestSchema = z
  .object({
    title: nonEmptyText.optional(),
    description: nonEmptyText.optional(),
    media: z.array(mediaAssetSchema).optional(),
  })
  .strict()
  .refine((value) => value.title !== undefined || value.description !== undefined || value.media !== undefined, {
    message: 'At least one snapshot field must be provided',
  });

export const approveSnapshotResponseSchema = z
  .object({
    snapshot: approvedProductSnapshotSchema,
  })
  .strict();

export const contentCountSchema = z.number().int().min(1).max(MAX_CONTENT_PER_BATCH);

export const generationSummarySchema = z
  .object({
    requestedCount: contentCountSchema,
    successCount: z.number().int().min(0),
    failedCount: z.number().int().min(0),
    failureReasons: z.array(nonEmptyText),
  })
  .strict();

export const generateMoreSummarySchema = generationSummarySchema.extend({
  exactDuplicateCount: z.number().int().min(0),
  similarityRetryCount: z.number().int().min(0),
  similarityRetryLimit: z.literal(2),
});

export const generateMoreResponseSchema = z
  .object({
    job: generationJobSchema,
    summary: generateMoreSummarySchema,
  })
  .strict();

export const generateRequestSchema = z
  .object({
    snapshotId: nonEmptyText,
    contentCount: contentCountSchema,
    duration: nonEmptyText,
    language: nonEmptyText,
    angle: nonEmptyText.optional(),
  })
  .strict();

export const generateMoreRequestSchema = z
  .object({
    snapshotId: nonEmptyText,
    contentCount: contentCountSchema,
  })
  .strict();
