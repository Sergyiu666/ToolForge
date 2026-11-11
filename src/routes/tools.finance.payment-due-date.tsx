import { createFileRoute, redirect } from '@tanstack/react-router';
import { meta } from '@/components/ToolPage';

export const Route = createFileRoute('/tools/finance/payment-due-date')({
  head: () => meta('Late Payment Calculator Moved to Sales — Toolforge', 'The payment due date and contractual late penalty calculator is now available in Sales.'),
  beforeLoad: () => { throw redirect({ to: '/tools/sales/payment-due-date', replace: true }); },
});
