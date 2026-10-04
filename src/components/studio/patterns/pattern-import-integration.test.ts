import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Pattern AI Import & Auto-Populate Integration", () => {
  const patternsDir = path.resolve(process.cwd(), "src/components/studio/patterns");
  const apiRoutePath = path.resolve(
    process.cwd(),
    "src/app/api/studio/patterns/validate-import/route.ts"
  );

  describe("Pattern Editor AI Import Integration", () => {
    it("wires PatternImportModal into pattern-editor.tsx with prominent AI Import button", () => {
      const editorContent = fs.readFileSync(
        path.join(patternsDir, "pattern-editor.tsx"),
        "utf-8"
      );

      // Verify import
      expect(editorContent).toContain('import { PatternImportModal, PatternImportData } from "./pattern-import-modal"');
      // Verify modal state
      expect(editorContent).toContain("showImportModal");
      expect(editorContent).toContain("setShowImportModal");
      // Verify action button in PageHeader
      expect(editorContent).toContain("AI Import");
      expect(editorContent).toContain("setShowImportModal(true)");
      // Verify modal mounting
      expect(editorContent).toContain("<PatternImportModal");
      expect(editorContent).toContain("isOpen={showImportModal}");
      expect(editorContent).toContain("onImport={handleImport}");
      // Verify import confirmation notice
      expect(editorContent).toContain("importNotice");
    });

    it("implements handleImport populating all pattern fields without destroying form state", () => {
      const editorContent = fs.readFileSync(
        path.join(patternsDir, "pattern-editor.tsx"),
        "utf-8"
      );

      expect(editorContent).toContain("function handleImport(data: PatternImportData)");
      expect(editorContent).toContain("name: data.name || prev.name");
      expect(editorContent).toContain("slug: data.slug || prev.slug");
      expect(editorContent).toContain("topicId: data.topicId || prev.topicId");
      expect(editorContent).toContain("description: data.description || prev.description");
      expect(editorContent).toContain("whenToUse: typeof data.whenToUse === \"string\" ? data.whenToUse : prev.whenToUse");
      expect(editorContent).toContain("mentalModel: typeof data.mentalModel === \"string\" ? data.mentalModel : prev.mentalModel");
      expect(editorContent).toContain("variations: Array.isArray(data.variations) ? data.variations : prev.variations");
      expect(editorContent).toContain("signalKeywords: Array.isArray(data.signalKeywords) ? data.signalKeywords : prev.signalKeywords");
      expect(editorContent).toContain("prerequisitePatternIds: Array.isArray(data.prerequisitePatternIds) ? data.prerequisitePatternIds : prev.prerequisitePatternIds");
      expect(editorContent).toContain("difficulty: data.difficulty || prev.difficulty");
      expect(editorContent).toContain("isPublished: typeof data.isPublished === \"boolean\" ? data.isPublished : prev.isPublished");
    });
  });

  describe("Pattern Import Modal Architecture & UX", () => {
    it("provides the complete 4-step workflow modeled after Mission/Topic Importer", () => {
      const modalContent = fs.readFileSync(
        path.join(patternsDir, "pattern-import-modal.tsx"),
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
      expect(modalContent).toContain("Apply & Populate Pattern");
      expect(modalContent).toContain("handleApply");
    });

    it("includes rich pattern presets for instant blueprint loading", () => {
      const modalContent = fs.readFileSync(
        path.join(patternsDir, "pattern-import-modal.tsx"),
        "utf-8"
      );

      expect(modalContent).toContain("PATTERN_PRESETS");
      expect(modalContent).toContain("Sliding Window");
      expect(modalContent).toContain("Two Pointers");
      expect(modalContent).toContain("Monotonic Stack");
      expect(modalContent).toContain("Fast & Slow Pointers");
      expect(modalContent).toContain("handleLoadPreset");
    });

    it("provides JSON export for backup and portability", () => {
      const modalContent = fs.readFileSync(
        path.join(patternsDir, "pattern-import-modal.tsx"),
        "utf-8"
      );

      expect(modalContent).toContain("Export Current Pattern");
      expect(modalContent).toContain("handleCopyExport");
      expect(modalContent).toContain("Copied JSON to Clipboard!");
    });
  });

  describe("Validate Import API Endpoint", () => {
    it("ensures POST /api/studio/patterns/validate-import exists and invokes validation service", () => {
      expect(fs.existsSync(apiRoutePath)).toBe(true);

      const routeContent = fs.readFileSync(apiRoutePath, "utf-8");
      expect(routeContent).toContain("requireAdmin()");
      expect(routeContent).toContain("connectToDatabase()");
      expect(routeContent).toContain("validatePatternImport({");
    });
  });
});
