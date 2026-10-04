"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Sparkles, X } from "lucide-react";
import {
  PageHeader,
  ActionButton,
  FieldGroup,
  StudioLabel,
  StudioInput,
  StudioTextarea,
  StudioSelect,
  StudioCard,
  StudioCardContent,
  FieldError,
} from "@/components/studio/ui";
import { TopicImportModal, TopicImportData } from "./topic-import-modal";

type TopicForm = {
  slug: string;
  name: string;
  description: string;
  order: number;
  difficulty: "beginner" | "easy" | "medium" | "hard" | "advanced";
  estimatedMinutes: number;
  isPublished: boolean;
};

type TopicEditorProps = {
  topicId?: string; // if provided → edit mode
};

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const defaultForm: TopicForm = {
  slug: "",
  name: "",
  description: "",
  order: 0,
  difficulty: "beginner",
  estimatedMinutes: 60,
  isPublished: false,
};

export default function TopicEditor({ topicId }: TopicEditorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromId = searchParams.get("from");

  const [form, setForm] = useState<TopicForm>(defaultForm);
  const [errors, setErrors] = useState<Partial<Record<keyof TopicForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(topicId));
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [autoSlug, setAutoSlug] = useState(!topicId);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isEdit = Boolean(topicId);

  // Load existing topic (edit mode or duplicate)
  useEffect(() => {
    const idToLoad = topicId ?? fromId;
    if (!idToLoad) { setLoading(false); return; }
    setLoading(true);
    fetch(`/api/studio/topics/${idToLoad}`)
      .then((r) => r.json())
      .then((data: { topic: TopicForm & { id: string } }) => {
        const t = data.topic;
        setForm({
          slug: fromId ? "" : t.slug,
          name: fromId ? `${t.name} (Copy)` : t.name,
          description: t.description,
          order: t.order,
          difficulty: t.difficulty,
          estimatedMinutes: t.estimatedMinutes,
          isPublished: fromId ? false : t.isPublished,
        });
        if (fromId) setAutoSlug(true);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [topicId, fromId]);

  // Auto-save in edit mode
  useEffect(() => {
    if (!isEdit || loading || saving) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      void save(true);
    }, 2000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function set<K extends keyof TopicForm>(key: K, value: TopicForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && autoSlug) {
        next.slug = slugify(value as string);
      }
      return next;
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate(): boolean {
    const errs: typeof errors = {};
    if (!form.slug) errs.slug = "Slug is required";
    else if (!/^[a-z0-9-]+$/.test(form.slug)) errs.slug = "Slug must be lowercase alphanumeric with hyphens";
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.description.trim()) errs.description = "Description is required";
    if (form.estimatedMinutes < 5) errs.estimatedMinutes = "Minimum 5 minutes";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function save(silent = false) {
    if (!silent && !validate()) return;
    setSaving(true);
    try {
      const url = isEdit ? `/api/studio/topics/${topicId}` : "/api/studio/topics";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json() as { error?: string };
        if (!silent) setErrors({ slug: data.error });
        setSaveStatus("error");
        return;
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      if (!isEdit) {
        const created = await res.json() as { topic: { id: string } };
        router.push(`/studio/topics/${created.topic.id}`);
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
    }
  }

  function handleImport(data: TopicImportData) {
    setForm((prev) => ({
      ...prev,
      name: data.name || prev.name,
      slug: data.slug || prev.slug,
      description: data.description || prev.description,
      difficulty: data.difficulty || prev.difficulty,
      order: typeof data.order === "number" ? data.order : prev.order,
      estimatedMinutes: typeof data.estimatedMinutes === "number" ? data.estimatedMinutes : prev.estimatedMinutes,
      isPublished: typeof data.isPublished === "boolean" ? data.isPublished : prev.isPublished,
    }));
    setAutoSlug(false);
    setErrors({});
    setImportNotice(`Topic populated from AI specification ("${data.name}"). Click 'Save' to persist.`);
    setTimeout(() => setImportNotice(null), 8000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? "Edit Topic" : "New Topic"}
        description={isEdit ? "Make changes and they auto-save after 2 seconds of inactivity." : "Create a new DSA topic that students can explore."}
        actions={
          <div className="flex items-center gap-2">
            {/* Auto-save indicator */}
            {isEdit && saveStatus !== "idle" && (
              <span className={`flex items-center gap-1.5 text-xs ${saveStatus === "saved" ? "text-green-500" : "text-destructive"}`}>
                {saveStatus === "saved" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {saveStatus === "saved" ? "Saved" : "Error"}
              </span>
            )}
            <Link href="/studio/topics">
              <ActionButton variant="outline">
                <ArrowLeft size={14} />
                Back
              </ActionButton>
            </Link>
            <ActionButton
              variant="outline"
              onClick={() => setShowImportModal(true)}
              title="AI Import & auto-populate from external JSON"
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/15"
            >
              <Sparkles size={14} className="text-purple-400" />
              AI Import
            </ActionButton>
            <ActionButton
              onClick={() => set("isPublished", !form.isPublished)}
              variant="outline"
            >
              {form.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
              {form.isPublished ? "Unpublish" : "Publish"}
            </ActionButton>
            <ActionButton onClick={() => save()} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Save
            </ActionButton>
          </div>
        }
      />

      {importNotice && (
        <div className="flex items-center justify-between rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-xs text-purple-200">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-purple-400 shrink-0" />
            <span>{importNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setImportNotice(null)}
            className="text-purple-300/60 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-6">
          <StudioCard>
            <StudioCardContent className="space-y-5">
              <FieldGroup>
                <StudioLabel htmlFor="topic-name" required>Name</StudioLabel>
                <StudioInput
                  id="topic-name"
                  placeholder="e.g. Arrays & Strings"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                />
                <FieldError message={errors.name} />
              </FieldGroup>

              <FieldGroup>
                <StudioLabel htmlFor="topic-slug" required>
                  Slug
                  <button
                    type="button"
                    className="ml-2 text-[10px] text-primary hover:underline"
                    onClick={() => { setAutoSlug((v) => !v); }}
                  >
                    {autoSlug ? "(auto)" : "(manual — click to reset)"}
                  </button>
                </StudioLabel>
                <StudioInput
                  id="topic-slug"
                  placeholder="arrays-strings"
                  value={form.slug}
                  onChange={(e) => { setAutoSlug(false); set("slug", e.target.value); }}
                  className="font-mono text-xs"
                />
                <FieldError message={errors.slug} />
              </FieldGroup>

              <FieldGroup>
                <StudioLabel htmlFor="topic-description" required>Description</StudioLabel>
                <StudioTextarea
                  id="topic-description"
                  placeholder="Describe what students will learn in this topic..."
                  rows={4}
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                />
                <p className="text-xs text-muted-foreground text-right">{form.description.length}/1000</p>
                <FieldError message={errors.description} />
              </FieldGroup>
            </StudioCardContent>
          </StudioCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <StudioCard>
            <StudioCardContent className="space-y-5">
              <h3 className="text-sm font-semibold text-foreground">Properties</h3>

              <FieldGroup>
                <StudioLabel htmlFor="topic-difficulty">Difficulty</StudioLabel>
                <StudioSelect
                  id="topic-difficulty"
                  value={form.difficulty}
                  onChange={(e) => set("difficulty", e.target.value as TopicForm["difficulty"])}
                >
                  {["beginner", "easy", "medium", "hard", "advanced"].map((d) => (
                    <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                  ))}
                </StudioSelect>
              </FieldGroup>

              <FieldGroup>
                <StudioLabel htmlFor="topic-order">Display Order</StudioLabel>
                <StudioInput
                  id="topic-order"
                  type="number"
                  min={0}
                  value={form.order}
                  onChange={(e) => set("order", parseInt(e.target.value) || 0)}
                />
              </FieldGroup>

              <FieldGroup>
                <StudioLabel htmlFor="topic-minutes">Estimated Minutes</StudioLabel>
                <StudioInput
                  id="topic-minutes"
                  type="number"
                  min={5}
                  max={10000}
                  value={form.estimatedMinutes}
                  onChange={(e) => set("estimatedMinutes", parseInt(e.target.value) || 60)}
                />
                <FieldError message={errors.estimatedMinutes} />
              </FieldGroup>

              <div className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Published</span>
                  <button
                    role="switch"
                    aria-checked={form.isPublished}
                    onClick={() => set("isPublished", !form.isPublished)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-ring ${form.isPublished ? "bg-primary" : "bg-muted"}`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.isPublished ? "translate-x-4" : "translate-x-0.5"}`}
                    />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  {form.isPublished ? "Visible to students" : "Hidden from students"}
                </p>
              </div>
            </StudioCardContent>
          </StudioCard>

          {/* Timestamps in edit mode */}
          {isEdit && (
            <StudioCard>
              <StudioCardContent>
                <p className="text-xs text-muted-foreground">
                  Auto-save is enabled. Changes are saved automatically 2 seconds after you stop typing.
                </p>
              </StudioCardContent>
            </StudioCard>
          )}
        </div>
      </div>

      <TopicImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        currentForm={form}
        currentTopicId={topicId}
      />
    </div>
  );
}
