import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { validLookupDate } from './company';
import { vatIdentity } from './vies';
import { lookupVatCompanies } from './vies.server';

// Public, read-only official registries; no private company uploads or user data are stored.
export const lookupCompaniesFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({
    cuis: z.array(z.string().refine(s => vatIdentity(s) !== null, 'Invalid CUI or EU VAT number')).min(1).max(5),
    date: z.string().refine(s => validLookupDate(s), 'Invalid lookup date'),
  }).parse(input))
  .handler(async ({ data }) => lookupVatCompanies(data.cuis, data.date));