import { blankCompany, cleanPostalCode, type Company } from './company';
import { matchPostal, normalizeAddress, parsePostalHtml } from './company-postal';

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
export async function enrichPostal(company: Company, streetName: string, number: string): Promise<Company> {
  if (company.postalCode || !company.county || !company.locality || !streetName) return company;
  const bucharest = normalizeAddress(company.county).includes('bucure');
  const county = bucharest ? 'Bucuresti' : company.county;
  const locality = bucharest ? 'Bucuresti' : company.locality;
  try {
    const response = await fetch('https://www.posta-romana.ro/cnpr-app/modules/cauta-cod-postal/ajax/cautare_pentru_cod.php?q=', {
      method: 'POST', body: new URLSearchParams({ k_adresa: streetName, k_judet: county, k_localitate: locality, k_lang: 'ro' }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) throw new Error('Postal source unavailable');
    const payload = object(await response.json());
    if (typeof payload['formular'] !== 'string') throw new Error('Invalid postal response');
    const candidates = parsePostalHtml(payload['formular']);
    const match = matchPostal(candidates, county, locality, streetName, number);
    return { ...company, postalCode: match.code, postalSource: match.code ? 'Poșta Română' : '', postalStatus: match.code ? 'verified' : match.ambiguous ? 'ambiguous' : 'missing' };
  } catch {
    return { ...company, postalStatus: 'unavailable' };
  }
}
export async function lookupCompanies(cuis: string[], date: string, postal: boolean) {
  const checkedAt = new Date().toISOString();
  let payload: RecordData;
  try {
    const response = await fetch('https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(cuis.map(cui => ({ cui: Number(cui), data: date }))), signal: AbortSignal.timeout(25000),
    });
    if (!response.ok) throw new Error(`ANAF HTTP ${response.status}`);
    payload = object(await response.json());
    // V9 returns found/notFound without the older cod field on successful replies.
    if ((payload['cod'] !== undefined && Number(payload['cod']) !== 200) || !Array.isArray(payload['found'])) throw new Error('ANAF invalid response');
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
    let company = mapAnafRecord(row, checkedAt);
    if (postal && !company.postalCode) {
      const social = object(row['adresa_sediu_social']), fiscal = object(row['adresa_domiciliu_fiscal']);
      const socialUsed = Boolean(string(social['sdenumire_Localitate']) || string(social['sdenumire_Strada']));
      const a = socialUsed ? social : fiscal, p = socialUsed ? 's' : 'd';
      company = await enrichPostal(company, string(a[`${p}denumire_Strada`]), string(a[`${p}numar_Strada`]));
    }
    companies.push(company);
  }
  return companies;
}