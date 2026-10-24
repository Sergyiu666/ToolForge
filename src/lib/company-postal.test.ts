import { expect, it } from 'vitest';
import { matchPostal, parsePostalHtml } from './company-postal';
const candidates = [
  { code: '010084', county: 'București', locality: 'București', street: 'Calea Victoriei nr. 58-70' },
  { code: '010085', county: 'București', locality: 'București', street: 'Calea Victoriei nr. 72-88' },
];
it('selects only the matching street number range from official results', () => {
  expect(matchPostal(candidates, 'Bucuresti', 'Bucuresti', 'Calea Victoriei', '60').code).toBe('010084');
  expect(matchPostal(candidates, 'Bucuresti', 'Bucuresti', 'Calea Victoriei', '74').code).toBe('010085');
});
it('does not select a postcode for ambiguous or unmatched addresses', () => {
  expect(matchPostal(candidates, 'Bucuresti', 'Bucuresti', 'Calea Victoriei', '').code).toBe('');
  expect(matchPostal(candidates, 'Bucuresti', 'Bucuresti', 'Calea Victoriei', '61').code).toBe('');
});
it('extracts plain candidate fields without rendering external HTML', () => {
  expect(parsePostalHtml('<div class="col-md-12 cod-postal-line"><p>010084</p><p>București</p><p>București</p><p>Calea Victoriei nr. 58-70</p></div>')[0].code).toBe('010084');
});