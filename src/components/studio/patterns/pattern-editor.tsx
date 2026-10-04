"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, X, Sparkles } from "lucide-react";
import {
  PageHeader, ActionButton, FieldGroup, StudioLabel, StudioInput,
  StudioTextarea, StudioSelect, StudioCard, StudioCardContent, FieldError,
} from "@/components/studio/ui";
import { PatternImportModal, PatternImportData } from "./pattern-import-modal";

type PatternForm = {
  slug: string;
  name: string;
  topicId: string;
  description: string;
  whenToUse: string;
  mentalModel: string;
  variations: string[];
  signalKeywords: string[];
  prerequisitePatternIds: string[];
  difficulty: "beginner" | "easy" | "medium" | "hard" | "advanced";
  isPublished: boolean;
};

const defaultForm: PatternForm = {
  slug: "", name: "", topicId: "", description: "", whenToUse: "", mentalModel: "", variations: [], signalKeywords: [],
  prerequisitePatternIds: [], difficulty: "medium", isPublished: false,
};

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export default function PatternEditor({ patternId }: { patternId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<PatternForm>(defaultForm);
  const [errors, setErrors] = useState<Partial<Record<keyof PatternForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(patternId));
  const [topics, setTopics] = useState<{ id: string; name: string }[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [autoSlug, setAutoSlug] = useState(!patternId);
  const [keywordInput, setKeywordInput] = useState("");
  const [variationInput, setVariationInput] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEdit = Boolean(patternId);

  useEffect(() => {
    // Load topics for dropdown
    fetch("/api/studio/topics?limit=100")
      .then(res => res.json())
      .then(data => setTopics(data.topics || []))
      .catch(() => {});
      
    if (!patternId) { setLoading(false); return; }
    fetch(`/api/studio/patterns/${patternId}`)
      .then((r) => r.json())
      .then((d: { pattern: PatternForm & { id: string } }) => {
        setForm({
          slug: d.pattern.slug, name: d.pattern.name, topicId: d.pattern.topicId,
          description: d.pattern.description,
          whenToUse: d.pattern.whenToUse ?? "",
          mentalModel: d.pattern.mentalModel ?? "",
          variations: d.pattern.variations ?? [],
          signalKeywords: d.pattern.signalKeywords ?? [],
          prerequisitePatternIds: d.pattern.prerequisitePatternIds ?? [],
          difficulty: d.pattern.difficulty, isPublished: d.pattern.isPublished,
        });
        setAutoSlug(false);
      }).catch(() => {}).finally(() => setLoading(false));
  }, [patternId]);

  useEffect(() => {
    if (!isEdit || loading || saving) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { void save(true); }, 2500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function set<K extends keyof PatternForm>(key: K, value: PatternForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "name" && autoSlug) next.slug = slugify(value as string);
      return next;
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const errs: typeof errors = {};
    if (!form.slug) errs.slug = "Slug is required";
    if (!form.name.trim()) errs.name = "Name is required";
    if (!form.topicId) errs.topicId = "Topic is required";
    if (!form.description.trim()) errs.description = "Description is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function save(silent = false) {
    if (!silent && !validate()) return;
    setSaving(true);
    try {
      const url = isEdit ? `/api/studio/patterns/${patternId}` : "/api/studio/patterns";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        if (!silent) setErrors({ slug: d.error });
        setSaveStatus("error"); return;
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      if (!isEdit) {
        const created = await res.json() as { pattern: { id: string } };
        router.push(`/studio/patterns/${created.pattern.id}`);
      }
    } catch { setSaveStatus("error"); }
    finally { setSaving(false); }
  }

  function addKeyword(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const kw = keywordInput.trim().toLowerCase();
      if (kw && !form.signalKeywords.includes(kw)) set("signalKeywords", [...form.signalKeywords, kw]);
      setKeywordInput("");
    }
  }

  function addVariation(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const v = variationInput.trim();
      if (v && !form.variations.includes(v)) set("variations", [...form.variations, v]);
      setVariationInput("");
    }
  }

  function handleImport(data: PatternImportData) {
    setForm((prev) => ({
      ...prev,
      name: data.name || prev.name,
      slug: data.slug || prev.slug,
      topicId: data.topicId || prev.topicId,
      description: data.description || prev.description,
      whenToUse: typeof data.whenToUse === "string" ? data.whenToUse : prev.whenToUse,
      mentalModel: typeof data.mentalModel === "string" ? data.mentalModel : prev.mentalModel,
      variations: Array.isArray(data.variations) ? data.variations : prev.variations,
      signalKeywords: Array.isArray(data.signalKeywords) ? data.signalKeywords : prev.signalKeywords,
      prerequisitePatternIds: Array.isArray(data.prerequisitePatternIds) ? data.prerequisitePatternIds : prev.prerequisitePatternIds,
      difficulty: data.difficulty || prev.difficulty,
      isPublished: typeof data.isPublished === "boolean" ? data.isPublished : prev.isPublished,
    }));
    setAutoSlug(false);
    setErrors({});
    setImportNotice(`Pattern populated from AI specification ("${data.name}"). Click 'Save' to persist.`);
    setTimeout(() => setImportNotice(null), 8000);
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? "Edit Pattern" : "New Pattern"}
        description={isEdit ? "Changes auto-save after 2.5 seconds." : "Add a new algorithm pattern for students to learn."}
        actions={
          <div className="flex items-center gap-2">
            {isEdit && saveStatus !== "idle" && (
              <span className={`flex items-center gap-1.5 text-xs ${saveStatus === "saved" ? "text-green-500" : "text-destructive"}`}>
                {saveStatus === "saved" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {saveStatus === "saved" ? "Saved" : "Error"}
              </span>
            )}
            <Link href="/studio/patterns"><ActionButton variant="outline"><ArrowLeft size={14} />Back</ActionButton></Link>
            <ActionButton
              variant="outline"
              onClick={() => setShowImportModal(true)}
              title="AI Import & auto-populate from external JSON"
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/15"
            >
              <Sparkles size={14} className="text-purple-400" />
              AI Import
            </ActionButton>
            <ActionButton variant="outline" onClick={() => set("isPublished", !form.isPublished)}>
              {form.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
              {form.isPublished ? "Unpublish" : "Publish"}
            </ActionButton>
            <ActionButton onClick={() => save()} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}Save
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
        <div className="lg:col-span-2 space-y-5">
          <StudioCard>
            <StudioCardContent className="space-y-5">
              <FieldGroup>
                <StudioLabel htmlFor="pat-name" required>Name</StudioLabel>
                <StudioInput id="pat-name" placeholder="Two Pointers" value={form.name} onChange={(e) => set("name", e.target.value)} />
                <FieldError message={errors.name} />
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="pat-slug" required>Slug</StudioLabel>
                <StudioInput id="pat-slug" className="font-mono text-xs" placeholder="two-pointers"
                  value={form.slug} onChange={(e) => { setAutoSlug(false); set("slug", e.target.value); }} />
                <FieldError message={errors.slug} />
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="pat-desc" required>Description</StudioLabel>
                <StudioTextarea id="pat-desc" rows={3} value={form.description}
                  placeholder="High-level description of what the pattern is..."
                  onChange={(e) => set("description", e.target.value)} />
                <p className="text-xs text-muted-foreground text-right">{form.description.length}/2000</p>
                <FieldError message={errors.description} />
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="pat-when">When to Use</StudioLabel>
                <StudioTextarea id="pat-when" rows={4} value={form.whenToUse}
                  placeholder="Explain when and why to use this pattern..."
                  onChange={(e) => set("whenToUse", e.target.value)} />
                <p className="text-xs text-muted-foreground text-right">{form.whenToUse.length}/2000</p>
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="pat-mental">Mental Model</StudioLabel>
                <StudioTextarea id="pat-mental" rows={4} value={form.mentalModel}
                  placeholder="Provide a thinking framework or visualization..."
                  onChange={(e) => set("mentalModel", e.target.value)} />
                <p className="text-xs text-muted-foreground text-right">{form.mentalModel.length}/2000</p>
              </FieldGroup>
            </StudioCardContent>
          </StudioCard>

          <StudioCard>
            <StudioCardContent className="space-y-4">
              <h3 className="text-sm font-semibold">Common Variations</h3>
              <p className="text-xs text-muted-foreground">List common variations of this pattern (e.g. &quot;Opposite directional pointers&quot;).</p>
              <FieldGroup>
                <StudioInput placeholder="Type variation and press Enter" value={variationInput}
                  onChange={(e) => setVariationInput(e.target.value)} onKeyDown={addVariation} />
              </FieldGroup>
              {form.variations.length > 0 && (
                <ul className="space-y-2">
                  {form.variations.map((v, i) => (
                    <li key={i} className="flex items-center gap-2 rounded-md bg-muted px-3 py-2 text-sm text-foreground">
                      <span className="flex-1">{v}</span>
                      <button onClick={() => set("variations", form.variations.filter(k => k !== v))} className="text-muted-foreground hover:text-destructive">
                        <X size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </StudioCardContent>
          </StudioCard>

          <StudioCard>
            <StudioCardContent className="space-y-4">
              <h3 className="text-sm font-semibold">Signal Keywords</h3>
              <p className="text-xs text-muted-foreground">Keywords that hint a problem might use this pattern (e.g. &quot;sorted array&quot;, &quot;find a pair&quot;).</p>
              <FieldGroup>
                <StudioInput placeholder="Type keyword and press Enter" value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)} onKeyDown={addKeyword} />
              </FieldGroup>
              {form.signalKeywords.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.signalKeywords.map((kw) => (
                    <span key={kw} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium">
                      {kw}
                      <button onClick={() => set("signalKeywords", form.signalKeywords.filter(k => k !== kw))} className="ml-0.5 text-muted-foreground hover:text-foreground">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </StudioCardContent>
          </StudioCard>
        </div>

        <div className="space-y-4">
          <StudioCard>
            <StudioCardContent className="space-y-5">
              <h3 className="text-sm font-semibold">Properties</h3>
              <FieldGroup>
                <StudioLabel htmlFor="pat-topic" required>Topic</StudioLabel>
                <StudioSelect id="pat-topic" value={form.topicId} onChange={(e) => set("topicId", e.target.value)}>
                  <option value="" disabled>Select a topic</option>
                  {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </StudioSelect>
                <FieldError message={errors.topicId} />
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="pat-diff">Difficulty</StudioLabel>
                <StudioSelect id="pat-diff" value={form.difficulty} onChange={(e) => set("difficulty", e.target.value as PatternForm["difficulty"])}>
                  {["beginner", "easy", "medium", "hard", "advanced"].map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
                </StudioSelect>
              </FieldGroup>
              
              <div className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Published</span>
                  <button role="switch" aria-checked={form.isPublished}
                    onClick={() => set("isPublished", !form.isPublished)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-ring ${form.isPublished ? "bg-primary" : "bg-muted"}`}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.isPublished ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{form.isPublished ? "Visible to students" : "Hidden from students"}</p>
              </div>
            </StudioCardContent>
          </StudioCard>
        </div>
      </div>

      <PatternImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        currentForm={form}
        currentPatternId={patternId}
        availableTopics={topics}
      />
    </div>
  );
}
