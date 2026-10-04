"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Save, ArrowLeft, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Plus, GripVertical, Trash2, RefreshCw, Layers, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import {
  PageHeader, ActionButton, FieldGroup, StudioLabel, StudioInput,
  StudioTextarea, StudioSelect, StudioCard, StudioCardContent, FieldError,
} from "@/components/studio/ui";
import { RichTextEditor } from "@/components/studio/rich-text-editor";
import { MissionImportModal, MissionImportData } from "./mission-import-modal";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type StepForm = {
  id: string; // for dnd & RichTextEditor key
  key: string;
  kind: "introduction" | "intuition" | "concept" | "mental_model" | "visualization" | "pattern" | "example" | "practice" | "reflection" | "mastery";
  content: string;
  targetId: string | null;
  required: boolean;
  weight: number;
};

type MissionForm = {
  slug: string;
  title: string;
  description: string;
  topicId: string;
  patternId: string | null;
  estimatedMinutes: number;
  difficulty: "beginner" | "easy" | "medium" | "hard";
  order: number;
  isPublished: boolean;
  steps: StepForm[];
};

const defaultForm: MissionForm = {
  slug: "", title: "", description: "", topicId: "", patternId: null,
  estimatedMinutes: 60, difficulty: "medium", order: 0, isPublished: false, steps: [],
};

/** Default label for each stage kind */
const KIND_LABELS: Record<StepForm["kind"], string> = {
  introduction: "Introduction",
  intuition: "Developing Intuition",
  concept: "Core Concepts",
  mental_model: "Mental Model",
  visualization: "Visualizing Operations",
  pattern: "Recognizing Patterns",
  example: "Worked-Through Examples",
  practice: "Hands-On Practice",
  reflection: "Consolidate Your Learning",
  mastery: "Mastery Challenge",
};

/** Minimum character thresholds for publish validation (mirrors backend) */
const KIND_MIN_CHARS: Partial<Record<StepForm["kind"], number>> = {
  introduction: 40, intuition: 40, concept: 40, mental_model: 40,
  visualization: 40, example: 40, reflection: 40, mastery: 80,
};

/** Standard 11-stage template matching the Binary Trees / Strings missions */
const STANDARD_STAGES: Array<Omit<StepForm, "id">> = [
  { key: "Introduction", kind: "introduction", content: "", targetId: null, required: true, weight: 0.07 },
  { key: "Developing Intuition", kind: "intuition", content: "", targetId: null, required: true, weight: 0.09 },
  { key: "Core Concepts & Fundamentals", kind: "concept", content: "", targetId: null, required: true, weight: 0.10 },
  { key: "Mental Model & Visual Framework", kind: "mental_model", content: "", targetId: null, required: true, weight: 0.09 },
  { key: "Visualizing Operations", kind: "visualization", content: "", targetId: null, required: true, weight: 0.09 },
  { key: "Recognizing Problem Patterns", kind: "pattern", content: "", targetId: null, required: true, weight: 0.10 },
  { key: "Worked-Through Examples", kind: "example", content: "", targetId: null, required: true, weight: 0.09 },
  { key: "Hands-On Practice Problems", kind: "practice", content: "", targetId: null, required: true, weight: 0.14 },
  { key: "Consolidate Your Learning", kind: "reflection", content: "", targetId: null, required: true, weight: 0.10 },
  { key: "Mastery Challenge", kind: "mastery", content: "", targetId: null, required: true, weight: 0.10 },
  { key: "Summary & Key Takeaways", kind: "mastery", content: "", targetId: null, required: false, weight: 0.03 },
];

function genId() { return Math.random().toString(36).substr(2, 9); }

function slugify(str: string) {
  return str.toLowerCase().trim().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}

function getDraftStorageKey(id?: string) {
  return id ? `dsa-club:mission-draft:${id}` : "dsa-club:mission-draft:new";
}

function getFormSnapshot(f: MissionForm): string {
  return JSON.stringify({
    slug: f.slug, title: f.title, description: f.description,
    topicId: f.topicId, patternId: f.patternId,
    estimatedMinutes: f.estimatedMinutes, difficulty: f.difficulty,
    order: f.order,
    isPublished: f.isPublished,
    steps: (f.steps || []).map(({ id, ...rest }) => rest),
  });
}

/** Strip HTML tags to measure visible character count. */
function textOnly(html: string | undefined | null): string {
  return String(html ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function hydrateMissionForm(raw: any): MissionForm {
  let topicIdStr = "";
  if (raw.topicId) {
    if (typeof raw.topicId === "object") {
      topicIdStr = String(raw.topicId._id || raw.topicId.id || "");
    } else {
      topicIdStr = String(raw.topicId);
    }
  }

  let patternIdStr: string | null = null;
  if (raw.patternId) {
    if (typeof raw.patternId === "object") {
      patternIdStr = String(raw.patternId._id || raw.patternId.id || "");
    } else {
      patternIdStr = String(raw.patternId);
    }
  }

  const steps: StepForm[] = Array.isArray(raw.steps)
    ? raw.steps.map((s: any) => ({
        // Prefer server-issued MongoDB _id → client dnd id → generate a new one
        id: (s.id ? String(s.id) : "") ||
            (s._id ? String(s._id) : "") ||
            genId(),
        key: typeof s.key === "string" && s.key.trim() ? s.key : "Step",
        kind: s.kind || "concept",
        content: typeof s.content === "string" ? s.content : "",
        targetId: s.targetId
          ? typeof s.targetId === "object"
            ? String(s.targetId._id || s.targetId.id || "")
            : String(s.targetId)
          : null,
        required: typeof s.required === "boolean" ? s.required : true,
        weight: typeof s.weight === "number" ? s.weight : 0.1,
      }))
    : [];

  return {
    slug: typeof raw.slug === "string" ? raw.slug : "",
    title: typeof raw.title === "string" ? raw.title : "",
    description: typeof raw.description === "string" ? raw.description : "",
    topicId: topicIdStr,
    patternId: patternIdStr,
    estimatedMinutes: typeof raw.estimatedMinutes === "number" ? raw.estimatedMinutes : 60,
    difficulty: (["beginner", "easy", "medium", "hard"].includes(raw.difficulty) ? raw.difficulty : "medium") as MissionForm["difficulty"],
    order: typeof raw.order === "number" ? raw.order : 0,
    isPublished: Boolean(raw.isPublished),
    steps,
  };
}

// ─── Publish Readiness Checklist ─────────────────────────────────────────────

const REQUIRED_STAGE_KINDS: StepForm["kind"][] = ["introduction", "concept", "practice", "reflection", "mastery"];
const MECHANIC_KINDS: Set<string> = new Set(["pattern", "practice", "mastery"]);

function usePublishReadiness(form: MissionForm) {
  return useCallback(() => {
    const checks: { label: string; ok: boolean }[] = [];

    checks.push({ label: "Topic selected", ok: Boolean(form.topicId) });

    for (const kind of REQUIRED_STAGE_KINDS) {
      const stage = form.steps.find(s => s.kind === kind);
      if (!stage) {
        checks.push({ label: `"${KIND_LABELS[kind]}" stage present`, ok: false });
        continue;
      }
      const minChars = KIND_MIN_CHARS[kind] ?? 0;
      if (minChars > 0) {
        const charCount = textOnly(stage.content).length;
        const ok = charCount >= minChars;
        checks.push({ label: `"${stage.key}" content (${charCount}/${minChars} chars)`, ok });
      } else {
        checks.push({ label: `"${stage.key}" stage present`, ok: true });
      }
    }

    return checks;
  }, [form]);
}

// ─── Step item ────────────────────────────────────────────────────────────────

function SortableStepItem({
  step, index, onUpdate, onRemove,
}: {
  step: StepForm; index: number;
  onUpdate: (s: StepForm) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: step.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const minChars = KIND_MIN_CHARS[step.kind];
  const isMechanic = MECHANIC_KINDS.has(step.kind);
  const charCount = isMechanic ? null : textOnly(step.content).length;
  const charOk = charCount === null || minChars === undefined || charCount >= minChars;

  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-3 rounded-xl border border-purple-500/15 bg-[rgba(12,6,24,0.75)] p-3 shadow-sm group backdrop-blur-sm">
      <button type="button" {...attributes} {...listeners} className="mt-1 cursor-grab text-purple-300/40 hover:text-purple-200/70 transition-colors">
        <GripVertical size={16} />
      </button>
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono bg-purple-500/10 px-1.5 py-0.5 rounded text-purple-300/60">Step {index + 1}</span>
          <StudioSelect value={step.kind} onChange={(e) => onUpdate({ ...step, kind: e.target.value as StepForm["kind"] })} className="h-7 text-xs py-0 w-36">
            {(["introduction", "intuition", "concept", "mental_model", "visualization", "pattern", "example", "practice", "reflection", "mastery"] as StepForm["kind"][]).map(k => (
              <option key={k} value={k}>{k.replace("_", " ")}</option>
            ))}
          </StudioSelect>
          <StudioInput value={step.key} onChange={(e) => onUpdate({ ...step, key: e.target.value })} placeholder="Stage title" className="h-7 text-xs flex-1" />
          <ActionButton variant="ghost" size="sm" onClick={onRemove} className="opacity-0 group-hover:opacity-100 studio-text-muted hover:text-red-400">
            <Trash2 size={14} />
          </ActionButton>
        </div>
        <div className="flex items-center gap-3 text-xs studio-text-muted">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" checked={step.required} onChange={(e) => onUpdate({ ...step, required: e.target.checked })} className="rounded focus-ring accent-violet-500" />
            Required
          </label>
          <div className="flex items-center gap-1.5">
            <span>Weight:</span>
            <input type="number" step="0.1" min="0" max="1" value={step.weight} onChange={(e) => onUpdate({ ...step, weight: parseFloat(e.target.value) || 0.1 })} className="studio-input w-12 h-6 text-xs rounded px-1" />
          </div>
          <StudioInput value={step.targetId ?? ""} onChange={(e) => onUpdate({ ...step, targetId: e.target.value || null })} placeholder="Target ID (optional)" className="h-6 text-[10px] w-32" />
          {/* Per-step character count badge */}
          {charCount !== null && minChars !== undefined && (
            <span className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded ${charOk ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"}`}>
              {charCount}/{minChars} chars
            </span>
          )}
        </div>
        <div className="pt-2">
          {/* Pass step.id as key so React remounts the editor when the step identity changes */}
          <RichTextEditor
            key={step.id}
            value={step.content}
            onChange={(c) => onUpdate({ ...step, content: c })}
            placeholder={`Write ${KIND_LABELS[step.kind] ?? step.key} content here...`}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Editor ──────────────────────────────────────────────────────────────

export default function MissionEditor({ missionId }: { missionId?: string }) {
  const router = useRouter();

  // In-memory tracked draft ID when on /studio/missions/new
  const inMemoryDraftIdRef = useRef<string | undefined>(missionId);

  const [form, setForm] = useState<MissionForm>(defaultForm);
  const formRef = useRef<MissionForm>(form);
  formRef.current = form;

  const [errors, setErrors] = useState<Partial<Record<keyof MissionForm, string>>>({});
  const [publishIssues, setPublishIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [loading, setLoading] = useState(Boolean(missionId));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [topics, setTopics] = useState<{ id: string; name: string }[]>([]);
  const [allPatterns, setAllPatterns] = useState<{ id: string; name: string; topicId: string }[]>([]);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [restoredFromLocal, setRestoredFromLocal] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!missionId);
  const [showReadiness, setShowReadiness] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const lastSavedSnapshotRef = useRef<string>("");

  const isEdit = Boolean(missionId || inMemoryDraftIdRef.current);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Patterns filtered by the currently selected topic
  const topicPatterns = allPatterns.filter(p => p.topicId === form.topicId);

  // ─── Initial fetch and local draft restoration ──────────────────────────────
  const loadMissionData = useCallback(() => {
    fetch("/api/studio/topics?limit=100").then(r => r.json()).then(d => setTopics(d.topics || [])).catch(() => {});
    // Fetch ALL patterns so we can filter client-side by topicId
    fetch("/api/studio/patterns?limit=200").then(r => r.json()).then(d => {
      const raw: any[] = d.patterns || [];
      setAllPatterns(raw.map((p: any) => ({
        id: String(p._id || p.id),
        name: p.name,
        topicId: p.topicId ? String((p.topicId as any)._id || p.topicId) : "",
      })));
    }).catch(() => {});

    if (!missionId) {
      // Check local storage for an unsaved new mission draft
      try {
        const raw = localStorage.getItem("dsa-club:mission-draft:new");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.form && (parsed.form.title || parsed.form.description || (parsed.form.steps && parsed.form.steps.length > 0))) {
            const restored = hydrateMissionForm(parsed.form);
            setForm(restored);
            setAutoSlug(false);
            setRestoredFromLocal(true);
            setSaveStatus("saved");
            setSaveMessage("Restored unsaved draft from your previous session");
          }
        }
      } catch {}
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    // Load existing mission from database
    fetch(`/api/studio/missions/${missionId}`)
      .then(async (r) => {
        if (!r.ok) {
          const errData = await r.json().catch(() => ({}));
          throw new Error(errData.error || `Failed to load mission (${r.status})`);
        }
        return r.json();
      })
      .then((d: { mission: any }) => {
        if (!d.mission) throw new Error("Mission not found");
        const serverForm = hydrateMissionForm(d.mission);

        // Check if local storage has more content (more steps or local is strictly newer)
        try {
          const localRaw = localStorage.getItem(`dsa-club:mission-draft:${missionId}`);
          if (localRaw) {
            const localParsed = JSON.parse(localRaw);
            const localTime = localParsed?.updatedAt ? new Date(localParsed.updatedAt).getTime() : 0;
            const serverTime = d.mission.updatedAt ? new Date(d.mission.updatedAt).getTime() : 0;
            if (localParsed.form) {
              const localForm = hydrateMissionForm(localParsed.form);
              const serverStepCount = serverForm.steps.length;
              const localStepCount = localForm.steps.length;
              const serverContentLen = serverForm.steps.reduce((acc, s) => acc + textOnly(s.content).length, 0);
              const localContentLen = localForm.steps.reduce((acc, s) => acc + textOnly(s.content).length, 0);

              // Prefer local ONLY if local has strictly MORE steps,
              // or same steps with equal/more text content AND is strictly newer.
              // NEVER clobber server mission if local has fewer steps or empty content!
              const localHasMoreContent =
                localStepCount > serverStepCount ||
                (localStepCount === serverStepCount && localContentLen >= serverContentLen && localTime > serverTime && getFormSnapshot(localForm) !== getFormSnapshot(serverForm));

              if (localHasMoreContent) {
                setForm(localForm);
                setAutoSlug(false);
                setRestoredFromLocal(true);
                setSaveStatus("saved");
                setSaveMessage(`Restored your local draft (${localForm.steps.length} stages)`);
                lastSavedSnapshotRef.current = getFormSnapshot(serverForm);
                return;
              }
            }
          }
        } catch {}

        setForm(serverForm);
        setAutoSlug(false);
        lastSavedSnapshotRef.current = getFormSnapshot(serverForm);
      })
      .catch((err) => {
        // Check localStorage as fallback if database fetch failed
        try {
          const localRaw = localStorage.getItem(`dsa-club:mission-draft:${missionId}`);
          if (localRaw) {
            const localParsed = JSON.parse(localRaw);
            if (localParsed?.form) {
              const localForm = hydrateMissionForm(localParsed.form);
              setForm(localForm);
              setAutoSlug(false);
              setRestoredFromLocal(true);
              setSaveStatus("saved");
              setSaveMessage("Loaded draft from local storage (offline mode)");
              return;
            }
          }
        } catch {}

        setLoadError(err instanceof Error ? err.message : "Failed to load mission");
      })
      .finally(() => setLoading(false));
  }, [missionId]);

  useEffect(() => {
    loadMissionData();
  }, [loadMissionData]);

  // Synchronously backup form state to localStorage on any form edit
  useEffect(() => {
    if (loading) return;
    const activeId = missionId || inMemoryDraftIdRef.current;
    const key = getDraftStorageKey(activeId);
    try {
      localStorage.setItem(key, JSON.stringify({ form, updatedAt: Date.now() }));
    } catch {}
  }, [form, loading, missionId]);

  // ─── Core save function ─────────────────────────────────────────────────────
  const save = useCallback(async (silent = false) => {
    if (isSavingRef.current) return;
    const currentForm = formRef.current;
    const activeId = missionId || inMemoryDraftIdRef.current;

    if (!silent) {
      const errs: typeof errors = {};
      if (!currentForm.slug) errs.slug = "Slug is required";
      if (!currentForm.title.trim()) errs.title = "Title is required";
      if (!currentForm.topicId) errs.topicId = "Topic is required";
      setErrors(errs);
      if (Object.keys(errs).length > 0) return;
    } else {
      // Auto-save: for new missions (no activeId), only sync to server when there is meaningful content.
      // This prevents creating empty 0-step missions that lose data if the page reloads.
      if (!activeId) {
        const hasTitle = currentForm.title.trim().length > 0;
        const hasSlug = currentForm.slug.trim().length > 0;
        const hasTopic = Boolean(currentForm.topicId);
        const hasContent = currentForm.steps.length > 0 &&
          currentForm.steps.some(s => s.content && s.content.replace(/<[^>]*>/g, '').trim().length > 10);
        if (!hasTitle || !hasSlug || !hasTopic || !hasContent) {
          // Still save to localStorage so nothing is lost, but don't create on server yet
          setSaveStatus("saved");
          setSaveMessage(hasContent ? "Draft saved locally (add title & topic to sync)" : "Draft saved locally (add content to sync)");
          return;
        }
      }
    }

    // Auto-save always persists as draft (isPublished: false) to prevent premature publishing and avoid validation failures
    const targetIsPublished = silent ? false : currentForm.isPublished;

    const payload = {
      slug: currentForm.slug,
      title: currentForm.title.trim() || "Untitled Mission",
      description: currentForm.description.trim() || "Draft mission description",
      topicId: currentForm.topicId,
      patternId: currentForm.patternId || null,
      estimatedMinutes: currentForm.estimatedMinutes || 60,
      difficulty: currentForm.difficulty || "medium",
      isPublished: targetIsPublished,
      steps: currentForm.steps.map(({ id, ...rest }) => rest),
    };

    isSavingRef.current = true;
    setSaving(true);
    setSaveStatus("saving");
    setSaveMessage(silent ? "Auto-saving draft..." : "Saving...");

    try {
      const isExisting = Boolean(activeId);
      const url = isExisting ? `/api/studio/missions/${activeId}` : "/api/studio/missions";
      const method = isExisting ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string; issues?: { path?: string[]; message: string }[] };
        const issues = d.issues?.map((issue) => issue.message).filter(Boolean) ?? [];

        // If manual save/publish failed due to publish validation, immediately persist as draft so no content is lost!
        if (targetIsPublished && issues.length > 0) {
          setPublishIssues(issues);
          const fallbackDraftPayload = { ...payload, isPublished: false };
          try {
            const draftRes = await fetch(url, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(fallbackDraftPayload),
            });
            if (draftRes.ok) {
              const draftData = await draftRes.json();
              if (!activeId && draftData?.mission?.id) {
                const newId = draftData.mission.id;
                inMemoryDraftIdRef.current = newId;
                // Update URL bar so a refresh stays on this draft, without a full navigation
                try { window.history.replaceState(null, "", `/studio/missions/${newId}`); } catch {}
                try {
                  localStorage.removeItem("dsa-club:mission-draft:new");
                  localStorage.setItem(getDraftStorageKey(newId), JSON.stringify({ form: currentForm, updatedAt: Date.now() }));
                } catch {}
              }
              lastSavedSnapshotRef.current = getFormSnapshot(currentForm);
              setSaveStatus("saved");
              setSaveMessage("Draft saved. Resolve publish checks above.");
              return;
            }
          } catch {}
        }

        if (!silent) {
          setPublishIssues(issues);
          setErrors({ slug: d.error && !issues.length ? d.error : undefined });
        }
        setSaveStatus("error");
        setSaveMessage(d.error || "Failed to sync draft to server");
        return;
      }

      // Success
      const data = await res.json().catch(() => ({}));
      setPublishIssues([]);
      lastSavedSnapshotRef.current = getFormSnapshot(currentForm);

      const nowStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

      if (!activeId && data?.mission?.id) {
        const newId = data.mission.id;
        inMemoryDraftIdRef.current = newId;

        try {
          localStorage.removeItem("dsa-club:mission-draft:new");
          localStorage.setItem(getDraftStorageKey(newId), JSON.stringify({ form: currentForm, updatedAt: Date.now() }));
        } catch {}

        setSaveStatus("saved");
        setSaveMessage(targetIsPublished ? "Published successfully" : `Draft saved at ${nowStr}`);

        if (!silent) {
          router.push(`/studio/missions/${newId}`);
        }
        // Note: Do NOT use history.replaceState for silent auto-saves.
        // It desynchronizes Next.js router from the URL, causing HMR reloads
        // to load the [id] page with potentially incomplete server data.
      } else {
        setSaveStatus("saved");
        setSaveMessage(targetIsPublished ? "Published successfully" : `Draft saved at ${nowStr}`);
      }
    } catch {
      // Even if network request failed, localStorage has the draft intact
      setSaveStatus("saved");
      setSaveMessage("Draft saved locally (offline)");
    } finally {
      isSavingRef.current = false;
      setSaving(false);
    }
  }, [missionId, router]);

  // Periodic Auto-Save Interval (10s for existing, 20s for new to prevent premature creation)
  useEffect(() => {
    if (loading) return;
    const activeId = missionId || inMemoryDraftIdRef.current;
    const intervalMs = activeId ? 10_000 : 20_000;

    const interval = setInterval(() => {
      if (isSavingRef.current) return;
      const currentSnapshot = getFormSnapshot(formRef.current);
      if (currentSnapshot !== lastSavedSnapshotRef.current) {
        void save(true);
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [loading, save, missionId]);

  // Save on Page Leave, Refresh, Visibility Change, or Navigation
  useEffect(() => {
    const handleLeave = () => {
      const current = formRef.current;
      const activeId = missionId || inMemoryDraftIdRef.current;
      const key = getDraftStorageKey(activeId);
      try {
        localStorage.setItem(key, JSON.stringify({ form: current, updatedAt: Date.now() }));
      } catch {}

      const currentSnapshot = getFormSnapshot(current);
      if (currentSnapshot !== lastSavedSnapshotRef.current && activeId) {
        const payload = {
          slug: current.slug,
          title: current.title.trim() || "Untitled Mission",
          description: current.description.trim() || "Draft mission description",
          topicId: current.topicId,
          patternId: current.patternId || null,
          estimatedMinutes: current.estimatedMinutes || 60,
          difficulty: current.difficulty || "medium",
          isPublished: false,
          steps: current.steps.map(({ id, ...rest }) => rest),
        };
        try {
          fetch(`/api/studio/missions/${activeId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
          });
        } catch {}
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        handleLeave();
      }
    };

    window.addEventListener("beforeunload", handleLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      handleLeave();
    };
  }, [missionId]);

  function set<K extends keyof MissionForm>(key: K, value: MissionForm[K]) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "title" && autoSlug) next.slug = slugify(value as string);
      // When topic changes, if the current patternId belongs to a different topic, reset it
      if (key === "topicId") {
        const selectedTopicId = value as string;
        const currentPatternId = prev.patternId;
        if (currentPatternId) {
          const patternBelongsToTopic = allPatterns.some(
            p => p.id === currentPatternId && p.topicId === selectedTopicId
          );
          if (!patternBelongsToTopic) {
            next.patternId = null;
          }
        }
      }
      return next;
    });
    setErrors((e) => ({ ...e, [key]: undefined }));
    if (key === "isPublished" || key === "steps" || key === "topicId" || key === "patternId") setPublishIssues([]);
  }

  function handleDragEnd(event: any) {
    const { active, over } = event;
    if (active.id !== over?.id) {
      setForm((prev) => {
        const oldIndex = prev.steps.findIndex(s => s.id === active.id);
        const newIndex = prev.steps.findIndex(s => s.id === over.id);
        return { ...prev, steps: arrayMove(prev.steps, oldIndex, newIndex) };
      });
    }
  }

  function addStep(kind: StepForm["kind"] = "concept") {
    const label = KIND_LABELS[kind];
    set("steps", [...form.steps, {
      id: genId(),
      key: label,
      kind,
      content: "",
      targetId: null,
      required: true,
      weight: 0.1,
    }]);
  }

  function populateStandardStages() {
    if (form.steps.length > 0) {
      if (!window.confirm("This will replace all existing stages with the 11 standard stages. Continue?")) return;
    }
    set("steps", STANDARD_STAGES.map(s => ({ ...s, id: genId() })));
  }

  function updateStep(stepId: string, updated: StepForm) {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === stepId ? updated : s),
    }));
    setPublishIssues([]);
  }

  function removeStep(stepId: string) {
    setForm(prev => ({
      ...prev,
      steps: prev.steps.filter(s => s.id !== stepId),
    }));
  }

  function discardLocalDraft() {
    const activeId = missionId || inMemoryDraftIdRef.current;
    try {
      localStorage.removeItem(getDraftStorageKey(activeId));
      if (!missionId) localStorage.removeItem("dsa-club:mission-draft:new");
    } catch {}
    setRestoredFromLocal(false);
    if (!missionId) {
      setForm(defaultForm);
      setSaveStatus("idle");
      setSaveMessage(null);
    } else {
      loadMissionData();
    }
  }

  function handleImport(data: MissionImportData) {
    setForm((prev) => {
      const next = { ...prev };
      if (data.title) next.title = data.title;
      if (data.slug) next.slug = data.slug;
      else if (data.title) next.slug = slugify(data.title);
      if (data.description) next.description = data.description;
      if (data.difficulty) next.difficulty = data.difficulty;
      if (data.estimatedMinutes) next.estimatedMinutes = data.estimatedMinutes;
      if (data.topicId) next.topicId = data.topicId;
      if (data.patternId !== undefined) next.patternId = data.patternId;

      if (data.steps && data.steps.length > 0) {
        next.steps = data.steps.map((s) => ({
          id: genId(),
          key: s.key || "Step",
          kind: s.kind || "concept",
          content: s.content || "",
          targetId: s.targetId ?? null,
          required: typeof s.required === "boolean" ? s.required : true,
          weight: typeof s.weight === "number" ? s.weight : 0.1,
        }));
      }
      return next;
    });
    setAutoSlug(false);
    setPublishIssues([]);
    setSaveStatus("saved");
    setSaveMessage("Mission imported! Click 'Save Draft' to persist.");
  }

  // ─── Publish readiness ──────────────────────────────────────────────────────
  const getReadinessChecks = usePublishReadiness(form);
  const readinessChecks = getReadinessChecks();
  const allReady = readinessChecks.every(c => c.ok);

  if (loading) return <div className="flex items-center justify-center py-24"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>;

  if (loadError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Mission Editor" description="Edit or continue learning mission." />
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-6 text-center space-y-4 max-w-md mx-auto">
          <AlertCircle size={32} className="mx-auto text-destructive" />
          <h3 className="font-semibold text-lg">Failed to load mission</h3>
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <div className="flex items-center justify-center gap-3">
            <Link href="/studio/missions">
              <ActionButton variant="outline"><ArrowLeft size={14} /> Back to Missions</ActionButton>
            </Link>
            <ActionButton onClick={loadMissionData}>
              <RefreshCw size={14} /> Retry
            </ActionButton>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={isEdit ? "Edit Mission" : "New Mission"}
        description="Build an interactive learning mission with custom steps and content. Drafts auto-save to localStorage continuously, and sync to server every 10-20s."
        actions={
          <div className="flex items-center gap-2">
            {saveStatus !== "idle" && (
              <span className={`flex items-center gap-1.5 text-xs font-medium ${
                saveStatus === "saved"
                  ? "text-emerald-400"
                  : saveStatus === "saving"
                  ? "text-purple-400"
                  : "text-destructive"
              }`}>
                {saveStatus === "saving" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : saveStatus === "saved" ? (
                  <CheckCircle2 size={13} />
                ) : (
                  <AlertCircle size={13} />
                )}
                {saveMessage || (saveStatus === "saved" ? "Draft saved" : saveStatus === "saving" ? "Saving..." : "Error")}
              </span>
            )}
            <Link href="/studio/missions">
              <ActionButton variant="outline"><ArrowLeft size={14} />Back</ActionButton>
            </Link>
            <ActionButton
              variant="outline"
              onClick={() => setShowImportModal(true)}
              title="Import from JSON, AI prompt generator, or presets"
              className="border-purple-500/30 text-purple-300 hover:bg-purple-500/15"
            >
              <Sparkles size={14} className="text-purple-400" />
              Import / AI
            </ActionButton>
            <ActionButton variant="outline" onClick={() => set("isPublished", !form.isPublished)}>
              {form.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
              {form.isPublished ? "Unpublish" : "Publish"}
            </ActionButton>
            <ActionButton onClick={() => save(false)} disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {form.isPublished ? "Publish" : "Save Draft"}
            </ActionButton>
          </div>
        }
      />

      {restoredFromLocal && (
        <div className="flex items-center justify-between rounded-lg border border-purple-500/20 bg-purple-500/10 px-4 py-2.5 text-xs text-purple-300">
          <span>Local draft restored ({form.steps.length} stages). Your full progress is intact.</span>
          <button
            type="button"
            onClick={discardLocalDraft}
            className="text-xs text-purple-200 hover:text-white underline ml-3"
          >
            Discard Draft
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          <StudioCard>
            <StudioCardContent className="space-y-5">
              <FieldGroup>
                <StudioLabel htmlFor="m-title" required>Title</StudioLabel>
                <StudioInput id="m-title" placeholder="Introduction to Arrays" value={form.title} onChange={(e) => set("title", e.target.value)} />
                <FieldError message={errors.title} />
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="m-slug" required>Slug</StudioLabel>
                <StudioInput id="m-slug" className="font-mono text-xs" value={form.slug} onChange={(e) => { setAutoSlug(false); set("slug", e.target.value); }} />
                <FieldError message={errors.slug} />
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="m-desc">Description</StudioLabel>
                <StudioTextarea id="m-desc" rows={4} placeholder="Describe this mission..." value={form.description} onChange={(e) => set("description", e.target.value)} />
              </FieldGroup>
            </StudioCardContent>
          </StudioCard>

          <StudioCard>
            <StudioCardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Mission Stages ({form.steps.length})</h3>
                <div className="flex items-center gap-2">
                  <ActionButton
                    variant="outline"
                    size="sm"
                    onClick={() => setShowImportModal(true)}
                    title="Import stages from JSON, AI prompt, or presets"
                    className="border-purple-500/30 text-purple-300 hover:bg-purple-500/15"
                  >
                    <Sparkles size={13} className="text-purple-400" />Import / AI
                  </ActionButton>
                  <ActionButton
                    variant="outline"
                    size="sm"
                    onClick={populateStandardStages}
                    title="Replace with all 11 standard stages (Introduction → Summary)"
                  >
                    <Layers size={14} />Standard Stages
                  </ActionButton>
                  <ActionButton variant="outline" size="sm" onClick={() => addStep("concept")}>
                    <Plus size={14} />Add Step
                  </ActionButton>
                </div>
              </div>
              <div className="space-y-2">
                {form.steps.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground border rounded-lg border-dashed space-y-3">
                    <p>No stages yet.</p>
                    <div className="flex items-center justify-center gap-2 flex-wrap">
                      <ActionButton
                        variant="outline"
                        size="sm"
                        onClick={() => setShowImportModal(true)}
                        className="border-purple-500/30 text-purple-300 hover:bg-purple-500/15"
                      >
                        <Sparkles size={13} className="text-purple-400" /> Generate with AI / Presets
                      </ActionButton>
                      <ActionButton variant="outline" size="sm" onClick={populateStandardStages}>
                        <Layers size={13} /> Populate Standard 11 Stages
                      </ActionButton>
                      <ActionButton variant="outline" size="sm" onClick={() => addStep("introduction")}>
                        <Plus size={13} /> Add First Stage
                      </ActionButton>
                    </div>
                  </div>
                ) : (
                  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={form.steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
                      {form.steps.map((step, idx) => (
                        <SortableStepItem
                          key={step.id}
                          step={step}
                          index={idx}
                          onUpdate={(newStep) => updateStep(step.id, newStep)}
                          onRemove={() => removeStep(step.id)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </div>
              {form.steps.length > 0 && (
                <div className="flex justify-end">
                  <ActionButton variant="outline" size="sm" onClick={() => addStep("concept")}>
                    <Plus size={14} />Add Step
                  </ActionButton>
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
                <StudioLabel htmlFor="m-topic" required>Topic</StudioLabel>
                <StudioSelect
                  id="m-topic"
                  value={form.topicId}
                  onChange={(e) => {
                    set("topicId", e.target.value);
                  }}
                >
                  <option value="" disabled>Select topic</option>
                  {topics.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </StudioSelect>
                <FieldError message={errors.topicId} />
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="m-pattern">Pattern (Optional)</StudioLabel>
                <StudioSelect
                  id="m-pattern"
                  value={form.patternId ?? ""}
                  onChange={(e) => set("patternId", e.target.value || null)}
                  disabled={!form.topicId || topicPatterns.length === 0}
                >
                  <option value="">None</option>
                  {topicPatterns.length === 0 && form.topicId && (
                    <option value="" disabled>No patterns for this topic</option>
                  )}
                  {topicPatterns.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </StudioSelect>
                {form.topicId && topicPatterns.length === 0 && (
                  <p className="text-[10px] text-muted-foreground mt-1">No published patterns exist for this topic yet.</p>
                )}
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="m-diff">Difficulty</StudioLabel>
                <StudioSelect id="m-diff" value={form.difficulty} onChange={(e) => set("difficulty", e.target.value as MissionForm["difficulty"])}>
                  {["beginner", "easy", "medium", "hard"].map((d) => <option key={d} value={d} className="capitalize">{d}</option>)}
                </StudioSelect>
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="m-mins">Estimated Minutes</StudioLabel>
                <StudioInput id="m-mins" type="number" min={5} max={480} value={form.estimatedMinutes} onChange={(e) => set("estimatedMinutes", parseInt(e.target.value) || 60)} />
              </FieldGroup>
              <FieldGroup>
                <StudioLabel htmlFor="m-order">Curriculum Order</StudioLabel>
                <StudioInput
                  id="m-order"
                  type="number"
                  min={0}
                  max={999}
                  value={form.order}
                  onChange={(e) => set("order", Math.max(0, parseInt(e.target.value) || 0))}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Explicit pedagogical progression order within the topic.
                </p>
              </FieldGroup>
              <div className="rounded-lg border p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Published</span>
                  <button role="switch" aria-checked={form.isPublished} onClick={() => set("isPublished", !form.isPublished)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-ring ${form.isPublished ? "bg-primary" : "bg-muted"}`}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${form.isPublished ? "translate-x-4" : "translate-x-0.5"}`} />
                  </button>
                </div>
              </div>
              {publishIssues.length > 0 && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3">
                  <p className="mb-2 text-xs font-semibold text-destructive">Publish checks failed</p>
                  <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                    {publishIssues.map((issue) => <li key={issue}>{issue}</li>)}
                  </ul>
                  <p className="mt-2 text-[11px] text-emerald-400 font-medium">✓ Content saved as draft in background.</p>
                </div>
              )}
            </StudioCardContent>
          </StudioCard>

          {/* Live Publish Readiness Checklist */}
          <StudioCard>
            <StudioCardContent className="space-y-2">
              <button
                type="button"
                className="flex w-full items-center justify-between text-sm font-semibold"
                onClick={() => setShowReadiness(v => !v)}
              >
                <span className="flex items-center gap-2">
                  {allReady
                    ? <CheckCircle2 size={14} className="text-emerald-400" />
                    : <AlertCircle size={14} className="text-amber-400" />}
                  Publish Readiness
                </span>
                {showReadiness ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showReadiness && (
                <ul className="mt-2 space-y-1.5">
                  {readinessChecks.map((c, i) => (
                    <li key={i} className={`flex items-start gap-2 text-xs ${c.ok ? "text-emerald-400" : "text-amber-400"}`}>
                      <span className="mt-0.5 shrink-0">{c.ok ? "✓" : "✗"}</span>
                      <span>{c.label}</span>
                    </li>
                  ))}
                </ul>
              )}
              {!showReadiness && (
                <p className="text-[10px] text-muted-foreground">
                  {allReady ? "All checks passed — ready to publish." : `${readinessChecks.filter(c => !c.ok).length} issue(s) remain before publishing.`}
                </p>
              )}
            </StudioCardContent>
          </StudioCard>
        </div>
      </div>

      <MissionImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        currentForm={form}
        selectedTopicName={topics.find((t) => t.id === form.topicId)?.name}
      />
    </div>
  );
}
