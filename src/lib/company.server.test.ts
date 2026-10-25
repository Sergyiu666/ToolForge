import { afterEach, expect, it, vi } from 'vitest';
import { lookupCompanies, mapAnafRecord } from './company.server';

afterEach(() => vi.unstubAllGlobals());

it('accepts successful ANAF v9 replies without the legacy status field', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
    found: [{ date_generale: { cui: 14399840, denumire: 'DANTE INTERNATIONAL SA' }, inregistrare_scop_Tva: { scpTVA: true } }], notFound: [160796],
  }))));
  const result = await lookupCompanies(['14399840', '160796'], '2026-10-25', false);
  expect(result[0]).toMatchObject({ cui: '14399840', status: 'found', name: 'DANTE INTERNATIONAL SA', vat: true });
  expect(result[1]).toMatchObject({ cui: '160796', status: 'not-found' });
});

it('does not mix fiscal postal codes with the registered headquarters address', () => {
  const result = mapAnafRecord({ date_generale: { cui: 14399840, codPostal: '010084' }, adresa_sediu_social: { sdenumire_Localitate: 'București', sdenumire_Strada: 'Test' }, adresa_domiciliu_fiscal: { dcod_Postal: '010084' } }, '2026-10-25');
  expect(result.postalCode).toBe('');
  expect(result.postalStatus).toBe('missing');
});

it('keeps invalid registry replies unavailable instead of inventing company details', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ cod: 500, found: [] }))));
  expect((await lookupCompanies(['14399840'], '2026-10-25', false))[0]).toMatchObject({ status: 'error', name: '', postalCode: '' });
});