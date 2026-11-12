import { describe, expect, it } from "vitest";
import { categories, getCategory } from "./tools";

describe("tool catalog scope", () => {
  it("contains only Finance & Accounting, HR, and Sales", () => {
    expect(categories.map(category => category.name)).toEqual(["Finance & Accounting", "HR", "Sales"]);
    expect(getCategory("utilities")).toBeUndefined();
  });
  it("every live tool has a destination", () => {
    const live = categories.flatMap(category => category.tools).filter(tool => tool.live);
    expect(live).toHaveLength(13);
    expect(live.every(tool => tool.href)).toBe(true);
    expect(categories.map(category => category.tools.length)).toEqual([8, 5, 5]);
  });
  it('places late penalties in Sales, not Finance', () => {
    expect(getCategory('sales')?.tools.find(t => t.href === '/tools/sales/payment-due-date')?.live).toBe(true);
    expect(getCategory('finance')?.tools.some(t => t.name === 'Payment Due Date & Late Penalties')).toBe(false);
  });
});