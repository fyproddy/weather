import { describe, expect, it } from "vitest";
import { checkAdLine, type AllowedSources } from "@/lib/ad-copy";

const allowed: AllowedSources = {
  clientName: "WeatherGuard Waterproofing SA",
  industry: "Waterproofing & roofing",
  services: ["Liquid rubber waterproofing", "Roof repairs & restoration", "Damp proofing"],
  locations: ["Johannesburg", "Gauteng", "Sandton"],
  verifiedFacts: ["Free on-site inspection and quote", "Workmanship warranty on every job"],
};
const flags = (kind: "headline" | "description" | "callout", text: string) => checkAdLine(kind, text, allowed).flags;

describe("checkAdLine", () => {
  it("passes lines built only from verified facts, services and areas", () => {
    expect(flags("headline", "Roof Repairs in Sandton")).toEqual([]);
    expect(flags("headline", "Free Roof Inspection")).toEqual([]); // backed by a verified fact
    expect(flags("description", "Liquid rubber waterproofing with a workmanship warranty. Book your free inspection today.")).toEqual([]);
  });

  it("enforces Google's character limits", () => {
    expect(flags("headline", "Waterproofing Specialists Johannesburg")[0]).toMatch(/Too long: 38\/30/);
    expect(checkAdLine("callout", "x".repeat(25), allowed).overLimit).toBe(false);
    expect(checkAdLine("callout", "x".repeat(26), allowed).overLimit).toBe(true);
  });

  it("flags invented numbers, prices and experience", () => {
    expect(flags("headline", "Roofs From R999")).toContain('Number "999" isn\'t in the verified facts');
    expect(flags("headline", "20 Years Experience").join(" ")).toMatch(/Number "20"|experience claim/);
    expect(flags("headline", "10% Off Waterproofing")).toContain('Number "10" isn\'t in the verified facts');
  });

  it("flags unverified claims and superlatives", () => {
    expect(flags("headline", "Best Roofers in Gauteng")).toContain('"Best" makes a superlative claim that isn\'t in the verified facts');
    expect(flags("headline", "SABS Approved Products").join(" ")).toMatch(/licence \/ registration|accreditation body/);
    expect(flags("headline", "Guaranteed Leak-Free Roofs").join(" ")).toMatch(/guarantee claim/);
    expect(flags("callout", "24/7 Emergency Call-Outs").join(" ")).toMatch(/speed \/ availability/);
    expect(flags("headline", "Award-Winning Team").join(" ")).toMatch(/award claim/);
  });

  it("allows a claim once the client has verified it", () => {
    const withMore = { ...allowed, verifiedFacts: [...allowed.verifiedFacts, "Over 15 years in business", "24/7 emergency call-outs"] };
    expect(checkAdLine("headline", "15 Years in Business", withMore).flags).toEqual([]);
    expect(checkAdLine("callout", "24/7 Emergency Call-Outs", withMore).flags).toEqual([]);
  });

  it("flags places the client doesn't serve", () => {
    expect(flags("headline", "Roof Repairs in Pretoria")).toContain('"Pretoria" isn\'t one of the client\'s areas');
    expect(flags("headline", "Roof Repairs in Cape Town")).toContain('"Cape Town" isn\'t one of the client\'s areas');
  });
});
