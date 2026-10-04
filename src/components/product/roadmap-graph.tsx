"use client";

import "@xyflow/react/dist/style.css";

import { Background, Controls, Handle, MiniMap, Position, ReactFlow, type Edge, type Node, type NodeProps } from "@xyflow/react";
import { useRouter } from "next/navigation";

type StudentRoadmapNodeData = {
  title: string;
  type: string;
  description: string;
  state: "completed" | "current" | "available" | "locked" | "upcoming";
  href?: string;
};

type StudentRoadmapNode = Node<StudentRoadmapNodeData, "studentRoadmap">;

function JourneyNode({ data }: NodeProps<StudentRoadmapNode>) {
  const color = {
    completed: "border-emerald-400/40 bg-emerald-400/10",
    current: "border-cyan-300/60 bg-cyan-400/15",
    available: "border-violet-300/40 bg-violet-400/10",
    locked: "border-white/[0.08] bg-white/[0.03] opacity-70",
    upcoming: "border-slate-500/30 bg-slate-500/10",
  }[data.state];
  return (
    <div className={`w-60 rounded-2xl border p-4 shadow-2xl backdrop-blur transition duration-200 ${data.href ? "cursor-pointer hover:-translate-y-0.5 hover:border-cyan-300/60 hover:shadow-[0_0_24px_rgba(34,211,238,0.14)]" : ""} ${color}`}>
      <Handle type="target" position={Position.Top} />
      <p className="truncate text-sm font-semibold text-white">{data.title}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-slate-500">{data.type} - {data.state}</p>
      <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-400">{data.description || "Learning checkpoint"}</p>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { studentRoadmap: JourneyNode };

export function StudentRoadmapGraph({ nodes, edges }: { nodes: StudentRoadmapNode[]; edges: Edge[] }) {
  const router = useRouter();
  if (!nodes.length) return null;
  return (
    <div className="h-[520px] overflow-hidden rounded-3xl border border-white/[0.08] bg-slate-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        onNodeClick={(_, node) => {
          if (node.data.href) router.push(node.data.href);
        }}
      >
        <Background />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  );
}
