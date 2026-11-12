import { describe, expect, it } from 'vitest';
import { growth, isInsolvency, netResult, parseCourtCases, parseFinancials } from './insights';

describe('parseFinancials', () => {
  it('maps indicators by label even when codes shift', () => {
    const f = parseFinancials({ i: [
      { indicator: 'I9', val_indicator: 500, val_den_indicator: 'Cifra de afaceri neta' },
      { indicator: 'I2', val_indicator: 12, val_den_indicator: 'Numar mediu de salariati' },
      { indicator: 'I3', val_indicator: 0, val_den_indicator: 'Profit net' },
      { indicator: 'I4', val_indicator: 40, val_den_indicator: 'Pierdere neta' },
      { indicator: 'I5', val_indicator: 7, val_den_indicator: 'Casa şi conturi la bănci' },
    ] }, 2024)!;
    expect(f.turnover).toBe(500); expect(f.employees).toBe(12); expect(f.cash).toBe(7);
    expect(netResult(f)).toBe(-40);
  });
  it('returns null when no statement is published', () => {
    expect(parseFinancials({ i: [] }, 2025)).toBeNull();
    expect(parseFinancials(null, 2025)).toBeNull();
  });
  it('computes growth and refuses a zero base', () => {
    expect(growth(150, 100)).toBe(50); expect(growth(5, 0)).toBeNull();
  });
});

const xml = `<Dosar><parti><DosarParte><nume>S.C. ACME TRADE S.R.L.</nume><calitateParte>Pârât</calitateParte></DosarParte></parti><numar>1/2/2024</numar><data>2024-03-01T00:00:00</data><institutie>TribunalulBUCURESTI</institutie><categorieCazNume>Faliment</categorieCazNume><stadiuProcesualNume>Fond</stadiuProcesualNume><obiect>procedura insolvenţei</obiect></Dosar>
<Dosar><parti><DosarParte><nume>ACME TRADING CONSULT SRL</nume><calitateParte>Reclamant</calitateParte></DosarParte></parti><numar>9/9/2023</numar><data>2023-01-01T00:00:00</data><institutie>JudecatoriaCLUJ</institutie><obiect>pretenţii</obiect></Dosar>`;
describe('parseCourtCases', () => {
  it('keeps only parties containing every searched name token', () => {
    const c = parseCourtCases(xml, 'Acme Trade SRL');
    expect(c).toHaveLength(1);
    expect(c[0]!.number).toBe('1/2/2024'); expect(c[0]!.court).toBe('Tribunalul BUCURESTI');
    expect(c[0]!.role).toBe('Pârât'); expect(isInsolvency(c[0]!)).toBe(true);
  });
});
