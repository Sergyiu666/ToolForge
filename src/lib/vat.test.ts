import { describe, expect, it } from "vitest";
import { computeVat } from "./vat";

describe("computeVat", () => {
  it("net 100 at 21% gives 121 gross", () => {
    expect(computeVat("net", 100, 21)).toEqual({ net: 100, vat: 21, gross: 121 });
  });
  it("gross 111 at 11% gives net 100", () => {
    expect(computeVat("gross", 111, 11)).toEqual({ net: 100, vat: 11, gross: 111 });
  });
  it("vat 21 at 21% gives net 100", () => {
    expect(computeVat("vat", 21, 21)).toEqual({ net: 100, vat: 21, gross: 121 });
  });
  it("0% rate keeps gross equal to net", () => {
    expect(computeVat("gross", 50, 0)).toEqual({ net: 50, vat: 0, gross: 50 });
  });
});
