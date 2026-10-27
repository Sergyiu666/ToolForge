export type ToolHref =
  | "/tools/finance/company-lookup"
  | "/tools/finance/vat-calculator"
  | "/tools/finance/loan-calculator"
  | "/tools/hr/working-days"
  | "/tools/sales/margin-markup"
  | "/tools/sales/discount-calculator"
  | "/tools/sales/commission-calculator";
export type Tool = { name: string; description: string; live?: boolean; href?: ToolHref };
export type Category = {
  slug: string;
  name: string;
  tagline: string;
  icon: string;
  tools: Tool[];
};

export const categories: Category[] = [
  {
    slug: "finance",
    name: "Finance & Accounting",
    tagline: "Calculators, currency rates, invoices and tax helpers.",
    icon: "₿",
    tools: [
      { name: "Loan Calculator", description: "Monthly payments and amortization schedules.", live: true, href: "/tools/finance/loan-calculator" },
      { name: "BNR Currency Converter", description: "Convert using official BNR exchange rates." },
      { name: "ANAF Company Lookup", description: "Bulk CUI lookup, VAT status and official postal codes.", live: true, href: "/tools/finance/company-lookup" },
      { name: "Gross / Net / VAT Calculator", description: "Any VAT rate, plus AI invoice reading.", live: true, href: "/tools/finance/vat-calculator" },
      { name: "Invoice Generator", description: "Create clean PDF invoices in seconds." },
      { name: "Invoice Review & Assignments", description: "Review invoice lines and assign accounts, cost and profit centers." },
      { name: "Export Profiles (ERP / IFS)", description: "Configurable export layouts for your accounting software." },
      { name: "Payment Due Date & Late Penalties", description: "Due dates and late payment penalty amounts." },
      { name: "PFA vs SRL / Dividend vs Salary", description: "Compare business forms and ways to pay yourself." },
    ],
  },
  {
    slug: "hr",
    name: "HR",
    tagline: "Salary, time-off and hiring utilities.",
    icon: "◎",
    tools: [
      { name: "Gross to Net Salary", description: "Estimate take-home pay after taxes." },
      { name: "Vacation Day Tracker", description: "Calculate accrued and remaining leave." },
      { name: "Job Description Builder", description: "Draft structured job postings." },
      { name: "Working Days Counter", description: "Business days between dates, with holidays.", live: true, href: "/tools/hr/working-days" },
      { name: "Overtime & Night Work Pay", description: "Extra pay for overtime and night hours." },
    ],
  },
  {
    slug: "sales",
    name: "Sales",
    tagline: "Pricing, margins, forecasts and company lookups.",
    icon: "↗",
    tools: [
      { name: "Margin & Markup", description: "Convert between margin, markup and price.", live: true, href: "/tools/sales/margin-markup" },
      { name: "Discount Calculator", description: "Stacked discounts and final prices.", live: true, href: "/tools/sales/discount-calculator" },
      { name: "Company Lookup", description: "Fetch company data from public registries." },
      { name: "Commission Calculator", description: "Tiered commission payouts.", live: true, href: "/tools/sales/commission-calculator" },
    ],
  },
];

export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);
