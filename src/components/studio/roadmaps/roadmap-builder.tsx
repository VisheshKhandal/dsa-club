"use client";

import "@xyflow/react/dist/style.css";

import { useCallback, useEffect, useMemo, useState } from "react";
import { addEdge, Background, Controls, Handle, MiniMap, Position, ReactFlow, useEdgesState, useNodesState, type Connection, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { Check, Eye, GitBranch, Loader2, Plus, RefreshCcw, Search, Sparkles, Trash2 } from "lucide-react";
import { ActionButton, EmptyState, FieldGroup, PageHeader, StatusBadge, StudioCard, StudioCardContent, StudioInput, StudioLabel, StudioSelect, Table, TableBody, TableHead, Td, Th } from "@/components/studio/ui";

type SaveState = "idle" | "saving" | "success" | "error";
type ContentType = "topic" | "pattern" | "mission" | "problem" | "milestone";
type RoadmapNodeData = { type: ContentType; refId: string | null; title: string; description: string; estimatedMinutes: number; order: number; previewState?: "completed" | "current" | "available" | "locked" | "upcoming" };
type RoadmapFlowNode = Node<RoadmapNodeData, "roadmap">;
type RoadmapTemplate = { id: string; slug: string; name: string; version: number; isPublished: boolean; audience?: { levels?: string[]; goals?: string[]; dailyMinutes?: { min?: number; max?: number } }; stages?: unknown[]; nodes?: PersistedNode[]; edges?: PersistedEdge[] };
type PersistedNode = RoadmapNodeData & { key: string; position: { x: number; y: number }; unlockRule: "all_prerequisites" | "any_prerequisite" | "manual" };
type PersistedEdge = { key: string; source: string; target: string; type: "prerequisite" | "progression" | "dependency" };
type ContentResult = { id: string; type: ContentType; title: string; difficulty?: string; metadata?: string };

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const nodeColors: Record<ContentType, string> = { topic: "border-blue-500/40 bg-blue-500/10", pattern: "border-violet-500/40 bg-violet-500/10", mission: "border-green-500/40 bg-green-500/10", problem: "border-amber-500/40 bg-amber-500/10", milestone: "border-zinc-500/40 bg-zinc-500/10" };

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function RoadmapNode({ data, selected }: NodeProps<RoadmapFlowNode>) {
  const state = data.previewState;
  return (
    <div className={`w-64 rounded-lg border bg-card p-4 shadow-sm transition ${nodeColors[data.type]} ${selected ? "ring-2 ring-primary" : ""}`}>
      <Handle type="target" position={Position.Top} />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{data.title}</p>
          <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{data.type}</p>
        </div>
        {state && <span className="rounded-full border border-purple-500/25 bg-purple-500/15 px-2 py-0.5 text-[10px] capitalize text-purple-300">{state}</span>}
      </div>
      <p className="mt-3 line-clamp-2 text-xs leading-5 text-muted-foreground">{data.description || `${data.estimatedMinutes} minutes`}</p>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { roadmap: RoadmapNode };

function toFlowNodes(nodes: PersistedNode[] = [], preview = false): RoadmapFlowNode[] {
  return nodes.map((node, index) => ({
    id: node.key,
    type: "roadmap",
    position: node.position,
    data: { ...node, previewState: preview ? (index === 0 ? "current" : index < 3 ? "available" : "locked") : undefined },
  }));
}

function toFlowEdges(edges: PersistedEdge[] = []): Edge[] {
  return edges.map((edge) => ({ id: edge.key, source: edge.source, target: edge.target, animated: true, label: edge.type, type: "smoothstep" }));
}

function toPersistedNodes(nodes: RoadmapFlowNode[]): PersistedNode[] {
  return nodes.map((node, order) => ({ key: node.id, ...node.data, order, position: node.position, unlockRule: "all_prerequisites" }));
}

function toPersistedEdges(edges: Edge[]): PersistedEdge[] {
  return edges.map((edge) => ({ key: edge.id, source: edge.source, target: edge.target, type: "progression" }));
}

function SaveStatus({ state, error }: { state: SaveState; error: string }) {
  if (state === "saving") return <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Saving...</span>;
  if (state === "success") return <span className="inline-flex items-center gap-1 text-sm text-green-600"><Check size={14} /> Saved successfully</span>;
  if (state === "error") return <span className="text-sm text-destructive">{error || "Save failed. Your graph is still preserved."}</span>;
  return null;
}

export function RoadmapBuilder() {
  const [roadmaps, setRoadmaps] = useState<RoadmapTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  const [levels, setLevels] = useState("");
  const [goals, setGoals] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState<RoadmapFlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerType, setPickerType] = useState<ContentType | "all">("all");
  const [contentQuery, setContentQuery] = useState("");
  const [content, setContent] = useState<ContentResult[]>([]);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState(false);
  const [generating, setGenerating] = useState(false);

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId), [nodes, selectedNodeId]);

  const loadRoadmaps = useCallback(() => {
    fetch("/api/studio/roadmaps").then(parseResponse).then((data) => setRoadmaps(data.roadmaps ?? [])).catch((err) => setError(err.message));
  }, []);

  useEffect(loadRoadmaps, [loadRoadmaps]);

  useEffect(() => {
    fetch(`/api/studio/roadmaps/content?q=${encodeURIComponent(contentQuery)}&type=${pickerType}`)
      .then(parseResponse).then((data) => setContent(data.results ?? [])).catch((err) => setError(err.message));
  }, [contentQuery, pickerType]);

  const selectRoadmap = (roadmap: RoadmapTemplate) => {
    setSelectedId(roadmap.id);
    setName(roadmap.name);
    setSlug(roadmap.slug);
    setIsPublished(roadmap.isPublished);
    setLevels(roadmap.audience?.levels?.join(", ") ?? "");
    setGoals(roadmap.audience?.goals?.join(", ") ?? "");
    setNodes(toFlowNodes(roadmap.nodes ?? [], preview));
    setEdges(toFlowEdges(roadmap.edges ?? []));
    setSelectedNodeId(null);
  };

  const newRoadmap = () => {
    setSelectedId(null);
    setName("");
    setSlug("");
    setIsPublished(false);
    setLevels("");
    setGoals("");
    setNodes([]);
    setEdges([]);
  };

  const onConnect = useCallback((connection: Connection) => {
    setEdges((current) => addEdge({ ...connection, id: `edge-${connection.source}-${connection.target}`, type: "smoothstep", animated: true, label: "progression" }, current));
  }, [setEdges]);

  const addContentNode = (item: ContentResult) => {
    const key = `${item.type}-${item.id}-${Date.now()}`;
    setNodes((current) => [...current, { id: key, type: "roadmap", position: { x: 120 + (current.length % 3) * 300, y: 80 + Math.floor(current.length / 3) * 180 }, data: { type: item.type, refId: item.id, title: item.title, description: item.metadata ?? "", estimatedMinutes: 60, order: current.length } }]);
    setPickerOpen(false);
  };

  const addMilestone = () => {
    const key = `milestone-${Date.now()}`;
    setNodes((current) => [...current, { id: key, type: "roadmap", position: { x: 180, y: 80 + current.length * 120 }, data: { type: "milestone", refId: null, title: "New milestone", description: "Stage checkpoint", estimatedMinutes: 0, order: current.length } }]);
  };

  const resetLayout = () => {
    setNodes((current) => current.map((node, index) => ({ ...node, position: { x: 160 + (index % 2) * 320, y: 80 + index * 140 } })));
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const data = await fetch("/api/studio/roadmaps/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ target: goals || "Interview Preparation", difficulty: "medium", goal: name || "DSA Foundations", estimatedMinutes: 900 }) }).then(parseResponse);
      setNodes(toFlowNodes(data.nodes ?? [], preview));
      setEdges(toFlowEdges(data.edges ?? []));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    setSaveState("saving");
    setError("");
    try {
      const persistedNodes = toPersistedNodes(nodes);
      const persistedEdges = toPersistedEdges(edges);
      const stages = persistedNodes.filter((node) => node.type === "topic" || node.type === "mission").map((node, order) => ({
        key: node.key,
        title: node.title,
        order,
        topicIds: node.type === "topic" && node.refId ? [node.refId] : [],
        missionIds: node.type === "mission" && node.refId ? [node.refId] : [],
        estimatedMinutes: Math.max(5, node.estimatedMinutes || 60),
      }));
      const payload = { slug: slug || slugify(name), name, version: 1, isPublished, audience: { levels: splitList(levels), goals: splitList(goals), dailyMinutes: { min: 30, max: 180 } }, stages, nodes: persistedNodes, edges: persistedEdges };
      const response = await fetch(selectedId ? `/api/studio/roadmaps/${selectedId}` : "/api/studio/roadmaps", { method: selectedId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await parseResponse(response);
      selectRoadmap(data.roadmap);
      loadRoadmaps();
      setSaveState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaveState("error");
    }
  };

  const removeSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((current) => current.filter((node) => node.id !== selectedNodeId));
    setEdges((current) => current.filter((edge) => edge.source !== selectedNodeId && edge.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  useEffect(() => {
    setNodes((current) => current.map((node, index) => ({ ...node, data: { ...node.data, previewState: preview ? (index === 0 ? "current" : index < 3 ? "available" : "locked") : undefined } })));
  }, [preview, setNodes]);

  return (
    <div className="space-y-6">
      <PageHeader title="Roadmap Builder" description="Create visual learning journeys from real MongoDB content without entering ObjectIds." actions={<><ActionButton variant="outline" onClick={newRoadmap}>New</ActionButton><ActionButton variant="outline" onClick={() => setPreview((value) => !value)}><Eye size={14} /> {preview ? "Edit" : "Preview"}</ActionButton><ActionButton onClick={save} disabled={saveState === "saving" || !name.trim()}>{saveState === "saving" && <Loader2 size={14} className="animate-spin" />} Save</ActionButton></>} />
      <div className="grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        <StudioCard><StudioCardContent className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-base font-semibold">Roadmaps</h2><SaveStatus state={saveState} error={error} /></div>{roadmaps.length === 0 ? <EmptyState icon={<GitBranch size={24} />} title="No roadmaps" description="Create or generate a visual roadmap." /> : <div className="space-y-2">{roadmaps.map((roadmap) => <button key={roadmap.id} onClick={() => selectRoadmap(roadmap)} className={`w-full rounded-md border p-3 text-left transition hover:bg-accent ${selectedId === roadmap.id ? "border-primary bg-primary/5" : ""}`}><div className="text-sm font-medium">{roadmap.name}</div><div className="mt-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">{roadmap.nodes?.length ?? roadmap.stages?.length ?? 0} nodes</span><StatusBadge status={roadmap.isPublished ? "published" : "draft"} /></div></button>)}</div>}</StudioCardContent></StudioCard>

        <StudioCard><StudioCardContent className="space-y-4 p-4"><div className="flex flex-wrap items-center gap-2"><ActionButton onClick={() => setPickerOpen(true)}><Plus size={14} /> Add Content</ActionButton><ActionButton variant="outline" onClick={addMilestone}>Milestone</ActionButton><ActionButton variant="outline" onClick={generate} disabled={generating}>{generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Generate Roadmap</ActionButton><ActionButton variant="outline" onClick={resetLayout}><RefreshCcw size={14} /> Reset Layout</ActionButton></div><div className="h-[680px] overflow-hidden rounded-lg border border-purple-500/20 bg-[#06010e]">{nodes.length === 0 ? <div className="grid h-full place-items-center"><EmptyState icon={<GitBranch size={28} />} title="Start the visual roadmap" description="Add content from search or generate a draft from existing MongoDB content." action={<ActionButton onClick={() => setPickerOpen(true)}>Add Content</ActionButton>} /></div> : <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} nodeTypes={nodeTypes} onNodeClick={(_, node) => setSelectedNodeId(node.id)} fitView><Background /><MiniMap pannable zoomable /><Controls /></ReactFlow>}</div></StudioCardContent></StudioCard>

        <StudioCard><StudioCardContent className="space-y-5"><FieldGroup><StudioLabel required>Name</StudioLabel><StudioInput value={name} onChange={(e) => { setName(e.target.value); setSlug((current) => current || slugify(e.target.value)); }} /></FieldGroup><FieldGroup><StudioLabel required>Slug</StudioLabel><StudioInput value={slug} onChange={(e) => setSlug(slugify(e.target.value))} /></FieldGroup><FieldGroup><StudioLabel>Level tags</StudioLabel><StudioInput value={levels} onChange={(e) => setLevels(e.target.value)} /></FieldGroup><FieldGroup><StudioLabel>Goal tags</StudioLabel><StudioInput value={goals} onChange={(e) => setGoals(e.target.value)} /></FieldGroup><label className="flex items-center gap-2 text-sm studio-text cursor-pointer select-none"><input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="rounded accent-purple-500" /> Published</label>{selectedNode ? <div className="rounded-lg border border-purple-500/20 bg-purple-950/20 p-4"><h3 className="text-sm font-semibold studio-text">Selected node</h3><p className="mt-2 text-sm">{selectedNode.data.title}</p><p className="text-xs capitalize text-purple-300/70">{selectedNode.data.type}</p><p className="mt-3 text-xs text-muted-foreground">Reference is stored internally as a MongoDB ObjectId and hidden from admins.</p><ActionButton className="mt-4" variant="destructive" size="sm" onClick={removeSelectedNode}><Trash2 size={12} /> Remove Node</ActionButton></div> : <EmptyState icon={<Search size={24} />} title="No node selected" description="Click a node to inspect it." />}</StudioCardContent></StudioCard>
      </div>

      {pickerOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-in fade-in duration-150"><StudioCard className="w-full max-w-3xl studio-card-elevated border border-purple-500/25 shadow-[0_20px_60px_rgba(0,0,0,0.85)]"><StudioCardContent className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-semibold studio-text">Add Content</h2><ActionButton variant="ghost" onClick={() => setPickerOpen(false)}>Close</ActionButton></div><div className="flex flex-col gap-3 sm:flex-row"><StudioSelect className="sm:w-44" value={pickerType} onChange={(e) => setPickerType(e.target.value as ContentType | "all")}><option value="all">All</option><option value="topic">Topics</option><option value="pattern">Patterns</option><option value="mission">Missions</option><option value="problem">Problems</option></StudioSelect><StudioInput placeholder="Search content..." value={contentQuery} onChange={(e) => setContentQuery(e.target.value)} /></div><Table><TableHead><Th>Name</Th><Th>Type</Th><Th>Difficulty</Th><Th>Metadata</Th></TableHead><TableBody>{content.map((item) => <tr key={`${item.type}-${item.id}`} className="cursor-pointer hover:bg-muted/40" onClick={() => addContentNode(item)}><Td>{item.title}</Td><Td className="capitalize">{item.type}</Td><Td>{item.difficulty ?? "-"}</Td><Td className="text-muted-foreground">{item.metadata ?? "-"}</Td></tr>)}</TableBody></Table></StudioCardContent></StudioCard></div>}
    </div>
  );
}
