import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { validCui } from './company';
import { lookupCompanies } from './company.server';
import { fetchCourtCases, fetchFinancials } from './insights.server';

// Public, read-only official registries (ANAF, portal.just.ro); nothing is stored.
export const companyProfileFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ cui: z.string().refine(validCui, 'Invalid CUI') }).parse(input))
  .handler(async ({ data }) => {
    const today = new Date().toISOString().slice(0, 10), y = new Date().getUTCFullYear();
    const [company] = await lookupCompanies([data.cui], today);
    const fin = await fetchFinancials(data.cui, [y - 1, y - 2, y - 3, y - 4, y - 5]);
    return { company: company!, ...fin };
  });

export const courtCasesFn = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ name: z.string().trim().min(3).max(120) }).parse(input))
  .handler(async ({ data }) => fetchCourtCases(data.name));
