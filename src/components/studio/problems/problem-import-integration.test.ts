import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Problem AI Import & Auto-Populate Integration", () => {
  const problemsDir = path.resolve(process.cwd(), "src/components/studio/problems");
  const apiRoutePath = path.resolve(
    process.cwd(),
    "src/app/api/studio/problems/validate-import/route.ts"
  );

  describe("Problem Editor AI Import Integration", () => {
    it("wires ProblemImportModal into problem-editor.tsx with prominent AI Import button", () => {
      const editorContent = fs.readFileSync(
        path.join(problemsDir, "problem-editor.tsx"),
        "utf-8"
      );

      // Verify import
      expect(editorContent).toContain('import { ProblemImportModal, ProblemImportData } from "./problem-import-modal"');
      // Verify modal state
      expect(editorContent).toContain("showImportModal");
      expect(editorContent).toContain("setShowImportModal");
      // Verify action button in PageHeader
      expect(editorContent).toContain("AI Import");
      expect(editorContent).toContain("setShowImportModal(true)");
      // Verify modal mounting
      expect(editorContent).toContain("<ProblemImportModal");
      expect(editorContent).toContain("isOpen={showImportModal}");
      expect(editorContent).toContain("onImport={handleImport}");
      // Verify import confirmation notice
      expect(editorContent).toContain("importNotice");
    });

    it("implements handleImport populating all problem fields without destroying form state", () => {
      const editorContent = fs.readFileSync(
        path.join(problemsDir, "problem-editor.tsx"),
        "utf-8"
      );

      expect(editorContent).toContain("function handleImport(data: ProblemImportData)");
      expect(editorContent).toContain("title: data.title || prev.title");
      expect(editorContent).toContain("slug: data.slug || prev.slug");
      expect(editorContent).toContain("summary: data.summary || prev.summary");
      expect(editorContent).toContain("source: data.source || prev.source");
      expect(editorContent).toContain("sourceUrl: data.sourceUrl || prev.sourceUrl");
      expect(editorContent).toContain("externalId: data.externalId ?? prev.externalId");
      expect(editorContent).toContain("topicIds: data.topicIds.length > 0 ? data.topicIds : prev.topicIds");
      expect(editorContent).toContain("patternIds: data.patternIds.length > 0 ? data.patternIds : prev.patternIds");
      expect(editorContent).toContain("difficulty: data.difficulty || prev.difficulty");
      expect(editorContent).toContain("estimatedMinutes: typeof data.estimatedMinutes === \"number\" ? data.estimatedMinutes : prev.estimatedMinutes");
      expect(editorContent).toContain("qualityScore: typeof data.qualityScore === \"number\" ? data.qualityScore : prev.qualityScore");
      expect(editorContent).toContain("thinkingDirection: typeof data.thinkingDirection === \"string\" ? data.thinkingDirection : prev.thinkingDirection");
      expect(editorContent).toContain("dryRunPrompt: typeof data.dryRunPrompt === \"string\" ? data.dryRunPrompt : prev.dryRunPrompt");
      expect(editorContent).toContain("hints: Array.isArray(data.hints) ? data.hints : prev.hints");
      expect(editorContent).toContain("commonMistakes: Array.isArray(data.commonMistakes) ? data.commonMistakes : prev.commonMistakes");
      expect(editorContent).toContain("tags: Array.isArray(data.tags) ? data.tags : prev.tags");
      expect(editorContent).toContain("isPublished: typeof data.isPublished === \"boolean\" ? data.isPublished : prev.isPublished");
    });
  });

  describe("Problem Import Modal Architecture & UX", () => {
    it("provides the complete 4-step workflow modeled after Mission/Topic/Pattern Importer", () => {
      const modalContent = fs.readFileSync(
        path.join(problemsDir, "problem-import-modal.tsx"),
        "utf-8"
      );

      // Step 1: Copy AI Prompt
      expect(modalContent).toContain("Step 1: Copy Customized AI Prompt");
      expect(modalContent).toContain("Copy AI Prompt");
      expect(modalContent).toContain("handleCopyPrompt");

      // Step 2: Paste JSON
      expect(modalContent).toContain("Step 2: Paste AI-Generated JSON");
      expect(modalContent).toContain("handleJsonChange");

      // Step 3: Intelligence Validation
      expect(modalContent).toContain("Step 3: Preview & Intelligence Validation");
      expect(modalContent).toContain("validationResult");
      expect(modalContent).toContain("DSA Club Intelligence: Ready to Import");
      expect(modalContent).toContain("DSA Club Intelligence: Warnings detected");
      expect(modalContent).toContain("DSA Club Intelligence: Fatal validation errors");

      // Step 4: Apply & Populate
      expect(modalContent).toContain("Apply & Populate Problem");
      expect(modalContent).toContain("handleApply");
    });

    it("includes rich problem presets for instant blueprint loading", () => {
      const modalContent = fs.readFileSync(
        path.join(problemsDir, "problem-import-modal.tsx"),
        "utf-8"
      );

      expect(modalContent).toContain("PROBLEM_PRESETS");
      expect(modalContent).toContain("Two Sum");
      expect(modalContent).toContain("Longest Substring Without Repeating Characters");
      expect(modalContent).toContain("Trapping Rain Water");
      expect(modalContent).toContain("Coin Change");
      expect(modalContent).toContain("handleLoadPreset");
    });

    it("provides JSON export for backup and portability", () => {
      const modalContent = fs.readFileSync(
        path.join(problemsDir, "problem-import-modal.tsx"),
        "utf-8"
      );

      expect(modalContent).toContain("Export Current Problem");
      expect(modalContent).toContain("handleCopyExport");
      expect(modalContent).toContain("Copied JSON to Clipboard!");
    });
  });

  describe("Validate Import API Endpoint", () => {
    it("ensures POST /api/studio/problems/validate-import exists and invokes validation service", () => {
      expect(fs.existsSync(apiRoutePath)).toBe(true);

      const routeContent = fs.readFileSync(apiRoutePath, "utf-8");
      expect(routeContent).toContain("requireAdmin()");
      expect(routeContent).toContain("connectToDatabase()");
      expect(routeContent).toContain("validateProblemImport({");
    });
  });
});
