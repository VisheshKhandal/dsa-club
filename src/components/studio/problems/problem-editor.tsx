"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, X, Plus, Trash2, Sparkles } from "lucide-react";
import {
  PageHeader, ActionButton, FieldGroup, StudioLabel, StudioInput,
  StudioTextarea, StudioSelect, StudioCard, StudioCardContent, FieldError,
} from "@/components/studio/ui";
import { ProblemImportModal, ProblemImportData } from "./problem-import-modal";

type ProblemForm = {
  slug: string;
  title: string;
  summary: string;
  thinkingDirection: string;
  dryRunPrompt: string;
  hints: { level: number; title: string; content: string }[];
  commonMistakes: string[];
  source: "leetcode" | "geeksforgeeks" | "codeforces" | "other" | "internal";
  sourceUrl: string;
  externalId: string;
  topicIds: string[];
  patternIds: string[];
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  qualityScore: number;
  companyIds: string[];
  tags: string[];
  isPublished: boolean;
};

const defaultForm: ProblemForm = {
  slug: "", title: "", summary: "", source: "leetcode", sourceUrl: "", externalId: "",
  thinkingDirection: "", dryRunPrompt: "", hints: [], commonMistakes: [],
  topicIds: [], patternIds: [], difficulty: "easy", estimatedMinutes: 30,
  qualityScore: 0.5, companyIds: [], tags: [], isPublished: false,
};

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-");
}

export default function ProblemEditor({ problemId }: { problemId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<ProblemForm>(defaultForm);
  const [errors, setErrors] = useState<Partial<Record<keyof ProblemForm, string>>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(Boolean(problemId));
  const [topics, setTopics] = useState<{ id: string; name: string }[]>([]);
  const [patterns, setPatterns] = useState<{ id: string; name: string }[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved" | "error">("idle");
  const [autoSlug, setAutoSlug] = useState(!problemId);
  const [tagInput, setTagInput] = useState("");
  const [mistakeInput, setMistakeInput] = useState("");
  const [showImportModal, setShowImportModal] = useState(false);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isEdit = Boolean(problemId);

  useEffect(() => {
    fetch("/api/studio/topics?limit=100").then(r => r.json()).then(d => setTopics(d.topics || []));
    fetch("/api/studio/patterns?limit=100").then(r => r.json()).then(d => setPatterns(d.patterns || []));
    
    if (!problemId) { setLoading(false); return; }
    fetch(`/api/studio/problems/${problemId}`)
      .then((r) => r.json())
      .then((d: { problem: ProblemForm & { id: string } }) => {
        setForm({
          slug: d.problem.slug, title: d.problem.title, summary: d.problem.summary,
          thinkingDirection: d.problem.thinkingDirection ?? "",
          dryRunPrompt: d.problem.dryRunPrompt ?? "",
          hints: d.problem.hints ?? [],
          commonMistakes: d.problem.commonMistakes ?? [],
          source: d.problem.source, sourceUrl: d.problem.sourceUrl,
          externalId: d.problem.externalId ?? "", topicIds: d.problem.topicIds ?? [],
          patternIds: d.problem.patternIds ?? [], difficulty: d.problem.difficulty,
          estimatedMinutes: d.problem.estimatedMinutes, qualityScore: d.problem.qualityScore,
          companyIds: d.problem.companyIds ?? [], tags: d.problem.tags ?? [],
          isPublished: d.problem.isPublished,
        });
        setAutoSlug(false);
      }).catch(() => {}).finally(() => setLoading(false));
  }, [problemId]);

  useEffect(() => {
    if (!isEdit || loading || saving) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => { void save(true); }, 2500);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function set<K extends keyof ProblemForm>(key: K, value: ProblemForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && autoSlug) next.slug = slugify(value as string);
      return next;
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
  }

  function validate() {
    const errs: typeof errors = {};
    if (!form.slug) errs.slug = "Slug is required";
    else if (!/^[a-z0-9-]+$/.test(form.slug)) errs.slug = "Lowercase letters, numbers, and hyphens only";
    if (!form.title.trim()) errs.title = "Title is required";
    if (!form.summary.trim()) errs.summary = "Summary is required";
    if (!form.sourceUrl) errs.sourceUrl = "Source URL is required";
    if (form.topicIds.length === 0) errs.topicIds = "At least one topic is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function save(silent = false) {
    if (!silent && !validate()) return;
    setSaving(true);
    try {
      const url = isEdit ? `/api/studio/problems/${problemId}` : "/api/studio/problems";
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) {
        const d = await res.json() as { error?: string, issues?: { path: string[], message: string }[] };
        if (!silent) {
          if (d.issues && d.issues.length > 0) {
            const newErrors: any = {};
            d.issues.forEach(iss => {
              if (iss.path && iss.path.length > 0) {
                newErrors[iss.path[0]] = iss.message;
              }
            });
            setErrors(newErrors);
          } else {
            setErrors({ slug: d.error });
          }
        }
        setSaveStatus("error"); return;
      }
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
      if (!isEdit) {
        const created = await res.json() as { problem: { id: string } };
        router.push(`/studio/problems/${created.problem.id}`);
      }
    } catch { setSaveStatus("error"); }
    finally { setSaving(false); }
  }

  function addTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const rawTags = tagInput.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
      const newTags = [...form.tags];
      let changed = false;
      for (const t of rawTags) {
        if (!newTags.includes(t)) {
          newTags.push(t);
          changed = true;
        }
      }
      if (changed) set("tags", newTags);
      setTagInput("");
    }
  }

  function removeTag(tag: string) { set("tags", form.tags.filter((t) => t !== tag)); }

  function addMistake(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const mistake = mistakeInput.trim();
      if (mistake && !form.commonMistakes.includes(mistake)) set("commonMistakes", [...form.commonMistakes, mistake]);
      setMistakeInput("");
    }
  }

  function removeMistake(mistake: string) {
    set("commonMistakes", form.commonMistakes.filter((item) => item !== mistake));
  }

  function updateHint(index: number, patch: Partial<ProblemForm["hints"][number]>) {
    set("hints", form.hints.map((hint, i) => i === index ? { ...hint, ...patch } : hint));
  }

  function addHint() {
    set("hints", [...form.hints, { level: form.hints.length + 1, title: "", content: "" }]);
  }

  function removeHint(index: number) {
    set("hints", form.hints.filter((_, i) => i !== index));
  }

  function handleImport(data: ProblemImportData) {
    setForm((prev) => ({
      ...prev,
      title: data.title || prev.title,
      slug: data.slug || prev.slug,
      summary: data.summary || prev.summary,
      source: data.source || prev.source,
      sourceUrl: data.sourceUrl || prev.sourceUrl,
      externalId: data.externalId ?? prev.externalId,
      topicIds: data.topicIds.length > 0 ? data.topicIds : prev.topicIds,
      patternIds: data.patternIds.length > 0 ? data.patternIds : prev.patternIds,
      difficulty: data.difficulty || prev.difficulty,
      estimatedMinutes: typeof data.estimatedMinutes === "number" ? data.estimatedMinutes : prev.estimatedMinutes,
      qualityScore: typeof data.qualityScore === "number" ? data.qualityScore : prev.qualityScore,
      thinkingDirection: typeof data.thinkingDirection === "string" ? data.thinkingDirection : prev.thinkingDirection,
      dryRunPrompt: typeof data.dryRunPrompt === "string" ? data.dryRunPrompt : prev.dryRunPrompt,
      hints: Array.isArray(data.hints) ? data.hints : prev.hints,
      commonMistakes: Array.isArray(data.commonMistakes) ? data.commonMistakes : prev.commonMistakes,
      tags: Array.isArray(data.tags) ? data.tags : prev.tags,
      isPublished: typeof data.isPublished === "boolean" ? data.isPublished : prev.isPublished,
    }));
    setAutoSlug(false);
    setErrors({});
    setImportNotice(`Problem populated from AI specification ("${data.title}"). Click 'Save' to persist.`);
    setTimeout(() => setImportNotice(null), 8000);
  }

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? "Edit Problem" : "New Problem"}
        description={isEdit ? "Changes auto-save after 2.5 seconds." : "Add a practice problem with links to external platforms."}
        actions={
          <div className="flex items-center gap-2">
            {isEdit && saveStatus !== "idle" && (
              <span className={`flex items-center gap-1.5 text-xs ${saveStatus === "saved" ? "text-green-500" : "text-destructive"}`}>
                {saveStatus === "saved" ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
                {saveStatus === "saved" ? "Saved" : "Error"}
              </span>
            )}
            <Link href="/studio/problems"><ActionButton variant="outline"><ArrowLeft size={14} />Back</ActionButton></Link>
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
        {/* Main */}
        <div className="lg:col-span-2 space-y-5">
          <StudioCard>
            <StudioCardContent className="space-y-5">
              <FieldGroup>
                <StudioLabel htmlFor="p-title" required>Title</StudioLabel>
                <StudioInput id="p-title" placeholder="Two Sum" value={form.title} onChange={(e) => set("title", e.target.value)} />
                <FieldError message={errors.title} />
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="p-slug" required>Slug</StudioLabel>
                <StudioInput id="p-slug" className="font-mono text-xs" placeholder="two-sum"
                  value={form.slug} onChange={(e) => { setAutoSlug(false); set("slug", e.target.value); }} />
                <FieldError message={errors.slug} />
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="p-summary" required>Summary / Learning Goal</StudioLabel>
                <StudioTextarea id="p-summary" rows={5} value={form.summary}
                  placeholder="Describe the problem, thinking process, and what students will learn..."
                  onChange={(e) => set("summary", e.target.value)} />
                <p className="text-xs text-muted-foreground text-right">{form.summary.length}/3000</p>
                <FieldError message={errors.summary} />
              </FieldGroup>
            </StudioCardContent>
          </StudioCard>

          {/* Solver Guidance */}
          <StudioCard>
            <StudioCardContent className="space-y-5">
              <h3 className="text-sm font-semibold">Solver Guidance</h3>
              <FieldGroup>
                <StudioLabel htmlFor="p-thinking">Thinking Direction</StudioLabel>
                <StudioTextarea
                  id="p-thinking"
                  rows={5}
                  value={form.thinkingDirection}
                  placeholder="Give students a nudge toward the right framing without revealing the full solution..."
                  onChange={(e) => set("thinkingDirection", e.target.value)}
                />
                <p className="text-xs text-muted-foreground text-right">{form.thinkingDirection.length}/3000</p>
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="p-dry-run">Dry Run Prompt</StudioLabel>
                <StudioTextarea
                  id="p-dry-run"
                  rows={3}
                  value={form.dryRunPrompt}
                  placeholder="Optional prompt asking the student to dry run their code against a specific edge case..."
                  onChange={(e) => set("dryRunPrompt", e.target.value)}
                />
                <p className="text-xs text-muted-foreground text-right">{form.dryRunPrompt.length}/3000</p>
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="p-mistakes">Common Mistakes</StudioLabel>
                <StudioInput
                  id="p-mistakes"
                  placeholder="Press Enter to add a mistake"
                  value={mistakeInput}
                  onChange={(e) => setMistakeInput(e.target.value)}
                  onKeyDown={addMistake}
                />
                {form.commonMistakes.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {form.commonMistakes.map((mistake) => (
                      <span key={mistake} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                        {mistake}
                        <button onClick={() => removeMistake(mistake)} className="ml-0.5 text-muted-foreground hover:text-foreground"><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </FieldGroup>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <StudioLabel>Hints</StudioLabel>
                  <ActionButton variant="outline" onClick={addHint}><Plus size={14} />Add Hint</ActionButton>
                </div>
                {form.hints.map((hint, index) => (
                  <div key={index} className="rounded-lg border p-3 space-y-3">
                    <div className="grid grid-cols-[90px_1fr_auto] gap-2">
                      <StudioInput type="number" min={1} max={5} value={hint.level} onChange={(e) => updateHint(index, { level: parseInt(e.target.value) || 1 })} />
                      <StudioInput placeholder="Hint title" value={hint.title} onChange={(e) => updateHint(index, { title: e.target.value })} />
                      <ActionButton variant="ghost" onClick={() => removeHint(index)}><Trash2 size={14} /></ActionButton>
                    </div>
                    <StudioTextarea rows={3} placeholder="Hint content" value={hint.content} onChange={(e) => updateHint(index, { content: e.target.value })} />
                  </div>
                ))}
              </div>
            </StudioCardContent>
          </StudioCard>

          {/* External Links */}
          <StudioCard>
            <StudioCardContent className="space-y-5">
              <h3 className="text-sm font-semibold">External Platform Links</h3>
              <div className="grid grid-cols-2 gap-4">
                <FieldGroup>
                  <StudioLabel htmlFor="p-source">Platform</StudioLabel>
                  <StudioSelect id="p-source" value={form.source} onChange={(e) => set("source", e.target.value as ProblemForm["source"])}>
                    {["leetcode", "geeksforgeeks", "codeforces", "other", "internal"].map((s) => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </StudioSelect>
                </FieldGroup>
                <FieldGroup>
                  <StudioLabel htmlFor="p-ext-id">Problem ID / Number</StudioLabel>
                  <StudioInput id="p-ext-id" placeholder="e.g. 1" value={form.externalId}
                    onChange={(e) => set("externalId", e.target.value)} />
                </FieldGroup>
              </div>
              <FieldGroup>
                <StudioLabel htmlFor="p-source-url" required>Primary Problem URL</StudioLabel>
                <StudioInput id="p-source-url" type="url" placeholder="https://leetcode.com/problems/two-sum"
                  value={form.sourceUrl} onChange={(e) => set("sourceUrl", e.target.value)} />
                <FieldError message={errors.sourceUrl} />
              </FieldGroup>
            </StudioCardContent>
          </StudioCard>

          {/* Categorization */}
          <StudioCard>
            <StudioCardContent className="space-y-4">
              <h3 className="text-sm font-semibold">Categorization</h3>
              <FieldGroup>
                <StudioLabel htmlFor="p-topics" required>Topics</StudioLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.topicIds.map(tid => {
                    const t = topics.find(t => t.id === tid);
                    return t ? (
                      <span key={tid} className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                        {t.name}
                        <button onClick={() => set("topicIds", form.topicIds.filter(id => id !== tid))} className="ml-0.5 hover:text-primary/80"><X size={10} /></button>
                      </span>
                    ) : null;
                  })}
                </div>
                <StudioSelect
                  id="p-topics"
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !form.topicIds.includes(e.target.value)) {
                      set("topicIds", [...form.topicIds, e.target.value]);
                    }
                  }}
                >
                  <option value="" disabled>Add a topic...</option>
                  {topics.filter(t => !form.topicIds.includes(t.id)).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </StudioSelect>
                <FieldError message={errors.topicIds} />
              </FieldGroup>
              
              <FieldGroup>
                <StudioLabel htmlFor="p-patterns">Patterns</StudioLabel>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.patternIds.map(pid => {
                    const p = patterns.find(p => p.id === pid);
                    return p ? (
                      <span key={pid} className="flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                        {p.name}
                        <button onClick={() => set("patternIds", form.patternIds.filter(id => id !== pid))} className="ml-0.5 hover:text-primary/80"><X size={10} /></button>
                      </span>
                    ) : null;
                  })}
                </div>
                <StudioSelect
                  id="p-patterns"
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !form.patternIds.includes(e.target.value)) {
                      set("patternIds", [...form.patternIds, e.target.value]);
                    }
                  }}
                >
                  <option value="" disabled>Add a pattern...</option>
                  {patterns.filter(p => !form.patternIds.includes(p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </StudioSelect>
              </FieldGroup>
            </StudioCardContent>
          </StudioCard>

          {/* Tags */}
          <StudioCard>
            <StudioCardContent className="space-y-4">
              <h3 className="text-sm font-semibold">Tags</h3>
              <FieldGroup>
                <StudioLabel htmlFor="p-tags">Add tags (press Enter or comma to add)</StudioLabel>
                <StudioInput id="p-tags" placeholder="e.g. hashing, two-pointers" value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)} onKeyDown={addTag} />
                <FieldError message={errors.tags} />
              </FieldGroup>
              {form.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {form.tags.map((tag) => (
                    <span key={tag} className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="ml-0.5 text-muted-foreground hover:text-foreground">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </StudioCardContent>
          </StudioCard>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <StudioCard>
            <StudioCardContent className="space-y-5">
              <h3 className="text-sm font-semibold">Properties</h3>
              <FieldGroup>
                <StudioLabel htmlFor="p-difficulty">Difficulty</StudioLabel>
                <StudioSelect id="p-difficulty" value={form.difficulty} onChange={(e) => set("difficulty", e.target.value as ProblemForm["difficulty"])}>
                  {["easy", "medium", "hard"].map((d) => <option key={d} value={d} className="capitalize">{d.charAt(0).toUpperCase() + d.slice(1)}</option>)}
                </StudioSelect>
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="p-minutes">Estimated Minutes</StudioLabel>
                <StudioInput id="p-minutes" type="number" min={5} max={300} value={form.estimatedMinutes}
                  onChange={(e) => set("estimatedMinutes", parseInt(e.target.value) || 30)} />
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="p-quality">Quality Score (0–1)</StudioLabel>
                <div className="flex items-center gap-3">
                  <input type="range" min="0" max="1" step="0.1" value={form.qualityScore}
                    onChange={(e) => set("qualityScore", parseFloat(e.target.value))}
                    className="flex-1 h-2 rounded-full accent-primary" />
                  <span className="text-sm font-medium w-8 text-right tabular-nums">{form.qualityScore}</span>
                </div>
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

          <StudioCard>
            <StudioCardContent>
              <p className="text-xs text-muted-foreground leading-relaxed">
                After saving, go to the student platform to preview how this problem appears in missions and practice sets.
              </p>
            </StudioCardContent>
          </StudioCard>
        </div>
      </div>

      <ProblemImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        currentForm={form}
        currentProblemId={problemId}
        availableTopics={topics}
        availablePatterns={patterns}
      />
    </div>
  );
}
