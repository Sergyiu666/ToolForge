import { blankCompany, type Company } from './company';
import { lookupCompanies } from './company.server';
import { vatIdentity, type ViesResult } from './vies';

const clean = (value: unknown) => typeof value === 'string' && value.trim() !== '---' ? value.trim() : '';
export async function checkVies(key: string): Promise<ViesResult> {
  const identity = vatIdentity(key);
  const checkedAt = new Date().toISOString();
  const unavailable: ViesResult = { status: 'unavailable', checkedAt, name: '', address: '', message: 'VIES could not complete this check. Retry later; validity is unknown.' };
  if (!identity) return unavailable;
  try {
    const response = await fetch('https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ countryCode: identity.country, vatNumber: identity.number }), signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return unavailable;
    const data = await response.json() as Record<string, unknown>;
    if (typeof data['valid'] !== 'boolean' || (data['actionSucceed'] === false) || (Array.isArray(data['errorWrappers']) && data['errorWrappers'].length > 0)) return unavailable;
    return { status: data['valid'] ? 'valid' : 'invalid', checkedAt: clean(data['requestDate']) || checkedAt, name: clean(data['name']), address: clean(data['address']), message: '' };
  } catch { return unavailable; }
}

// One ANAF request plus at most five VIES requests: within the six-connection runtime budget.
export async function lookupVatCompanies(keys: string[], date: string): Promise<Company[]> {
  const ro = keys.filter(key => vatIdentity(key)?.country === 'RO');
  const [anaf, vies] = await Promise.all([ro.length ? lookupCompanies(ro, date) : Promise.resolve([]), Promise.all(keys.map(checkVies))]);
  return keys.map((key, index) => {
    const result = vies[index];
    const identity = vatIdentity(key);
    const row = identity?.country === 'RO' ? anaf.find(c => c.cui === key) : {
      ...blankCompany(key, result?.status === 'valid' ? 'found' : result?.status === 'invalid' ? 'not-found' : 'error', '', result?.checkedAt || ''),
      name: result?.name || '', address: result?.address || '',
    };
    return { ...(row || blankCompany(key, 'error', 'Registry response unavailable.', new Date().toISOString())), vies: result };
  });
}