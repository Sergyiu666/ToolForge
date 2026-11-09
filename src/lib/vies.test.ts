import { afterEach, expect, it, vi } from 'vitest';
import { parseVatInputs, vatIdentity } from './vies';
import { checkVies, lookupVatCompanies } from './vies.server';
import { exportRows } from './company';
afterEach(() => vi.unstubAllGlobals());
it('accepts Romanian CUIs and EU VAT prefixes without applying Romanian checksum to foreign IDs', () => {
  expect(parseVatInputs('RO14399840 14399840 de129274202 GR123456789 GB123456789 bad')).toMatchObject({ cuis: ['14399840', 'DE129274202', 'EL123456789'], duplicates: 1, invalid: ['GB123456789', 'bad'] });
  expect(vatIdentity('RO14399841')).toBeNull();
});
it('checks current VIES status separately from historical ANAF status and exports both', async () => {
  const fetcher = vi.fn(async (url: string, init: RequestInit) => {
    if (url.includes('anaf.ro')) {
      expect(JSON.parse(String(init.body))).toEqual([{ cui: 14399840, data: '2024-01-01' }]);
      return new Response(JSON.stringify({ found: [{ date_generale: { cui: 14399840, denumire: 'Dante' }, inregistrare_scop_Tva: { scpTVA: false } }], notFound: [] }));
    }
    const input = JSON.parse(String(init.body));
    expect(init.method).toBe('POST');
    expect(input).toEqual(input.countryCode === 'RO' ? { countryCode: 'RO', vatNumber: '14399840' } : { countryCode: 'DE', vatNumber: '129274202' });
    return new Response(JSON.stringify({ valid: true, requestDate: '2026-11-09', name: '---', address: '---' }));
  });
  vi.stubGlobal('fetch', fetcher);
  const rows = await lookupVatCompanies(['14399840', 'DE129274202'], '2024-01-01');
  expect(rows[0]).toMatchObject({ vat: false, vies: { status: 'valid' } });
  expect(rows[1]).toMatchObject({ status: 'found', vat: null, name: '', postalCode: '' });
  expect(exportRows(rows)[0]).toMatchObject({ 'Plătitor TVA': 'Nu', VIES: 'valid', 'VIES verificat la': '2026-11-09' });
});
it('distinguishes a negative validation from service faults, HTTP failures and timeouts', async () => {
  const f = vi.fn().mockResolvedValueOnce(new Response('{"valid":false}'))
    .mockResolvedValueOnce(new Response('{"valid":false,"actionSucceed":false,"errorWrappers":[{"error":"MS_UNAVAILABLE"}]}'))
    .mockResolvedValueOnce(new Response('down', { status: 503 }))
    .mockRejectedValueOnce(new Error('timeout'))
    .mockResolvedValueOnce(new Response('{}'));
  vi.stubGlobal('fetch', f);
  expect((await checkVies('DE129274202')).status).toBe('invalid');
  for (let i = 0; i < 4; i++) expect((await checkVies('DE129274202')).status).toBe('unavailable');
});
it('still returns EU validation when ANAF is unavailable', async () => {
  vi.stubGlobal('fetch', vi.fn(async (url: string) => new Response(url.includes('anaf.ro') ? '{}' : '{"valid":true}')));
  const rows = await lookupVatCompanies(['14399840', 'DE129274202'], '2024-01-01');
  expect(rows[0]).toMatchObject({ status: 'error', vies: { status: 'valid' } });
  expect(rows[1]).toMatchObject({ status: 'found', vies: { status: 'valid' } });
});