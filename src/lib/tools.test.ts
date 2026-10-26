import { describe, expect, it } from "vitest";
import { categories, getCategory } from "./tools";

describe("tool catalog scope", () => {
  it("contains only Finance & Accounting, HR, and Sales", () => {
    expect(categories.map(category => category.name)).toEqual(["Finance & Accounting", "HR", "Sales"]);
    expect(getCategory("utilities")).toBeUndefined();
  });
  it("keeps only the existing two live tools", () => {
    expect(categories.flatMap(category => category.tools).filter(tool => tool.live).map(tool => tool.href)).toEqual([
      "/tools/finance/company-lookup", "/tools/finance/vat-calculator",
    ]);
    expect(categories.map(category => category.tools.length)).toEqual([5, 4, 4]);
  });
});