import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const analyzeInvoiceFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      dataUrl: z.string().startsWith("data:").max(15_000_000),
      mimeType: z.enum(["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"]),
    }),
  )
  .handler(async ({ data }) => {
    const { analyzeInvoice } = await import("./invoice-ai.server");
    return analyzeInvoice(data.dataUrl, data.mimeType);
  });
