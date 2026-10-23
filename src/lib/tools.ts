export type Tool = { name: string; description: string; live?: boolean; href?: string };
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
      { name: "Loan Calculator", description: "Monthly payments and amortization schedules." },
      { name: "Currency Converter", description: "Live exchange rates from public rate servers." },
      { name: "Gross / Net / VAT Calculator", description: "Any VAT rate, plus AI invoice reading.", live: true, href: "/tools/finance/vat-calculator" },
      { name: "Invoice Generator", description: "Create clean PDF invoices in seconds." },
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
      { name: "Working Days Counter", description: "Business days between dates, with holidays." },
    ],
  },
  {
    slug: "sales",
    name: "Sales",
    tagline: "Pricing, margins, forecasts and company lookups.",
    icon: "↗",
    tools: [
      { name: "Margin & Markup", description: "Convert between margin, markup and price." },
      { name: "Discount Calculator", description: "Stacked discounts and final prices." },
      { name: "Company Lookup", description: "Fetch company data from public registries." },
      { name: "Commission Calculator", description: "Tiered commission payouts." },
    ],
  },
  {
    slug: "utilities",
    name: "Everyday Utilities",
    tagline: "Quick helpers for text, numbers and data.",
    icon: "⌘",
    tools: [
      { name: "Unit Converter", description: "Length, weight, temperature and more." },
      { name: "Word Counter", description: "Words, characters and reading time." },
      { name: "QR Code Generator", description: "Turn any link into a QR code." },
      { name: "Password Generator", description: "Strong random passwords." },
    ],
  },
];

export const getCategory = (slug: string) => categories.find((c) => c.slug === slug);
