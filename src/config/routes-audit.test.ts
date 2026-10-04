import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { NAVIGATION_CONFIG } from "./navigation.config";

describe("DSA Club Complete Route Integrity & Mapping Audit", () => {
  const appDir = path.resolve(process.cwd(), "src/app/(product)");

  it("verifies every top-level navigation item maps to an existing Next.js page file", () => {
    for (const group of NAVIGATION_CONFIG) {
      for (const item of group.items) {
        // Strip leading slash
        const relativeRoute = item.href.replace(/^\//, "");
        const pagePath = path.join(appDir, relativeRoute, "page.tsx");
        expect(
          fs.existsSync(pagePath),
          `Missing page for navigation item ${item.label} at ${item.href} (expected ${pagePath})`
        ).toBe(true);

        if (item.children) {
          for (const child of item.children) {
            const childRoute = child.href.replace(/^\//, "");
            const childPagePath = path.join(appDir, childRoute, "page.tsx");
            expect(
              fs.existsSync(childPagePath),
              `Missing page for child navigation item ${child.label} at ${child.href} (expected ${childPagePath})`
            ).toBe(true);
          }
        }
      }
    }
  });

  describe("Dedicated Workspace & Lens Pages", () => {
    it("ensures /learn/topics page exists and provides catalog view", () => {
      const topicsPage = path.join(appDir, "learn/topics/page.tsx");
      expect(fs.existsSync(topicsPage)).toBe(true);
      const content = fs.readFileSync(topicsPage, "utf-8");
      expect(content).toContain("TopicsCatalogView");
      expect(content).toContain("getCachedLearnData");
    });

    it("ensures /learn/paths page exists and provides direct paths catalog", () => {
      const pathsPage = path.join(appDir, "learn/paths/page.tsx");
      expect(fs.existsSync(pathsPage)).toBe(true);
      const content = fs.readFileSync(pathsPage, "utf-8");
      expect(content).toContain("LearningPathsListView");
      expect(content).toContain("getCachedLearningPathsData");
    });

    it("ensures /learn/paths/[slug] redirects to canonical /learning-paths/[slug]", () => {
      const pathSlugPage = path.join(appDir, "learn/paths/[slug]/page.tsx");
      expect(fs.existsSync(pathSlugPage)).toBe(true);
      const content = fs.readFileSync(pathSlugPage, "utf-8");
      expect(content).toContain("redirect(`/learning-paths/${slug}`)");
    });

    it("ensures legacy /learn/[slug] redirects to /learn/topics/[slug]", () => {
      const legacyTopicSlugPage = path.join(appDir, "learn/[slug]/page.tsx");
      expect(fs.existsSync(legacyTopicSlugPage)).toBe(true);
      const content = fs.readFileSync(legacyTopicSlugPage, "utf-8");
      expect(content).toContain("redirect(`/learn/topics/${slug}`)");
    });

    it("ensures /practice/problems redirects gracefully to /practice preserving query params", () => {
      const practiceProblemsPage = path.join(appDir, "practice/problems/page.tsx");
      expect(fs.existsSync(practiceProblemsPage)).toBe(true);
      const content = fs.readFileSync(practiceProblemsPage, "utf-8");
      expect(content).toContain('redirect(queryString ? `/practice?${queryString}` : "/practice")');
    });

    it("ensures /review redirects gracefully to /revision preserving query params", () => {
      const reviewPage = path.join(appDir, "review/page.tsx");
      expect(fs.existsSync(reviewPage)).toBe(true);
      const content = fs.readFileSync(reviewPage, "utf-8");
      expect(content).toContain('redirect(queryString ? `/revision?${queryString}` : "/revision")');
    });

    it("ensures /plan redirects gracefully to /intelligence preserving query params", () => {
      const planPage = path.join(appDir, "plan/page.tsx");
      expect(fs.existsSync(planPage)).toBe(true);
      const content = fs.readFileSync(planPage, "utf-8");
      expect(content).toContain('redirect(queryString ? `/intelligence?${queryString}` : "/intelligence")');
    });

    it("ensures /learn/missions redirects gracefully to /missions", () => {
      const learnMissionsPage = path.join(appDir, "learn/missions/page.tsx");
      expect(fs.existsSync(learnMissionsPage)).toBe(true);
      const content = fs.readFileSync(learnMissionsPage, "utf-8");
      expect(content).toContain('redirect("/missions")');
    });
  });

  describe("Middleware & Intelligence Target URL Alignment", () => {
    it("ensures middleware protects intelligence, plan, and review routes", () => {
      const middlewarePath = path.resolve(process.cwd(), "src/middleware.ts");
      const content = fs.readFileSync(middlewarePath, "utf-8");
      expect(content).toContain('"/intelligence"');
      expect(content).toContain('"/plan"');
      expect(content).toContain('"/review"');
    });

    it("ensures plan-content-resolver generates valid /learn/topics/[slug] targetUrls", () => {
      const resolverPath = path.resolve(
        process.cwd(),
        "src/features/intelligence/services/plan-content-resolver.ts"
      );
      const content = fs.readFileSync(resolverPath, "utf-8");
      expect(content).toContain("`/learn/topics/${topicSlug}`");
      // Must not produce un-namespaced /learn/${topicSlug}
      expect(content).not.toMatch(/targetUrl:\s*`\/learn\/\$\{topicSlug\}`/);
    });

    it("ensures task-candidate-builder generates valid /learn/topics/[slug] targetUrls", () => {
      const builderPath = path.resolve(
        process.cwd(),
        "src/features/intelligence/decisions/task-candidate-builder.ts"
      );
      const content = fs.readFileSync(builderPath, "utf-8");
      expect(content).toContain("`/learn/topics/${task.topicSlug || currentDay.topicSlug}`");
    });
  });
});
