import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { z } from 'zod';
import { safeSpreadsheetValue } from './company';
import preset from '@/data/omfp-accounts.json';

export const accountSource = 'https://denar.ro/legislatie/omfp-1802-2014/anexa/capitolul-14/';
export const omfpAccounts = preset;
export type Code = { code: string; name: string };
const allocationSchema = z.object({ percent: z.number().finite(), account: z.string(), cost: z.string(), profit: z.string() });
const lineSchema = z.object({ id: z.string(), description: z.string(), net: z.number().finite(), vatRate: z.number().finite(), vat: z.number().finite(), allocations: z.array(allocationSchema) });
const invoiceSchema = z.object({ number: z.string(), date: z.string(), vendor: z.string(), currency: z.string(), declaredNet: z.number().finite().nullable(), lines: z.array(lineSchema) });
export type Allocation = z.infer<typeof allocationSchema>;
export type InvoiceLine = z.infer<typeof lineSchema>;
export type ReviewInvoice = z.infer<typeof invoiceSchema>;
export const blankAllocation = (): Allocation => ({ percent: 100, account: '', cost: '', profit: '' });
export const blankInvoice = (): ReviewInvoice => ({ number: '', date: '', vendor: '', currency: 'RON', declaredNet: null, lines: [] });
export const blankLine = (): InvoiceLine => ({ id: crypto.randomUUID(), description: '', net: 0, vatRate: 0, vat: 0, allocations: [blankAllocation()] });
export const exportKeys = ['number', 'date', 'vendor', 'currency', 'line', 'description', 'account', 'cost', 'profit', 'percent', 'net', 'vatRate', 'vat', 'gross'] as const;
export type ExportKey = typeof exportKeys[number];
export type Profile = { name: string; delimiter: ',' | ';'; headers: Record<ExportKey, string> };
export const ifsProfile: Profile = { name: 'IFS Applications — staging', delimiter: ';', headers: { number: 'INVOICE_NO', date: 'INVOICE_DATE', vendor: 'SUPPLIER', currency: 'CURRENCY_CODE', line: 'LINE_NO', description: 'DESCRIPTION', account: 'ACCOUNT', cost: 'CODE_B', profit: 'CODE_C', percent: 'ALLOCATION_PERCENT', net: 'NET_AMOUNT', vatRate: 'VAT_RATE', vat: 'VAT_AMOUNT', gross: 'GROSS_AMOUNT' } };
export const workspaceSchema = z.object({ invoice: invoiceSchema, accounts: z.array(z.object({ code: z.string(), name: z.string() })), costs: z.array(z.object({ code: z.string(), name: z.string() })), profits: z.array(z.object({ code: z.string(), name: z.string() })), profile: z.object({ name: z.string(), delimiter: z.enum([',', ';']), headers: z.object(Object.fromEntries(exportKeys.map(k => [k, z.string()])) as Record<ExportKey, z.ZodString>) }) });
export type Workspace = z.infer<typeof workspaceSchema>;
export const initialWorkspace = (): Workspace => ({ invoice: blankInvoice(), accounts: omfpAccounts, costs: [], profits: [], profile: ifsProfile });

type Node = Record<string, any>;
const list = (v: any): Node[] => v == null ? [] : Array.isArray(v) ? v : [v];
const text = (v: any): string => v == null ? '' : String(typeof v === 'object' ? v['#text'] ?? '' : v);
const amount = (v: any) => {
  const s = text(v).trim().replace(',', '.');
  if (!s || !Number.isFinite(Number(s))) throw new Error('A required invoice amount is missing or invalid.');
  return Number(s);
};
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export function parseInvoiceXml(xml: string): ReviewInvoice {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml) || XMLValidator.validate(xml) !== true) throw new Error('Use a valid UBL invoice XML without external entities.');
  const root = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true, parseTagValue: false, processEntities: false }).parse(xml);
  const doc: Node = root.Invoice ?? root.CreditNote;
  if (!doc || !text(doc.UBLVersionID).startsWith('2.1') && text(doc.UBLVersionID)) throw new Error('Expected a UBL 2.1 Invoice or CreditNote.');
  const credit = Boolean(root.CreditNote);
  const lines = list(doc.InvoiceLine ?? doc.CreditNoteLine).map((line, i): InvoiceLine => {
    const taxes = list(line.Item?.ClassifiedTaxCategory);
    if (taxes.length !== 1) throw new Error(`Line ${i + 1}: missing or multiple VAT categories; enter this line manually.`);
    const rate = amount(taxes[0]?.Percent ?? '0');
    if (rate < 0 || rate > 100) throw new Error(`Line ${i + 1}: invalid VAT percentage.`);
    const net = amount(line.LineExtensionAmount) * (credit ? -1 : 1);
    return { id: `xml-${i}`, description: text(line.Item?.Name) || text(line.Item?.Description), net, vatRate: rate, vat: round(net * rate / 100), allocations: [blankAllocation()] };
  });
  if (!lines.length) throw new Error('No invoice lines found.');
  const supplier = doc.AccountingSupplierParty?.Party;
  return { number: text(doc.ID), date: text(doc.IssueDate), vendor: text(supplier?.PartyLegalEntity?.RegistrationName) || text(supplier?.PartyName?.Name), currency: text(doc.DocumentCurrencyCode), declaredNet: doc.LegalMonetaryTotal?.LineExtensionAmount == null ? null : amount(doc.LegalMonetaryTotal.LineExtensionAmount) * (credit ? -1 : 1), lines };
}

export function invoiceFromRows(rows: Record<string, unknown>[], mapping: Record<string, string>): ReviewInvoice {
  if (!rows.length) throw new Error('The selected sheet is empty.');
  const read = (r: Record<string, unknown>, key: string) => String(r[mapping[key]] ?? '').trim();
  const first = rows[0];
  if (!first) throw new Error('No rows found.');
  const invoice = blankInvoice();
  for (const key of ['number', 'date', 'vendor', 'currency'] as const) invoice[key] = read(first, key);
  invoice.lines = rows.map((r, i) => {
    for (const key of ['number', 'date', 'vendor', 'currency']) if (read(r, key) !== read(first, key)) throw new Error('Import one invoice and currency at a time.');
    const net = amount(read(r, 'net'));
    const vatRate = amount(read(r, 'vatRate'));
    if (vatRate < 0 || vatRate > 100) throw new Error(`Row ${i + 1}: invalid VAT percentage.`);
    return { id: `sheet-${i}`, description: read(r, 'description'), net, vatRate, vat: mapping.vat ? amount(read(r, 'vat')) : round(net * vatRate / 100), allocations: [blankAllocation()] };
  });
  return invoice;
}

export function codesFromRows(rows: Record<string, unknown>[], codeHeader: string, nameHeader: string): Code[] {
  const codes = rows.map(r => ({ code: String(r[codeHeader] ?? '').trim(), name: String(r[nameHeader] ?? '').trim() }));
  if (!codes.length || codes.some(c => !c.code || !c.name) || new Set(codes.map(c => c.code)).size !== codes.length) throw new Error('Every row needs a unique code and a name.');
  return codes;
}
export function reviewIssues(w: Workspace): string[] {
  const { invoice, accounts, costs, profits, profile } = w;
  const issues: string[] = [];
  if (!invoice.number.trim() || !invoice.vendor.trim() || !/^[A-Z]{3}$/.test(invoice.currency)) issues.push('Enter invoice number, supplier and a three-letter currency.');
  const date = new Date(`${invoice.date}T00:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== invoice.date) issues.push('Enter a valid invoice date.');
  if (!invoice.lines.length) issues.push('Add at least one invoice line.');
  invoice.lines.forEach((l, i) => {
    if (!l.description.trim() || ![l.net, l.vat, l.vatRate].every(Number.isFinite) || l.vatRate < 0 || l.vatRate > 100) issues.push(`Line ${i + 1}: check description, amounts and VAT rate.`);
    if (!l.allocations.length || Math.abs(l.allocations.reduce((s, a) => s + a.percent, 0) - 100) > 0.000001 || l.allocations.some(a => !Number.isFinite(a.percent) || a.percent <= 0 || a.percent > 100)) issues.push(`Line ${i + 1}: allocations must total 100%.`);
    if (l.allocations.some(a => !accounts.some(c => c.code === a.account) || a.cost && !costs.some(c => c.code === a.cost) || a.profit && !profits.some(c => c.code === a.profit))) issues.push(`Line ${i + 1}: choose valid accounts and centers.`);
  });
  if (invoice.declaredNet !== null && Math.abs(invoice.lines.reduce((s, l) => s + l.net, 0) - invoice.declaredNet) > 0.02) issues.push('Line net total differs from the imported invoice total.');
  const headers = exportKeys.map(k => profile.headers[k].trim());
  if (headers.some(h => !h) || new Set(headers).size !== headers.length) issues.push('Export column names must be non-empty and unique.');
  return issues;
}
export function suggestion(description: string, accounts: Code[]): string | undefined {
  const rules: [RegExp, string][] = [[/combustibil|benzina|motorina|fuel/i, '6022'], [/energie|electric/i, '6051'], [/chirie|rent/i, '6123'], [/telecom|telefon|internet/i, '626'], [/consultan|consulting/i, '618'], [/repara|repair/i, '611']];
  return rules.find(([pattern, code]) => pattern.test(description) && accounts.some(a => a.code === code))?.[1];
}
export function exportRows(w: Workspace): (string | number)[][] {
  const issues = reviewIssues(w);
  if (issues.length) throw new Error(issues.join('\n'));
  const output: (string | number)[][] = [exportKeys.map(k => safeSpreadsheetValue(w.profile.headers[k].trimStart()))];
  w.invoice.lines.forEach((l, i) => {
    let usedNet = 0, usedVat = 0;
    l.allocations.forEach((a, j) => {
      const last = j === l.allocations.length - 1;
      const net = last ? round(l.net - usedNet) : round(l.net * a.percent / 100);
      const vat = last ? round(l.vat - usedVat) : round(l.vat * a.percent / 100);
      usedNet = round(usedNet + net); usedVat = round(usedVat + vat);
      const row: Record<ExportKey, string | number> = { ...w.invoice, line: i + 1, description: l.description, account: a.account, cost: a.cost, profit: a.profit, percent: a.percent, net, vatRate: l.vatRate, vat, gross: round(net + vat) };
      output.push(exportKeys.map(k => typeof row[k] === 'string' ? safeSpreadsheetValue(String(row[k]).trimStart()) : row[k]));
    });
  });
  return output;
}
export function csvText(rows: (string | number)[][], delimiter: string): string {
  return '\ufeff' + rows.map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(delimiter)).join('\r\n');
}