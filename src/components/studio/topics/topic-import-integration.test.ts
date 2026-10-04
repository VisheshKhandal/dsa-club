import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Topic AI Import & Auto-Populate Integration", () => {
  const topicsDir = path.resolve(process.cwd(), "src/components/studio/topics");
  const apiRoutePath = path.resolve(
    process.cwd(),
    "src/app/api/studio/topics/validate-import/route.ts"
  );

  describe("Topic Editor AI Import Integration", () => {
    it("wires TopicImportModal into topic-editor.tsx with prominent AI Import button", () => {
      const editorContent = fs.readFileSync(
        path.join(topicsDir, "topic-editor.tsx"),
        "utf-8"
      );

      // Verify import
      expect(editorContent).toContain('import { TopicImportModal, TopicImportData } from "./topic-import-modal"');
      // Verify modal state
      expect(editorContent).toContain("showImportModal");
      expect(editorContent).toContain("setShowImportModal");
      // Verify action button in PageHeader
      expect(editorContent).toContain("AI Import");
      expect(editorContent).toContain("setShowImportModal(true)");
      // Verify modal mounting
      expect(editorContent).toContain("<TopicImportModal");
      expect(editorContent).toContain("isOpen={showImportModal}");
      expect(editorContent).toContain("onImport={handleImport}");
      // Verify import confirmation notice
      expect(editorContent).toContain("importNotice");
    });

    it("implements handleImport populating all topic fields without destroying form state", () => {
      const editorContent = fs.readFileSync(
        path.join(topicsDir, "topic-editor.tsx"),
        "utf-8"
      );

      expect(editorContent).toContain("function handleImport(data: TopicImportData)");
      expect(editorContent).toContain("name: data.name || prev.name");
      expect(editorContent).toContain("slug: data.slug || prev.slug");
      expect(editorContent).toContain("description: data.description || prev.description");
      expect(editorContent).toContain("difficulty: data.difficulty || prev.difficulty");
      expect(editorContent).toContain("order: typeof data.order === \"number\" ? data.order : prev.order");
      expect(editorContent).toContain("estimatedMinutes: typeof data.estimatedMinutes === \"number\" ? data.estimatedMinutes : prev.estimatedMinutes");
      expect(editorContent).toContain("isPublished: typeof data.isPublished === \"boolean\" ? data.isPublished : prev.isPublished");
    });
  });

  describe("Topic Import Modal Architecture & UX", () => {
    it("provides the complete 4-step workflow modeled after Mission Importer", () => {
      const modalContent = fs.readFileSync(
        path.join(topicsDir, "topic-import-modal.tsx"),
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
      expect(modalContent).toContain("Apply & Populate Topic");
      expect(modalContent).toContain("handleApply");
    });

    it("includes rich curriculum presets for instant blueprint loading", () => {
      const modalContent = fs.readFileSync(
        path.join(topicsDir, "topic-import-modal.tsx"),
        "utf-8"
      );

      expect(modalContent).toContain("TOPIC_PRESETS");
      expect(modalContent).toContain("Dynamic Programming");
      expect(modalContent).toContain("Graph Algorithms & Traversal");
      expect(modalContent).toContain("Sliding Window & Two Pointers");
      expect(modalContent).toContain("Binary Trees & BSTs");
      expect(modalContent).toContain("handleLoadPreset");
    });

    it("provides JSON export for backup and portability", () => {
      const modalContent = fs.readFileSync(
        path.join(topicsDir, "topic-import-modal.tsx"),
        "utf-8"
      );

      expect(modalContent).toContain("Export Current Topic");
      expect(modalContent).toContain("handleCopyExport");
      expect(modalContent).toContain("Copied JSON to Clipboard!");
    });
  });

  describe("Validate Import API Endpoint", () => {
    it("ensures POST /api/studio/topics/validate-import exists and invokes validation service", () => {
      expect(fs.existsSync(apiRoutePath)).toBe(true);

      const routeContent = fs.readFileSync(apiRoutePath, "utf-8");
      expect(routeContent).toContain("requireAdmin()");
      expect(routeContent).toContain("connectToDatabase()");
      expect(routeContent).toContain("validateTopicImport({");
    });
  });
});
