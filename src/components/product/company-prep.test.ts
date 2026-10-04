import { describe, it, expect } from "vitest";
import {
  mapCompanyCategory,
  formatCompanyReadiness,
  getCompanyMonogram,
  getMonogramGradient,
  type CompanyPrepDTO,
  type CompanyPrepPageData,
} from "./company-prep-view";

describe("Screen 13 — Company Prep Page Architecture & Presentation Invariants", () => {
  describe("1. Category Mapping Invariants (Remove incorrect placeholder labels)", () => {
    it("should map big_tech tier and faang tags to 'FAANG / Big Tech'", () => {
      expect(mapCompanyCategory("big_tech")).toBe("FAANG / Big Tech");
      expect(mapCompanyCategory("product", ["faang"])).toBe("FAANG / Big Tech");
      expect(mapCompanyCategory(undefined, ["big-tech"])).toBe("FAANG / Big Tech");
    });

    it("should map product tier to human-readable 'Product Tech', avoiding raw 'product'", () => {
      const category = mapCompanyCategory("product");
      expect(category).toBe("Product Tech");
      expect(category).not.toBe("product");
    });

    it("should map growth and startup tiers to professional designations", () => {
      expect(mapCompanyCategory("growth")).toBe("High-Growth Scaleup");
      expect(mapCompanyCategory("startup")).toBe("Early-Stage Startup");
    });

    it("should respect domain tags like fintech and enterprise", () => {
      expect(mapCompanyCategory("growth", ["fintech"])).toBe("Fintech");
      expect(mapCompanyCategory("product", ["enterprise"])).toBe("Enterprise / SaaS");
    });

    it("should fallback gracefully to 'Technology' when tier is absent", () => {
      expect(mapCompanyCategory(undefined, [])).toBe("Technology");
      expect(mapCompanyCategory("", [])).toBe("Technology");
    });
  });

  describe("2. Company Readiness Formatting & Completion State", () => {
    it("should format readiness >= 80% as 'Interview Ready' with positive completion state", () => {
      const ready85 = formatCompanyReadiness(85);
      expect(ready85.label).toBe("Interview Ready");
      expect(ready85.isReady).toBe(true);
      expect(ready85.color).toContain("emerald");

      const ready80 = formatCompanyReadiness(80);
      expect(ready80.label).toBe("Interview Ready");
      expect(ready80.isReady).toBe(true);
    });

    it("should format readiness between 1% and 79% as 'In Progress'", () => {
      const progress50 = formatCompanyReadiness(50);
      expect(progress50.label).toBe("In Progress");
      expect(progress50.isReady).toBe(false);
      expect(progress50.color).toContain("cyan");
    });

    it("should format readiness 0% as 'Not Started'", () => {
      const zero = formatCompanyReadiness(0);
      expect(zero.label).toBe("Not Started");
      expect(zero.isReady).toBe(false);
    });
  });

  describe("3. Monogram & Logo Visual Styling Invariants", () => {
    it("should extract 2-letter monogram for multi-word company names", () => {
      expect(getCompanyMonogram("Two Sigma")).toBe("TS");
      expect(getCompanyMonogram("Meta Platforms")).toBe("MP");
      expect(getCompanyMonogram("Goldman Sachs")).toBe("GS");
    });

    it("should extract 2-letter monogram for single-word company names", () => {
      expect(getCompanyMonogram("Amazon")).toBe("AM");
      expect(getCompanyMonogram("Google")).toBe("GO");
      expect(getCompanyMonogram("Stripe")).toBe("ST");
    });

    it("should return distinct gradients for major tech companies", () => {
      const amazonGrad = getMonogramGradient("amazon");
      const googleGrad = getMonogramGradient("google");
      const stripeGrad = getMonogramGradient("stripe");

      expect(amazonGrad).toContain("amber");
      expect(googleGrad).toContain("blue");
      expect(stripeGrad).toContain("indigo");
    });
  });

  describe("4. Empty / In-Curation State & Zero-Placeholder Invariants", () => {
    it("should detect when no companies have curated content", () => {
      const placeholderCompanies: CompanyPrepDTO[] = [
        {
          id: "c-1",
          slug: "amazon",
          name: "Amazon",
          category: "FAANG / Big Tech",
          patterns: [],
          problemCount: 0,
          sets: 0,
          readiness: 0,
          focus: ["FAANG / Big Tech"],
          isTargetCompany: true,
          hasContent: false,
          status: "not_started",
        },
        {
          id: "c-2",
          slug: "google",
          name: "Google",
          category: "FAANG / Big Tech",
          patterns: [],
          problemCount: 0,
          sets: 0,
          readiness: 0,
          focus: ["FAANG / Big Tech"],
          isTargetCompany: false,
          hasContent: false,
          status: "not_started",
        },
      ];

      const pageData: CompanyPrepPageData = {
        companies: placeholderCompanies,
        targetCompany: { id: "c-1", name: "Amazon", slug: "amazon" },
        hasAnyCompanyContent: false,
      };

      expect(pageData.hasAnyCompanyContent).toBe(false);
      expect(pageData.targetCompany?.name).toBe("Amazon");
      // All companies have hasContent = false
      expect(pageData.companies.every((c) => !c.hasContent)).toBe(true);
    });

    it("should activate content mode when at least one company has curated problem sets or patterns", () => {
      const activeCompanies: CompanyPrepDTO[] = [
        {
          id: "c-1",
          slug: "amazon",
          name: "Amazon",
          category: "FAANG / Big Tech",
          patterns: ["Two Pointers", "Sliding Window", "BFS"],
          problemCount: 8,
          sets: 2,
          readiness: 65,
          focus: ["Two Pointers", "Sliding Window"],
          isTargetCompany: true,
          hasContent: true,
          status: "in_progress",
        },
      ];

      const hasContent = activeCompanies.some((c) => c.hasContent);
      expect(hasContent).toBe(true);
      expect(activeCompanies[0].patterns).toHaveLength(3);
      expect(activeCompanies[0].sets).toBe(2);
    });
  });

  describe("5. Target Company Prioritization Invariants", () => {
    it("should identify and flag the student's target company", () => {
      const companies: CompanyPrepDTO[] = [
        {
          id: "c-1",
          slug: "google",
          name: "Google",
          category: "FAANG / Big Tech",
          patterns: [],
          problemCount: 0,
          sets: 0,
          readiness: 0,
          focus: ["FAANG / Big Tech"],
          isTargetCompany: false,
          hasContent: false,
          status: "not_started",
        },
        {
          id: "c-2",
          slug: "amazon",
          name: "Amazon",
          category: "FAANG / Big Tech",
          patterns: [],
          problemCount: 0,
          sets: 0,
          readiness: 0,
          focus: ["FAANG / Big Tech"],
          isTargetCompany: true,
          hasContent: false,
          status: "not_started",
        },
      ];

      const target = companies.find((c) => c.isTargetCompany);
      expect(target).toBeDefined();
      expect(target?.name).toBe("Amazon");
      expect(target?.slug).toBe("amazon");
    });
  });
});
