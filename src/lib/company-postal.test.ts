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
  expect(parsePostalHtml('<div class="col-md-12 cod-postal-line"><p>010084</p><p>București</p><p>București</p><p>Calea Victoriei nr. 58-70</p></div>')[0]?.code).toBe('010084');
});
it('matches the official terminal ranges without mixing odd and even sides', () => {
  const rows = [
    { code: '060783', county: 'București', locality: 'București', street: 'Șoseaua Virtuții nr. 101-T' },
    { code: '060787', county: 'București', locality: 'București', street: 'Șoseaua Virtuții nr. 100-T' },
  ];
  expect(matchPostal(rows, 'Bucuresti', 'Bucuresti', 'Şos. Virtuţii', '148').code).toBe('060787');
  expect(matchPostal(rows, 'Bucuresti', 'Bucuresti', 'Şos. Virtuţii', '149').code).toBe('060783');
  expect(matchPostal(rows, 'Bucuresti', 'Bucuresti', 'Şos. Virtuţii', '98').code).toBe('');
});
it('matches each official semicolon-delimited range independently', () => {
  const rows = [{ code: '400460', county: 'Cluj', locality: 'Cluj-Napoca', street: 'Calea Florești nr. 1-73; 2-6' }];
  expect(matchPostal(rows, 'Cluj', 'Cluj-Napoca', 'Calea Florești', '73').code).toBe('400460');
  expect(matchPostal(rows, 'Cluj', 'Cluj-Napoca', 'Calea Florești', '6').code).toBe('400460');
  expect(matchPostal(rows, 'Cluj', 'Cluj-Napoca', 'Calea Florești', '8').code).toBe('');
});
it('leaves malformed or mixed-parity ranges unresolved', () => {
  const rows = [{ code: '010084', county: 'București', locality: 'București', street: 'Calea Victoriei nr. 1-10' }];
  expect(matchPostal(rows, 'Bucuresti', 'Bucuresti', 'Calea Victoriei', '4').code).toBe('');
});