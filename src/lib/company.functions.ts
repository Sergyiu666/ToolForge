import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { validCui } from './company';
import { lookupCompanies } from './company.server';

// Public, read-only official registries; no private company uploads or user data are stored.
export const lookupCompaniesFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({
    cuis: z.array(z.string().refine(validCui, 'Invalid CUI')).min(1).max(10),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(s => Number.isFinite(Date.parse(s)) && s <= new Date().toISOString().slice(0, 10), 'Invalid lookup date'),
    postal: z.boolean(),
  }).parse(input))
  .handler(async ({ data }) => lookupCompanies(data.cuis, data.date, data.postal));