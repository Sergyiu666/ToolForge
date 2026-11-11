import { createFileRoute } from '@tanstack/react-router';
import { meta } from '@/components/ToolPage';
import { InvoiceReview } from '@/components/invoice/InvoiceReview';

export const Route = createFileRoute('/tools/finance/invoice-review')({
  head: () => meta('Invoice Review & IFS Export — Toolforge', 'Review local e-Factura XML and spreadsheet invoices, assign OMFP accounts and cost or profit centers, split lines and export IFS staging files.'),
  component: InvoiceReview,
});