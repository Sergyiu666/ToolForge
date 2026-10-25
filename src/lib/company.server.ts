import { blankCompany, cleanPostalCode, type Company } from './company';

type RecordData = Record<string, unknown>;
const object = (value: unknown): RecordData => value && typeof value === 'object' && !Array.isArray(value) ? value as RecordData : {};
const string = (value: unknown) => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
const bool = (value: unknown) => value === true || value === 'true' ? true : value === false || value === 'false' ? false : null;

export function mapAnafRecord(value: unknown, checkedAt: string): Company {
  const row = object(value), general = object(row['date_generale']);
  const social = object(row['adresa_sediu_social']), fiscal = object(row['adresa_domiciliu_fiscal']);
  // Keep postal code and address in the same address domain; never mix fiscal codes with headquarters.
  const useSocial = Boolean(string(social['sdenumire_Localitate']) || string(social['sdenumire_Strada']));
  const a = useSocial ? social : fiscal, prefix = useSocial ? 's' : 'd';
  const streetName = string(a[`${prefix}denumire_Strada`]);
  const number = string(a[`${prefix}numar_Strada`]);
  const county = string(a[`${prefix}denumire_Judet`]), locality = string(a[`${prefix}denumire_Localitate`]);
  const street = [streetName, number ? `nr. ${number}` : '', string(a[`${prefix}detalii_Adresa`])].filter(Boolean).join(', ');
  const postalCode = cleanPostalCode(a[`${prefix}cod_Postal`]) || (!useSocial ? cleanPostalCode(general['codPostal']) : '');
  const inactive = bool(object(row['stare_inactiv'])['statusInactivi']);
  return {
    ...blankCompany(string(general['cui']), 'found', '', checkedAt),
    name: string(general['denumire']), registry: string(general['nrRegCom']),
    fiscal: inactive === true ? 'Inactiv' : inactive === false ? 'Activ' : string(general['stare_inregistrare']),
    vat: bool(object(row['inregistrare_scop_Tva'])['scpTVA']), cashVat: bool(object(row['inregistrare_RTVAI'])['statusTvaIncasare']), eInvoice: bool(general['statusRO_e_Factura']),
    county, locality, street,
    address: useSocial ? [street, locality, county, string(a['stara'])].filter(Boolean).join(', ') : string(general['adresa']) || [street, locality, county].filter(Boolean).join(', '),
    postalCode, postalSource: postalCode ? 'ANAF' : '', postalStatus: postalCode ? 'verified' : 'missing',
  };
}
export async function lookupCompanies(cuis: string[], date: string) {
  const checkedAt = new Date().toISOString();
  let payload: RecordData;
  try {
    const response = await fetch('https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(cuis.map(cui => ({ cui: Number(cui), data: date }))), signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error(`ANAF HTTP ${response.status}`);
    payload = object(await response.json());
    // V9 replies are {found, notFound}; there is no legacy cod field.
    if (!Array.isArray(payload['found'])) throw new Error('ANAF invalid response');
  } catch (e) {
    console.error('ANAF lookup failed', e instanceof Error ? e.message : 'Fetch failure');
    return cuis.map(cui => blankCompany(cui, 'error', 'ANAF could not be reached. Please retry; no company data has been inferred.', checkedAt));
  }
  const found = new Map<string, RecordData>();
  for (const value of payload['found'] as unknown[]) { const row = object(value); found.set(string(object(row['date_generale'])['cui']), row); }
  const notFound = new Set(Array.isArray(payload['notFound']) ? payload['notFound'].map(string) : []);
  const companies: Company[] = [];
  for (const cui of cuis) {
    const row = found.get(cui);
    if (!row) { companies.push(blankCompany(cui, notFound.has(cui) ? 'not-found' : 'error', notFound.has(cui) ? 'CUI not found in ANAF records.' : 'ANAF did not return this CUI. Retry the lookup.', checkedAt)); continue; }
    companies.push(mapAnafRecord(row, checkedAt));
  }
  return companies;
}