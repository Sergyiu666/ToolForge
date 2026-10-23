import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { z } from "zod";

const RUN_ID = "X-Lovable-AIG-Run-ID";

export const invoiceSchema = z.object({
  vendor: z.string().nullable(),
  currency: z.string().nullable(),
  items: z.array(
    z.object({
      description: z.string(),
      category: z.string(),
      net: z.number(),
      vatRate: z.number(),
      vat: z.number(),
      gross: z.number(),
    }),
  ),
});
export type InvoiceAnalysis = z.infer<typeof invoiceSchema>;

const INSTRUCTIONS = `You read invoices and receipts from images or PDFs.
Extract every line item. For each item return: description (short, as written), category (a general accounting/expense category in English such as "Food & Beverages", "Office Supplies", "Software & Subscriptions", "Fuel & Transport", "Utilities", "Professional Services", "Equipment", "Travel & Accommodation", "Marketing", "Telecommunications", "Other"), net amount, VAT rate in percent (e.g. 21, 11, 0), VAT amount and gross amount.
Use numbers only (dot as decimal separator). If only gross or net is shown, compute the others from the VAT rate on the document. Return currency as an ISO code if visible, else null. Return vendor name if visible, else null. If the image is not an invoice, return an empty items list.`;

export async function analyzeInvoice(dataUrl: string, mimeType: string): Promise<InvoiceAnalysis> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured.");
  let runId: string | undefined;
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    fetch: async (input, init) => {
      const headers = new Headers(init?.headers);
      if (runId) headers.set(RUN_ID, runId);
      const res = await fetch(input, { ...init, headers });
      runId ??= res.headers.get(RUN_ID) ?? undefined;
      return res;
    },
  });

  const isPdf = mimeType === "application/pdf";
  const part = isPdf
    ? ({ type: "file", filename: "invoice.pdf", data: dataUrl.split(",")[1] ?? "", mediaType: "application/pdf" } as const)
    : ({ type: "image", image: new URL(dataUrl) } as const);

  let streamError: unknown;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: INSTRUCTIONS,
    messages: [{ role: "user", content: [{ type: "text", text: "Extract the line items from this invoice." }, part] }],
    output: Output.object({ schema: invoiceSchema }),
    onError: ({ error }) => {
      streamError = error;
    },
    providerOptions: {
      openai: {
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        store: false,
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  try {
    return await result.output;
  } catch (e) {
    const err = (streamError ?? e) as { statusCode?: number; message?: string };
    if (err?.statusCode === 429) throw new Error("Too many requests right now — please try again in a moment.");
    if (err?.statusCode === 402) throw new Error("AI credits have run out for this workspace.");
    throw new Error("Could not read this invoice. Try a clearer image.");
  }
}
