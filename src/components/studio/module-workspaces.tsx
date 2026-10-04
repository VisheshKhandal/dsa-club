"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Award,
  BookOpen,
  Boxes,
  Check,
  CheckCircle2,
  Code2,
  ExternalLink,
  GripVertical,
  Layers,
  Loader2,
  Map,
  Plus,
  Search,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { LearningPathImportModal, type LearningPathImportResult } from "@/components/studio/learning-paths/learning-path-import-modal";
import { CoverImageUploader } from "@/components/studio/learning-paths/cover-image-uploader";
import { cn } from "@/lib/utils";
import {
  ActionButton,
  DifficultyBadge,
  EmptyState,
  FieldGroup,
  PageHeader,
  StatusBadge,
  StudioCard,
  StudioCardContent,
  StudioInput,
  StudioLabel,
  StudioSelect,
  StudioTextarea,
  Table,
  TableBody,
  TableHead,
  Td,
  Th,
} from "@/components/studio/ui";

type SaveState = "idle" | "saving" | "success" | "error";

type Stage = {
  key?: string;
  order: number;
  title: string;
  description?: string;
  topicIds: string[];
  patternIds?: string[];
  problemIds?: string[];
  missionIds: string[];
  estimatedMinutes: number;
};

type ContentResult = { id: string; type: "topic" | "pattern" | "mission" | "problem"; title: string; difficulty?: string; metadata?: string };

type Roadmap = {
  id: string;
  slug: string;
  name: string;
  audience?: { levels?: string[]; goals?: string[]; dailyMinutes?: { min?: number; max?: number } };
  version: number;
  isPublished: boolean;
  stages: Stage[];
};

type LearningPath = {
  id: string;
  slug: string;
  title: string;
  description: string;
  coverImage: string;
  estimatedMinutes: number;
  difficulty: "beginner" | "easy" | "medium" | "hard" | "advanced";
  audience: string;
  stages: Stage[];
  tags: string[];
  isPublished: boolean;
  isFeatured: boolean;
};

type Achievement = {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: "consistency" | "practice" | "mastery" | "revision" | "milestone";
  xpReward: number;
  criteria: Record<string, unknown>;
  isActive: boolean;
};

const slugify = (value: string) =>
  value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function StatusLine({ state, error }: { state: SaveState; error?: string }) {
  if (state === "idle") return null;
  if (state === "saving") return <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Saving...</span>;
  if (state === "success") return <span className="inline-flex items-center gap-1 text-sm text-emerald-400"><Check size={14} /> Saved successfully</span>;
  return <span className="text-sm text-destructive">{error ?? "Something went wrong. Your form data is still here."}</span>;
}

function StageEditor({
  stages,
  onChange,
  includePatterns,
  includeProblems,
}: {
  stages: Stage[];
  onChange: (stages: Stage[]) => void;
  includePatterns?: boolean;
  includeProblems?: boolean;
}) {
  const [picker, setPicker] = useState<{ index: number; type: "topic" | "pattern" | "problem" | "mission" } | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ContentResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [labels, setLabels] = useState<Record<string, string>>({});

  // Pre-load content names so existing IDs have human-readable labels
  useEffect(() => {
    fetch("/api/studio/roadmaps/content?type=all")
      .then(parseResponse)
      .then((data) => {
        if (Array.isArray(data.results)) {
          const map: Record<string, string> = {};
          for (const item of data.results) {
            map[item.id] = item.title;
          }
          setLabels((prev) => ({ ...map, ...prev }));
        }
      })
      .catch(() => {});
  }, []);

  // Fetch search results when picker is opened or query changes
  useEffect(() => {
    if (!picker) return;
    setLoadingResults(true);
    fetch(`/api/studio/roadmaps/content?q=${encodeURIComponent(query)}&type=${picker.type}`)
      .then(parseResponse)
      .then((data) => {
        setResults(data.results ?? []);
        if (Array.isArray(data.results)) {
          const map: Record<string, string> = {};
          for (const item of data.results) {
            map[item.id] = item.title;
          }
          setLabels((prev) => ({ ...prev, ...map }));
        }
      })
      .catch(() => setResults([]))
      .finally(() => setLoadingResults(false));
  }, [picker, query]);

  const addStage = () =>
    onChange([
      ...stages,
      {
        key: `stage-${stages.length + 1}`,
        order: stages.length,
        title: `Stage ${stages.length + 1}`,
        description: "",
        topicIds: [],
        patternIds: [],
        problemIds: [],
        missionIds: [],
        estimatedMinutes: 60,
      },
    ]);

  const update = (index: number, patch: Partial<Stage>) =>
    onChange(
      stages
        .map((stage, i) => (i === index ? { ...stage, ...patch } : stage))
        .map((stage, i) => ({ ...stage, order: i }))
    );

  const move = (index: number, direction: -1 | 1) => {
    const next = [...stages];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next.map((stage, i) => ({ ...stage, order: i })));
  };

  const removeItem = (stageIndex: number, type: "topic" | "pattern" | "problem" | "mission", idToRemove: string) => {
    const stage = stages[stageIndex];
    const key =
      type === "topic"
        ? "topicIds"
        : type === "pattern"
        ? "patternIds"
        : type === "problem"
        ? "problemIds"
        : "missionIds";
    const current = (stage[key] ?? []) as string[];
    update(stageIndex, { [key]: current.filter((id) => id !== idToRemove) });
  };

  const addSelection = (item: ContentResult) => {
    if (!picker) return;
    const stage = stages[picker.index];
    const key =
      picker.type === "topic"
        ? "topicIds"
        : picker.type === "pattern"
        ? "patternIds"
        : picker.type === "problem"
        ? "problemIds"
        : "missionIds";
    const current = (stage[key] ?? []) as string[];
    if (!current.includes(item.id)) {
      update(picker.index, { [key]: [...current, item.id] });
    }
    setLabels((currentLabels) => ({ ...currentLabels, [item.id]: item.title }));
    setPicker(null);
    setQuery("");
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-purple-500/10 pb-3">
        <div>
          <h3 className="text-base font-semibold studio-text">Progression Stages</h3>
          <p className="text-xs studio-text-muted">
            Build each stage from existing content. Names are displayed here; MongoDB IDs are stored internally.
          </p>
        </div>
        <ActionButton type="button" variant="outline" size="sm" onClick={addStage} className="h-8 gap-1 text-xs">
          <Plus size={13} /> Add Stage
        </ActionButton>
      </div>

      {stages.length === 0 ? (
        <EmptyState
          icon={<Map size={26} className="text-purple-400" />}
          title="No stages yet"
          description="Add the first stage to define the learner progression path."
          action={
            <ActionButton type="button" onClick={addStage} size="sm">
              <Plus size={13} /> Create First Stage
            </ActionButton>
          }
        />
      ) : (
        <div className="space-y-3.5">
          {stages.map((stage, index) => (
            <div
              key={`${stage.key}-${index}`}
              className="rounded-xl border border-purple-500/15 bg-[rgba(18,10,34,0.65)] p-4 shadow-sm backdrop-blur-sm space-y-4 transition-colors hover:border-purple-500/25"
            >
              <div className="flex flex-wrap items-center gap-2 border-b border-purple-500/10 pb-3">
                <GripVertical size={16} className="text-purple-400/50" />
                <span className="rounded-md bg-purple-500/15 px-2 py-0.5 font-mono text-xs font-semibold text-purple-300 border border-purple-500/20">
                  Stage {index + 1}
                </span>
                <span className="text-xs studio-text-muted truncate max-w-[200px]">
                  {stage.title || "Untitled stage"}
                </span>
                <div className="ml-auto flex items-center gap-1.5">
                  <ActionButton
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    Up
                  </ActionButton>
                  <ActionButton
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => move(index, 1)}
                    disabled={index === stages.length - 1}
                    title="Move down"
                  >
                    Down
                  </ActionButton>
                  <ActionButton
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() =>
                      onChange(stages.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })))
                    }
                    title="Delete stage"
                  >
                    <Trash2 size={12} />
                  </ActionButton>
                </div>
              </div>

              <div className="grid gap-3.5 md:grid-cols-2">
                <FieldGroup>
                  <StudioLabel className="text-xs">Title</StudioLabel>
                  <StudioInput
                    value={stage.title}
                    placeholder="e.g. Fundamentals & Basics"
                    onChange={(e) =>
                      update(index, {
                        title: e.target.value,
                        key: slugify(e.target.value) || stage.key,
                      })
                    }
                  />
                </FieldGroup>

                <FieldGroup>
                  <StudioLabel className="text-xs">Estimated Minutes</StudioLabel>
                  <StudioInput
                    type="number"
                    min={5}
                    value={stage.estimatedMinutes}
                    onChange={(e) => update(index, { estimatedMinutes: Number(e.target.value) })}
                  />
                </FieldGroup>

                {/* Topics Container */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <StudioLabel className="mb-0 flex items-center gap-1.5 text-xs font-semibold text-purple-200">
                      <BookOpen size={12} className="text-purple-400" />
                      <span>Topics</span>
                      <span className="rounded-full bg-purple-500/15 px-1.5 py-0.2 text-[10px] font-mono text-purple-300 border border-purple-500/20">
                        {stage.topicIds?.length ?? 0}
                      </span>
                    </StudioLabel>
                  </div>
                  <div className="min-h-[76px] rounded-xl border border-purple-500/15 bg-[rgba(10,5,20,0.65)] p-2.5 flex flex-col justify-between gap-2">
                    {!stage.topicIds || stage.topicIds.length === 0 ? (
                      <p className="text-xs text-purple-300/40 italic py-1">No topics added yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin">
                        {stage.topicIds.map((id) => (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-xs text-purple-200"
                          >
                            <span className="max-w-[140px] truncate" title={labels[id] || id}>
                              {labels[id] || id.slice(-6)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeItem(index, "topic", id)}
                              className="rounded p-0.5 text-purple-400/70 hover:bg-purple-500/20 hover:text-red-300 transition-colors"
                              title="Remove topic"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div>
                      <button
                        type="button"
                        onClick={() => setPicker({ index, type: "topic" })}
                        className="inline-flex items-center gap-1 text-xs font-medium text-purple-300 hover:text-white rounded-md border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 hover:bg-purple-500/20 transition-colors"
                      >
                        <Plus size={11} /> Add Topic
                      </button>
                    </div>
                  </div>
                </div>

                {/* Patterns Container (if includePatterns) */}
                {includePatterns && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <StudioLabel className="mb-0 flex items-center gap-1.5 text-xs font-semibold text-purple-200">
                        <Boxes size={12} className="text-purple-400" />
                        <span>Patterns</span>
                        <span className="rounded-full bg-purple-500/15 px-1.5 py-0.2 text-[10px] font-mono text-purple-300 border border-purple-500/20">
                          {stage.patternIds?.length ?? 0}
                        </span>
                      </StudioLabel>
                    </div>
                    <div className="min-h-[76px] rounded-xl border border-purple-500/15 bg-[rgba(10,5,20,0.65)] p-2.5 flex flex-col justify-between gap-2">
                      {!stage.patternIds || stage.patternIds.length === 0 ? (
                        <p className="text-xs text-purple-300/40 italic py-1">No patterns added yet</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin">
                          {stage.patternIds.map((id) => (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-xs text-purple-200"
                            >
                              <span className="max-w-[140px] truncate" title={labels[id] || id}>
                                {labels[id] || id.slice(-6)}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeItem(index, "pattern", id)}
                                className="rounded p-0.5 text-purple-400/70 hover:bg-purple-500/20 hover:text-red-300 transition-colors"
                                title="Remove pattern"
                              >
                                <X size={11} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div>
                        <button
                          type="button"
                          onClick={() => setPicker({ index, type: "pattern" })}
                          className="inline-flex items-center gap-1 text-xs font-medium text-purple-300 hover:text-white rounded-md border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 hover:bg-purple-500/20 transition-colors"
                        >
                          <Plus size={11} /> Add Pattern
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Problems Container (if includeProblems) */}
                {includeProblems && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <StudioLabel className="mb-0 flex items-center gap-1.5 text-xs font-semibold text-purple-200">
                        <Code2 size={12} className="text-purple-400" />
                        <span>Problems</span>
                        <span className="rounded-full bg-purple-500/15 px-1.5 py-0.2 text-[10px] font-mono text-purple-300 border border-purple-500/20">
                          {stage.problemIds?.length ?? 0}
                        </span>
                      </StudioLabel>
                    </div>
                    <div className="min-h-[76px] rounded-xl border border-purple-500/15 bg-[rgba(10,5,20,0.65)] p-2.5 flex flex-col justify-between gap-2">
                      {!stage.problemIds || stage.problemIds.length === 0 ? (
                        <p className="text-xs text-purple-300/40 italic py-1">No problems added yet</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin">
                          {stage.problemIds.map((id) => (
                            <span
                              key={id}
                              className="inline-flex items-center gap-1 rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-xs text-purple-200"
                            >
                              <span className="max-w-[140px] truncate" title={labels[id] || id}>
                                {labels[id] || id.slice(-6)}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeItem(index, "problem", id)}
                                className="rounded p-0.5 text-purple-400/70 hover:bg-purple-500/20 hover:text-red-300 transition-colors"
                                title="Remove problem"
                              >
                                <X size={11} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      <div>
                        <button
                          type="button"
                          onClick={() => setPicker({ index, type: "problem" })}
                          className="inline-flex items-center gap-1 text-xs font-medium text-purple-300 hover:text-white rounded-md border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 hover:bg-purple-500/20 transition-colors"
                        >
                          <Plus size={11} /> Add Problem
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Missions Container */}
                <div className={cn("space-y-1.5", (includePatterns || includeProblems) ? "" : "md:col-span-2")}>
                  <div className="flex items-center justify-between">
                    <StudioLabel className="mb-0 flex items-center gap-1.5 text-xs font-semibold text-purple-200">
                      <Target size={12} className="text-purple-400" />
                      <span>Missions</span>
                      <span className="rounded-full bg-purple-500/15 px-1.5 py-0.2 text-[10px] font-mono text-purple-300 border border-purple-500/20">
                        {stage.missionIds?.length ?? 0}
                      </span>
                    </StudioLabel>
                  </div>
                  <div className="min-h-[76px] rounded-xl border border-purple-500/15 bg-[rgba(10,5,20,0.65)] p-2.5 flex flex-col justify-between gap-2">
                    {!stage.missionIds || stage.missionIds.length === 0 ? (
                      <p className="text-xs text-purple-300/40 italic py-1">No missions added yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto scrollbar-thin">
                        {stage.missionIds.map((id) => (
                          <span
                            key={id}
                            className="inline-flex items-center gap-1 rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-xs text-purple-200"
                          >
                            <span className="max-w-[140px] truncate" title={labels[id] || id}>
                              {labels[id] || id.slice(-6)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeItem(index, "mission", id)}
                              className="rounded p-0.5 text-purple-400/70 hover:bg-purple-500/20 hover:text-red-300 transition-colors"
                              title="Remove mission"
                            >
                              <X size={11} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div>
                      <button
                        type="button"
                        onClick={() => setPicker({ index, type: "mission" })}
                        className="inline-flex items-center gap-1 text-xs font-medium text-purple-300 hover:text-white rounded-md border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 hover:bg-purple-500/20 transition-colors"
                      >
                        <Plus size={11} /> Add Mission
                      </button>
                    </div>
                  </div>
                </div>

                {(includePatterns || includeProblems) && (
                  <FieldGroup className="md:col-span-2">
                    <StudioLabel className="text-xs">Description</StudioLabel>
                    <StudioTextarea
                      rows={2}
                      placeholder="Brief overview of concepts covered in this stage..."
                      value={stage.description ?? ""}
                      onChange={(e) => update(index, { description: e.target.value })}
                    />
                  </FieldGroup>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content Picker Modal */}
      {picker && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150"
          onClick={() => setPicker(null)}
        >
          <div
            className="w-full max-w-2xl studio-card-elevated border border-purple-500/25 shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-purple-500/15 px-6 py-4 bg-[rgba(18,10,34,0.7)]">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/25 shadow-[0_0_12px_rgba(168,85,247,0.2)]">
                  {picker.type === "topic" ? (
                    <BookOpen size={17} />
                  ) : picker.type === "pattern" ? (
                    <Boxes size={17} />
                  ) : picker.type === "problem" ? (
                    <Code2 size={17} />
                  ) : (
                    <Target size={17} />
                  )}
                </span>
                <div>
                  <h3 className="text-base font-semibold studio-text capitalize">
                    Select {picker.type}
                  </h3>
                  <p className="text-xs text-purple-300/60">
                    Adding to Stage {picker.index + 1}: {stages[picker.index]?.title || "Stage"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPicker(null)}
                className="grid size-8 place-items-center rounded-lg text-purple-300/60 hover:text-white hover:bg-purple-500/15 transition-colors"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-4 border-b border-purple-500/10 bg-[rgba(12,6,24,0.5)]">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-3 text-purple-400/60" />
                <StudioInput
                  autoFocus
                  placeholder={`Search ${picker.type}s by name or keyword...`}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="pl-10"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-2.5 text-xs text-purple-400/70 hover:text-purple-200"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-thin">
              {loadingResults ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-purple-300/60 text-sm">
                  <Loader2 size={24} className="animate-spin text-purple-400" />
                  <span>Searching {picker.type}s...</span>
                </div>
              ) : results.length === 0 ? (
                <EmptyState
                  icon={<Search size={26} className="text-purple-400/60" />}
                  title="No content found"
                  description={query ? `No results match "${query}"` : `No ${picker.type}s created yet.`}
                />
              ) : (
                results.map((item) => {
                  const stage = stages[picker.index];
                  const currentIds = (
                    picker.type === "topic"
                      ? stage.topicIds
                      : picker.type === "pattern"
                      ? stage.patternIds
                      : picker.type === "problem"
                      ? stage.problemIds
                      : stage.missionIds
                  ) ?? [];
                  const isSelected = currentIds.includes(item.id);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => addSelection(item)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 rounded-xl border p-3 text-left transition-all",
                        isSelected
                          ? "border-purple-500/40 bg-purple-500/15"
                          : "border-purple-500/15 bg-[rgba(12,6,24,0.6)] hover:border-purple-500/35 hover:bg-purple-500/10"
                      )}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-[14px] font-medium studio-text truncate">{item.title}</p>
                          {isSelected && (
                            <span className="inline-flex items-center gap-1 rounded bg-purple-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-purple-300 border border-purple-500/30">
                              <Check size={10} /> Added
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-xs studio-text-subtle">
                          <span className="capitalize">{item.type}</span>
                          {item.difficulty && (
                            <>
                              <span>•</span>
                              <DifficultyBadge difficulty={item.difficulty as any} />
                            </>
                          )}
                          {item.metadata && (
                            <>
                              <span>•</span>
                              <span>{item.metadata}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                            isSelected
                              ? "bg-purple-500/20 text-purple-300"
                              : "bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                          )}
                        >
                          {isSelected ? <Check size={12} /> : <Plus size={12} />}
                          {isSelected ? "Added" : "Select"}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export function RoadmapsWorkspace() {
  const [items, setItems] = useState<Roadmap[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<Roadmap>({ id: "", slug: "", name: "", version: 1, isPublished: false, stages: [], audience: { levels: [], goals: [], dailyMinutes: { min: 30, max: 180 } } });

  const selected = useMemo(() => items.find((item) => item.id === selectedId), [items, selectedId]);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/studio/roadmaps?q=${encodeURIComponent(search)}&status=${status}`)
      .then(parseResponse)
      .then((data) => setItems(data.roadmaps ?? []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [search, status]);

  useEffect(() => {
    if (selected) setForm(selected);
  }, [selected]);

  const save = async () => {
    setSaveState("saving");
    setError("");
    try {
      const payload = { ...form, slug: form.slug || slugify(form.name) };
      const response = await fetch(form.id ? `/api/studio/roadmaps/${form.id}` : "/api/studio/roadmaps", { method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await parseResponse(response);
      const saved = data.roadmap as Roadmap;
      setItems((prev) => form.id ? prev.map((item) => item.id === saved.id ? saved : item) : [saved, ...prev]);
      setSelectedId(saved.id);
      setForm(saved);
      setSaveState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaveState("error");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this roadmap? This cannot be undone.")) return;
    await fetch(`/api/studio/roadmaps/${id}`, { method: "DELETE" }).then(parseResponse);
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Roadmaps" description="Build visual, ordered progression templates from real MongoDB content." actions={<ActionButton onClick={() => { setSelectedId(null); setForm({ id: "", slug: "", name: "", version: 1, isPublished: false, stages: [], audience: { levels: [], goals: [], dailyMinutes: { min: 30, max: 180 } } }); }}><Plus size={14} /> New Roadmap</ActionButton>} />
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        <StudioCard><StudioCardContent className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search size={15} className="absolute left-3 top-2.5 text-muted-foreground" /><StudioInput className="pl-9" placeholder="Search roadmaps..." value={search} onChange={(e) => setSearch(e.target.value)} /></div><StudioSelect className="sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></StudioSelect></div>{loading ? <div className="h-40 animate-pulse rounded-lg bg-muted" /> : items.length === 0 ? <EmptyState icon={<Map size={28} />} title="No roadmaps yet" description="Create the first roadmap and connect existing topics and missions." /> : <Table><TableHead><Th>Name</Th><Th>Stages</Th><Th>Status</Th><Th /></TableHead><TableBody>{items.map((item) => <tr key={item.id} className={cn("cursor-pointer hover:bg-muted/40 transition-colors", selectedId === item.id && "bg-purple-500/15 border-l-2 border-purple-500")} onClick={() => setSelectedId(item.id)}><Td><div className="font-medium">{item.name}</div><div className="text-xs text-muted-foreground">{item.slug}</div></Td><Td>{item.stages?.length ?? 0}</Td><Td><StatusBadge status={item.isPublished ? "published" : "draft"} /></Td><Td><ActionButton size="sm" variant="destructive" onClick={(e) => { e.stopPropagation(); void remove(item.id); }}><Trash2 size={12} /></ActionButton></Td></tr>)}</TableBody></Table>}</StudioCardContent></StudioCard>
        <StudioCard><StudioCardContent className="space-y-5"><FieldGroup><StudioLabel required>Name</StudioLabel><StudioInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.slug || slugify(e.target.value) })} /></FieldGroup><FieldGroup><StudioLabel required>Slug</StudioLabel><StudioInput value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} /></FieldGroup><div className="grid grid-cols-2 gap-3"><FieldGroup><StudioLabel>Level tags</StudioLabel><StudioInput value={form.audience?.levels?.join(", ") ?? ""} onChange={(e) => setForm({ ...form, audience: { ...form.audience, levels: splitList(e.target.value) } })} /></FieldGroup><FieldGroup><StudioLabel>Goal tags</StudioLabel><StudioInput value={form.audience?.goals?.join(", ") ?? ""} onChange={(e) => setForm({ ...form, audience: { ...form.audience, goals: splitList(e.target.value) } })} /></FieldGroup></div><label className="flex items-center gap-2 text-sm studio-text cursor-pointer select-none"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} className="rounded accent-purple-500" /> Published</label><StageEditor stages={form.stages ?? []} onChange={(stages) => setForm({ ...form, stages })} /><div className="flex flex-wrap items-center gap-3"><ActionButton onClick={save} disabled={saveState === "saving"}>{saveState === "saving" && <Loader2 size={14} className="animate-spin" />} Save</ActionButton><StatusLine state={saveState} error={error} /></div></StudioCardContent></StudioCard>
      </div>
    </div>
  );
}

export function LearningPathsWorkspace() {
  const [items, setItems] = useState<LearningPath[]>([]);
  const [form, setForm] = useState<LearningPath>({
    id: "",
    slug: "",
    title: "",
    description: "",
    coverImage: "",
    estimatedMinutes: 600,
    difficulty: "beginner",
    audience: "",
    stages: [],
    tags: [],
    isPublished: false,
    isFeatured: false,
  });
  const [search, setSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "published" | "draft">("all");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [autosaveStatus, setAutosaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingPath, setLoadingPath] = useState(false);
  const [showImporter, setShowImporter] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast((curr) => (curr?.message === message ? null : curr)), 4500);
  };

  const isDirtyRef = useRef(false);
  const currentIdRef = useRef(form.id);
  const saveReqIdRef = useRef(0);
  const formRef = useRef(form);
  formRef.current = form;
  currentIdRef.current = form.id;

  const hydratePath = (raw: any): LearningPath => {
    const rawStages = Array.isArray(raw.stages) ? raw.stages : [];
    const stages: Stage[] = rawStages
      .map((s: any, idx: number) => ({
        key: s.key || `stage-${idx + 1}-${s.order ?? idx}`,
        order: typeof s.order === "number" ? s.order : idx,
        title: s.title || `Stage ${idx + 1}`,
        description: s.description || "",
        topicIds: Array.isArray(s.topicIds) ? s.topicIds.map(String) : [],
        patternIds: Array.isArray(s.patternIds) ? s.patternIds.map(String) : [],
        problemIds: Array.isArray(s.problemIds) ? s.problemIds.map(String) : [],
        missionIds: Array.isArray(s.missionIds) ? s.missionIds.map(String) : [],
        estimatedMinutes: typeof s.estimatedMinutes === "number" ? s.estimatedMinutes : 60,
      }))
      .sort((a: Stage, b: Stage) => a.order - b.order);

    return {
      id: raw.id || String(raw._id || ""),
      slug: raw.slug || "",
      title: raw.title || "",
      description: raw.description || "",
      coverImage: raw.coverImage || "",
      estimatedMinutes: typeof raw.estimatedMinutes === "number" ? raw.estimatedMinutes : 600,
      difficulty: raw.difficulty || "beginner",
      audience: raw.audience || "",
      stages,
      tags: Array.isArray(raw.tags) ? raw.tags : [],
      isPublished: Boolean(raw.isPublished),
      isFeatured: Boolean(raw.isFeatured),
    };
  };

  const resetForm = () => {
    isDirtyRef.current = false;
    currentIdRef.current = "";
    setForm({
      id: "",
      slug: "",
      title: "",
      description: "",
      coverImage: "",
      estimatedMinutes: 600,
      difficulty: "beginner",
      audience: "",
      stages: [],
      tags: [],
      isPublished: false,
      isFeatured: false,
    });
    setSaveState("idle");
    setAutosaveStatus("idle");
    setError("");
  };

  const fetchPaths = () => {
    setLoading(true);
    fetch(`/api/studio/learning-paths?q=${encodeURIComponent(search)}&difficulty=${difficulty}`)
      .then(parseResponse)
      .then((data) => {
        const list = (data.paths ?? []).map((p: any) => hydratePath(p));
        setItems(list);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPaths();
  }, [search, difficulty]);

  const openPath = async (id: string) => {
    if (!id) return;
    setLoadingPath(true);
    setError("");
    try {
      const res = await fetch(`/api/studio/learning-paths/${id}`);
      const data = await parseResponse(res);
      if (data.path) {
        const hydrated = hydratePath(data.path);
        currentIdRef.current = hydrated.id;
        formRef.current = hydrated;
        setForm(hydrated);
        isDirtyRef.current = false;
        setSaveState("idle");
        setAutosaveStatus("saved");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load learning path");
    } finally {
      setLoadingPath(false);
    }
  };

  const updateForm = (patch: Partial<LearningPath>) => {
    isDirtyRef.current = true;
    setForm((prev) => ({ ...prev, ...patch }));
  };

  // Debounced autosave effect
  useEffect(() => {
    if (!isDirtyRef.current) return;
    // For brand new paths that have not been saved yet, wait until at least title is entered
    if (!currentIdRef.current && !form.title.trim()) return;

    setAutosaveStatus("saving");
    const timer = setTimeout(async () => {
      const reqId = ++saveReqIdRef.current;
      try {
        const targetId = currentIdRef.current;
        const currentData = formRef.current;
        const payload = {
          ...currentData,
          slug: currentData.slug || slugify(currentData.title) || `path-${Date.now()}`,
          stages: (currentData.stages ?? []).map((s, i) => ({
            ...s,
            order: i,
            topicIds: s.topicIds ?? [],
            patternIds: s.patternIds ?? [],
            problemIds: s.problemIds ?? [],
            missionIds: s.missionIds ?? [],
          })),
        };

        const url = targetId ? `/api/studio/learning-paths/${targetId}` : "/api/studio/learning-paths";
        const method = targetId ? "PATCH" : "POST";

        const res = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await parseResponse(res);

        if (reqId !== saveReqIdRef.current) return;

        const saved = hydratePath(data.path);
        currentIdRef.current = saved.id;
        isDirtyRef.current = false;
        setAutosaveStatus("saved");

        setForm((prev) => ({
          ...prev,
          id: saved.id,
          slug: saved.slug,
          stages: saved.stages,
        }));

        setItems((prev) => {
          const exists = prev.some((p) => p.id === saved.id);
          return exists ? prev.map((p) => (p.id === saved.id ? saved : p)) : [saved, ...prev];
        });
      } catch (err) {
        if (reqId === saveReqIdRef.current) {
          setAutosaveStatus("error");
        }
      }
    }, 1200);

    return () => clearTimeout(timer);
  }, [form]);

  const togglePublish = async () => {
    const nextPublished = !form.isPublished;
    updateForm({ isPublished: nextPublished });
    if (form.id) {
      setSaveState("saving");
      try {
        const res = await fetch(`/api/studio/learning-paths/${form.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isPublished: nextPublished }),
        });
        const data = await parseResponse(res);
        const saved = hydratePath(data.path);
        setForm(saved);
        setItems((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
        setSaveState("success");
        setAutosaveStatus("saved");
        showToast(
          nextPublished
            ? `✓ Path "${saved.title || "Untitled"}" published! Live on student portal.`
            : `✓ Path "${saved.title || "Untitled"}" moved to drafts.`
        );
        fetchPaths();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to toggle publish");
        setSaveState("error");
      }
    } else {
      showToast(nextPublished ? "Marked as Published. Click Save Changes to apply." : "Marked as Draft.");
    }
  };

  const save = async () => {
    setSaveState("saving");
    setError("");
    try {
      const targetId = currentIdRef.current || form.id;
      const payload = {
        ...form,
        slug: form.slug || slugify(form.title) || `path-${Date.now()}`,
        stages: (form.stages ?? []).map((s, i) => ({
          ...s,
          order: i,
          topicIds: s.topicIds ?? [],
          patternIds: s.patternIds ?? [],
          problemIds: s.problemIds ?? [],
          missionIds: s.missionIds ?? [],
        })),
      };

      const url = targetId ? `/api/studio/learning-paths/${targetId}` : "/api/studio/learning-paths";
      const method = targetId ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await parseResponse(response);
      const saved = hydratePath(data.path);
      currentIdRef.current = saved.id;
      isDirtyRef.current = false;
      setItems((prev) => (targetId ? prev.map((item) => (item.id === saved.id ? saved : item)) : [saved, ...prev]));
      setForm(saved);
      setSaveState("success");
      setAutosaveStatus("saved");
      showToast(
        saved.isPublished
          ? `✓ "${saved.title}" saved & published successfully!`
          : `✓ "${saved.title}" changes saved successfully!`
      );
      fetchPaths();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaveState("error");
      setAutosaveStatus("error");
      showToast(err instanceof Error ? err.message : "Save failed", "error");
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (statusFilter === "published" && !item.isPublished) return false;
      if (statusFilter === "draft" && item.isPublished) return false;
      return true;
    });
  }, [items, statusFilter]);

  const publishedCount = useMemo(() => items.filter((i) => i.isPublished).length, [items]);
  const draftCount = useMemo(() => items.filter((i) => !i.isPublished).length, [items]);

  const handleApplyImport = (data: LearningPathImportResult) => {
    const importedStages: Stage[] = data.stages.map((s, i) => ({
      key: `imported-${i}-${slugify(s.title)}`,
      order: i,
      title: s.title,
      description: s.description,
      topicIds: s.topicIds,
      patternIds: s.patternIds,
      problemIds: s.problemIds,
      missionIds: s.missionIds,
      estimatedMinutes: s.estimatedMinutes,
    }));

    // Reset form ID so it creates a new path (unless currently editing)
    isDirtyRef.current = true;
    setForm((prev) => ({
      ...prev,
      title: data.title || prev.title,
      slug: data.slug || prev.slug || slugify(data.title),
      description: data.description || prev.description,
      difficulty: (data.difficulty as LearningPath["difficulty"]) || prev.difficulty,
      estimatedMinutes: data.estimatedMinutes || prev.estimatedMinutes,
      audience: data.audience || prev.audience,
      tags: data.tags.length > 0 ? data.tags : prev.tags,
      stages: importedStages,
    }));
    setAutosaveStatus("saving");
  };

  return (
    <div className="space-y-6">
      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 text-sm font-medium backdrop-blur-md",
            toast.type === "success"
              ? "bg-emerald-950/95 border-emerald-500/40 text-emerald-200 shadow-emerald-950/60"
              : "bg-rose-950/95 border-rose-500/40 text-rose-200 shadow-rose-950/60"
          )}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle size={18} className="text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      <PageHeader
        title="Learning Paths"
        description="Curate goal-based learning journeys from topics, patterns, missions, problems, and roadmap references."
        actions={
          <div className="flex items-center gap-2">
            <ActionButton variant="outline" onClick={() => setShowImporter(true)}>
              <Sparkles size={14} /> AI Import Path
            </ActionButton>
            <ActionButton onClick={resetForm}>
              <Plus size={14} /> New Path
            </ActionButton>
          </div>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
        {/* Left Column: Paths List */}
        <StudioCard className="h-fit">
          <StudioCardContent className="space-y-4">
            {/* Status Filter Tabs */}
            <div className="flex rounded-lg border border-purple-500/20 bg-purple-950/20 p-1 text-xs font-medium">
              <button
                type="button"
                onClick={() => setStatusFilter("all")}
                className={cn(
                  "flex-1 rounded-md py-1 px-2.5 text-center transition-colors",
                  statusFilter === "all"
                    ? "bg-purple-500/25 text-purple-200 shadow-sm font-semibold"
                    : "text-purple-300/60 hover:text-purple-200"
                )}
              >
                All <span className="text-[10px] opacity-70">({items.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("published")}
                className={cn(
                  "flex-1 rounded-md py-1 px-2.5 text-center transition-colors",
                  statusFilter === "published"
                    ? "bg-purple-500/25 text-purple-200 shadow-sm font-semibold"
                    : "text-purple-300/60 hover:text-purple-200"
                )}
              >
                Published <span className="text-[10px] opacity-70">({publishedCount})</span>
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("draft")}
                className={cn(
                  "flex-1 rounded-md py-1 px-2.5 text-center transition-colors",
                  statusFilter === "draft"
                    ? "bg-purple-500/25 text-purple-200 shadow-sm font-semibold"
                    : "text-purple-300/60 hover:text-purple-200"
                )}
              >
                Drafts <span className="text-[10px] opacity-70">({draftCount})</span>
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <StudioInput
                placeholder="Search learning paths..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <StudioSelect
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
              >
                <option value="all">All difficulties</option>
                <option value="beginner">Beginner</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="advanced">Advanced</option>
              </StudioSelect>
            </div>
            {loading ? (
              <div className="h-40 animate-pulse rounded-lg bg-purple-500/5 border border-purple-500/10" />
            ) : filteredItems.length === 0 ? (
              <EmptyState
                icon={<Layers size={28} className="text-purple-400" />}
                title={statusFilter === "draft" ? "No drafts found" : statusFilter === "published" ? "No published paths" : "No learning paths yet"}
                description={
                  statusFilter === "draft"
                    ? "Any path saved as unpublished will appear here for you to continue editing."
                    : "Create a path for beginners, interviews, companies, or mastery tracks."
                }
              />
            ) : (
              <Table>
                <TableHead>
                  <Th>Path</Th>
                  <Th>Difficulty</Th>
                  <Th>Status</Th>
                </TableHead>
                <TableBody>
                  {filteredItems.map((item) => (
                    <tr
                      key={item.id}
                      className={cn(
                        "cursor-pointer hover:bg-purple-500/10 transition-colors group",
                        form.id === item.id && "bg-purple-500/15 border-l-2 border-purple-500"
                      )}
                      onClick={() => openPath(item.id)}
                    >
                      <Td>
                        <div className="flex items-center gap-2.5">
                          {item.coverImage && !item.coverImage.startsWith("C:") && !item.coverImage.startsWith("file:") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={item.coverImage}
                              alt=""
                              className="w-9 h-9 rounded-md object-cover bg-black/50 border border-purple-500/20 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-md bg-purple-500/10 border border-purple-500/20 flex items-center justify-center shrink-0 text-purple-400">
                              <Layers size={15} />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-medium studio-text truncate max-w-[130px]" title={item.title}>
                              {item.title || "Untitled draft"}
                            </div>
                            <div className="text-[11px] studio-text-muted">
                              {item.stages?.length ?? 0} stages • {item.stages?.reduce((acc, s) => acc + (s.problemIds?.length || 0), 0)} problems
                            </div>
                          </div>
                        </div>
                      </Td>
                      <Td>
                        <DifficultyBadge difficulty={item.difficulty} />
                      </Td>
                      <Td>
                        <div className="flex flex-col gap-1 items-start">
                          <StatusBadge status={item.isPublished ? "published" : "draft"} />
                          {!item.isPublished && (
                            <span className="text-[10px] font-medium text-purple-400 group-hover:text-purple-200">
                              Continue Editing →
                            </span>
                          )}
                        </div>
                      </Td>
                    </tr>
                  ))}
                </TableBody>
              </Table>
            )}
          </StudioCardContent>
        </StudioCard>

        {/* Right Column: Path Editor */}
        <StudioCard>
          <StudioCardContent className="space-y-5">
            {/* Editor Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-purple-500/10 pb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold studio-text">
                    {form.id ? form.title || "Edit Learning Path" : "New Learning Path"}
                  </h2>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                      form.isPublished
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                    )}
                  >
                    {form.isPublished ? "Published" : "Draft"}
                  </span>
                  {/* Autosave Status Badge */}
                  {autosaveStatus === "saving" && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[11px] text-purple-300 border border-purple-500/20">
                      <Loader2 size={11} className="animate-spin text-purple-400" />
                      Saving...
                    </span>
                  )}
                  {autosaveStatus === "saved" && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] text-emerald-300 border border-emerald-500/20">
                      <Check size={11} className="text-emerald-400" />
                      ✓ Saved
                    </span>
                  )}
                  {autosaveStatus === "error" && (
                    <span
                      className="inline-flex items-center gap-1 rounded-md bg-rose-500/10 px-2 py-0.5 text-[11px] text-rose-300 border border-rose-500/20"
                      title="Draft could not be saved to server"
                    >
                      <AlertTriangle size={11} className="text-rose-400" />
                      ⚠ Save failed
                    </span>
                  )}
                </div>
                <p className="text-xs studio-text-muted mt-0.5">
                  {form.id ? `Slug: /learning-paths/${form.slug}` : "Fill in details and define progression stages"}
                </p>
              </div>
              {/* Header Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                {form.isPublished && form.slug && (
                  <a
                    href={`/learning-paths/${form.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-xs text-purple-300 hover:bg-purple-500/20 hover:text-white transition-colors"
                  >
                    <ExternalLink size={12} /> View in App
                  </a>
                )}

                <ActionButton
                  type="button"
                  variant={form.isPublished ? "outline" : "default"}
                  size="sm"
                  onClick={togglePublish}
                >
                  {form.isPublished ? "Unpublish Track" : "Publish Track"}
                </ActionButton>

                <ActionButton
                  type="button"
                  size="sm"
                  onClick={save}
                  disabled={saveState === "saving"}
                >
                  {saveState === "saving" ? (
                    <Loader2 size={12} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={12} />
                  )}
                  {form.id ? "Save Changes" : "Create Path"}
                </ActionButton>

                {form.id && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-1 rounded-md border border-purple-500/20 bg-purple-500/10 px-2.5 py-1 text-xs text-purple-300 hover:bg-purple-500/20 hover:text-white transition-colors"
                  >
                    <Plus size={12} /> New
                  </button>
                )}
              </div>
            </div>

            {loadingPath ? (
              <div className="py-12 flex flex-col items-center justify-center gap-3 text-purple-300/60 text-sm">
                <Loader2 size={24} className="animate-spin text-purple-400" />
                <span>Loading learning path...</span>
              </div>
            ) : (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <FieldGroup>
                    <StudioLabel required>Title</StudioLabel>
                    <StudioInput
                      placeholder="e.g. Complete DSA Mastery Track"
                      value={form.title}
                      onChange={(e) =>
                        updateForm({
                          title: e.target.value,
                          slug: form.slug || slugify(e.target.value),
                        })
                      }
                    />
                  </FieldGroup>
                  <FieldGroup>
                    <StudioLabel required>Slug</StudioLabel>
                    <StudioInput
                      placeholder="complete-dsa-mastery"
                      value={form.slug}
                      onChange={(e) => updateForm({ slug: slugify(e.target.value) })}
                    />
                  </FieldGroup>
                </div>

                <FieldGroup>
                  <StudioLabel>Description</StudioLabel>
                  <StudioTextarea
                    rows={3}
                    placeholder="Describe what learners will achieve and prerequisites..."
                    value={form.description}
                    onChange={(e) => updateForm({ description: e.target.value })}
                  />
                </FieldGroup>

                <div className="grid gap-4 md:grid-cols-2">
                  <FieldGroup>
                    <StudioLabel>Difficulty</StudioLabel>
                    <StudioSelect
                      value={form.difficulty}
                      onChange={(e) =>
                        updateForm({ difficulty: e.target.value as LearningPath["difficulty"] })
                      }
                    >
                      <option value="beginner">Beginner</option>
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                      <option value="advanced">Advanced</option>
                    </StudioSelect>
                  </FieldGroup>
                  <FieldGroup>
                    <StudioLabel>Estimated minutes</StudioLabel>
                    <StudioInput
                      type="number"
                      min={30}
                      value={form.estimatedMinutes}
                      onChange={(e) => updateForm({ estimatedMinutes: Number(e.target.value) })}
                    />
                  </FieldGroup>
                </div>

                <CoverImageUploader
                  value={form.coverImage}
                  onChange={(coverImage) => updateForm({ coverImage })}
                />

                <div className="grid gap-4 md:grid-cols-2">
                  <FieldGroup>
                    <StudioLabel>Target audience</StudioLabel>
                    <StudioInput
                      placeholder="e.g. Beginners, Software Engineers"
                      value={form.audience}
                      onChange={(e) => updateForm({ audience: e.target.value })}
                    />
                  </FieldGroup>
                  <FieldGroup>
                    <StudioLabel>Tags</StudioLabel>
                    <StudioInput
                      placeholder="arrays, trees, dynamic-programming"
                      value={form.tags.join(", ")}
                      onChange={(e) => updateForm({ tags: splitList(e.target.value) })}
                    />
                  </FieldGroup>
                </div>

                <div className="flex gap-5 text-sm py-1">
                  <label className="flex items-center gap-2 cursor-pointer studio-text select-none text-xs sm:text-sm">
                    <input
                      type="checkbox"
                      checked={form.isPublished}
                      onChange={(e) => updateForm({ isPublished: e.target.checked })}
                      className="rounded accent-purple-500"
                    />
                    Published
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer studio-text select-none text-xs sm:text-sm">
                    <input
                      type="checkbox"
                      checked={form.isFeatured}
                      onChange={(e) => updateForm({ isFeatured: e.target.checked })}
                      className="rounded accent-purple-500"
                    />
                    Featured
                  </label>
                </div>

                {/* Stage Editor with Problems enabled */}
                <StageEditor
                  includePatterns
                  includeProblems
                  stages={form.stages ?? []}
                  onChange={(stages) => updateForm({ stages })}
                />

                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-purple-500/10">
                  <ActionButton onClick={save} disabled={saveState === "saving"}>
                    {saveState === "saving" && <Loader2 size={14} className="animate-spin" />}
                    {form.id ? "Save Changes" : "Create Learning Path"}
                  </ActionButton>
                  <StatusLine state={saveState} error={error} />
                </div>
              </>
            )}
          </StudioCardContent>
        </StudioCard>
      </div>

      {/* Smart Importer Modal */}
      <LearningPathImportModal
        isOpen={showImporter}
        onClose={() => setShowImporter(false)}
        onPopulate={handleApplyImport}
      />
    </div>
  );
}

export function AchievementsWorkspace() {
  const [items, setItems] = useState<Achievement[]>([]);
  const [form, setForm] = useState<Achievement>({ id: "", key: "", title: "", description: "", icon: "Trophy", category: "milestone", xpReward: 100, criteria: {}, isActive: true });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [criteriaText, setCriteriaText] = useState("{}");

  useEffect(() => {
    fetch(`/api/studio/achievements?q=${encodeURIComponent(search)}&category=${category}`)
      .then(parseResponse).then((data) => setItems(data.achievements ?? [])).catch((err) => setError(err.message));
  }, [search, category]);

  const select = (achievement: Achievement) => {
    setForm(achievement);
    setCriteriaText(JSON.stringify(achievement.criteria ?? {}, null, 2));
  };

  const save = async () => {
    setSaveState("saving");
    try {
      const criteria = JSON.parse(criteriaText || "{}");
      const payload = { ...form, key: form.key || slugify(form.title).replaceAll("-", "_"), criteria };
      const response = await fetch(form.id ? `/api/studio/achievements/${form.id}` : "/api/studio/achievements", { method: form.id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await parseResponse(response);
      const saved = data.achievement as Achievement;
      setItems((prev) => form.id ? prev.map((item) => item.id === saved.id ? saved : item) : [saved, ...prev]);
      select(saved);
      setSaveState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaveState("error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Achievements" description="Manage badges and reward criteria connected to platform activity." actions={<ActionButton onClick={() => { setForm({ id: "", key: "", title: "", description: "", icon: "Trophy", category: "milestone", xpReward: 100, criteria: {}, isActive: true }); setCriteriaText("{}"); }}><Plus size={14} /> New Achievement</ActionButton>} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <StudioCard><StudioCardContent className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row"><StudioInput placeholder="Search achievements..." value={search} onChange={(e) => setSearch(e.target.value)} /><StudioSelect className="sm:w-44" value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option><option value="consistency">Consistency</option><option value="practice">Practice</option><option value="mastery">Mastery</option><option value="revision">Revision</option><option value="milestone">Milestone</option></StudioSelect></div>{items.length === 0 ? <EmptyState icon={<Award size={28} />} title="No achievements yet" description="Create a badge with clear criteria and XP reward." /> : <Table><TableHead><Th>Achievement</Th><Th>Reward</Th><Th>Status</Th></TableHead><TableBody>{items.map((item) => <tr key={item.id} className="cursor-pointer hover:bg-muted/40" onClick={() => select(item)}><Td><div className="font-medium">{item.title}</div><div className="text-xs text-muted-foreground">{item.category}</div></Td><Td>{item.xpReward} XP</Td><Td><StatusBadge status={item.isActive ? "active" : "archived"} /></Td></tr>)}</TableBody></Table>}</StudioCardContent></StudioCard>
        <StudioCard><StudioCardContent className="space-y-5"><FieldGroup><StudioLabel required>Name</StudioLabel><StudioInput value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, key: form.key || slugify(e.target.value).replaceAll("-", "_") })} /></FieldGroup><FieldGroup><StudioLabel required>Key</StudioLabel><StudioInput value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })} /></FieldGroup><FieldGroup><StudioLabel>Description</StudioLabel><StudioTextarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></FieldGroup><div className="grid grid-cols-2 gap-4"><FieldGroup><StudioLabel>Icon label</StudioLabel><StudioInput value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} /></FieldGroup><FieldGroup><StudioLabel>XP reward</StudioLabel><StudioInput type="number" min={0} value={form.xpReward} onChange={(e) => setForm({ ...form, xpReward: Number(e.target.value) })} /></FieldGroup></div><FieldGroup><StudioLabel>Category</StudioLabel><StudioSelect value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Achievement["category"] })}><option value="consistency">Consistency</option><option value="practice">Practice</option><option value="mastery">Mastery</option><option value="revision">Revision</option><option value="milestone">Milestone</option></StudioSelect></FieldGroup><FieldGroup><StudioLabel>Criteria JSON</StudioLabel><StudioTextarea rows={7} className="font-mono text-xs" value={criteriaText} onChange={(e) => setCriteriaText(e.target.value)} /></FieldGroup><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} /> Active</label><div className="flex flex-wrap items-center gap-3"><ActionButton onClick={save} disabled={saveState === "saving"}>{saveState === "saving" && <Loader2 size={14} className="animate-spin" />} Save</ActionButton><StatusLine state={saveState} error={error} /></div></StudioCardContent></StudioCard>
      </div>
    </div>
  );
}
