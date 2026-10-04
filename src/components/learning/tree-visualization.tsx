"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface TreeNode {
  val: string | number;
  left?: TreeNode | null;
  right?: TreeNode | null;
  id: string;
}

export interface TreeVisualizationProps {
  treeData?: TreeNode | string; // Either a TreeNode object, a level-order string "[1,2,3,4,5]", or edge syntax "1 -> 2, 3"
  title?: string;
  caption?: string;
  className?: string;
  defaultTraversal?: "preorder" | "inorder" | "postorder" | "bfs";
}

/**
 * Parses ASCII slash-branch tree diagrams into a TreeNode hierarchy
 */
export function parseAsciiTree(text: string): TreeNode | null {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  const hasBranches = lines.some((l) => l.includes("/") || l.includes("\\"));
  if (!hasBranches) return null;

  interface Token {
    val: string;
    col: number;
  }

  interface Level {
    values: (TreeNode & { col: number; hasParent?: boolean })[];
    branchesBelow: Token[];
  }

  const levels: Level[] = [];
  let currentLevel: Level = { values: [], branchesBelow: [] };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isBranchLine = /^[/\s\\]+$/.test(line);

    if (!isBranchLine) {
      if (currentLevel.values.length > 0) {
        levels.push(currentLevel);
        currentLevel = { values: [], branchesBelow: [] };
      }
      const valRegex = /([a-zA-Z0-9_-]+)/g;
      let match: RegExpExecArray | null;
      const rowTokens: (TreeNode & { col: number })[] = [];
      let tokenIdx = 0;
      while ((match = valRegex.exec(line)) !== null) {
        rowTokens.push({
          id: `node-${match[1]}-${levels.length}-${tokenIdx++}`,
          val: match[1],
          col: match.index,
        });
      }
      currentLevel.values = rowTokens;
    } else {
      const branchRegex = /([/\\])/g;
      let match: RegExpExecArray | null;
      while ((match = branchRegex.exec(line)) !== null) {
        currentLevel.branchesBelow.push({
          val: match[1],
          col: match.index,
        });
      }
    }
  }
  if (currentLevel.values.length > 0) {
    levels.push(currentLevel);
  }

  if (levels.length === 0 || levels[0].values.length === 0) return null;

  const root = levels[0].values[0];

  for (let lvl = 0; lvl < levels.length - 1; lvl++) {
    const parents = levels[lvl].values;
    const branches = levels[lvl].branchesBelow;
    const children = levels[lvl + 1].values;

    for (const parent of parents) {
      const leftBranches = branches.filter(
        (b) => b.val === "/" && b.col <= parent.col + 2 && b.col >= parent.col - 6
      );
      const rightBranches = branches.filter(
        (b) => b.val === "\\" && b.col >= parent.col - 2 && b.col <= parent.col + 6
      );

      if (leftBranches.length > 0) {
        const leftBranch = leftBranches[leftBranches.length - 1];
        const leftChild = children.find(
          (c) => c.col <= leftBranch.col + 2 && c.col >= leftBranch.col - 6 && !c.hasParent
        );
        if (leftChild) {
          parent.left = leftChild;
          leftChild.hasParent = true;
        }
      }

      if (rightBranches.length > 0) {
        const rightBranch = rightBranches[0];
        const rightChild = children.find(
          (c) => c.col >= rightBranch.col - 2 && c.col <= rightBranch.col + 6 && !c.hasParent
        );
        if (rightChild) {
          parent.right = rightChild;
          rightChild.hasParent = true;
        }
      }
    }
  }

  return root;
}

/**
 * Parses level-order array or edge string into a TreeNode hierarchy
 */
export function parseTreeInput(input?: TreeNode | string): TreeNode | null {
  if (!input) {
    // Default demo tree
    return {
      id: "node-1",
      val: 1,
      left: {
        id: "node-2",
        val: 2,
        left: { id: "node-4", val: 4 },
        right: { id: "node-5", val: 5 },
      },
      right: {
        id: "node-3",
        val: 3,
        right: { id: "node-6", val: 6 },
      },
    };
  }

  if (typeof input === "object" && input !== null && "val" in input) {
    return input;
  }

  const raw = String(input).trim();

  // Try parsing JSON array: "[1, 2, 3, null, 4]"
  if (raw.startsWith("[") && raw.endsWith("]")) {
    try {
      const items = JSON.parse(raw) as (number | string | null)[];
      if (!items.length || items[0] === null) return null;

      let counter = 1;
      const root: TreeNode = { id: `node-${counter++}`, val: items[0] };
      const queue: TreeNode[] = [root];
      let i = 1;

      while (queue.length > 0 && i < items.length) {
        const curr = queue.shift()!;

        // Left child
        if (i < items.length) {
          const leftVal = items[i++];
          if (leftVal !== null && leftVal !== undefined) {
            curr.left = { id: `node-${counter++}`, val: leftVal };
            queue.push(curr.left);
          }
        }

        // Right child
        if (i < items.length) {
          const rightVal = items[i++];
          if (rightVal !== null && rightVal !== undefined) {
            curr.right = { id: `node-${counter++}`, val: rightVal };
            queue.push(curr.right);
          }
        }
      }
      return root;
    } catch {
      // fallback to other parsers
    }
  }

  // Try parsing ASCII slash-branch tree:
  if (raw.includes("/") || raw.includes("\\")) {
    const asciiTree = parseAsciiTree(raw);
    if (asciiTree) return asciiTree;
  }

  // Edge syntax parser: "1 -> 2, 3; 2 -> 4, 5" or multiline
  const lines = raw.split(/[\n;]+/).map((l) => l.trim()).filter(Boolean);
  const nodeMap = new Map<string, TreeNode>();

  function getOrCreate(valStr: string): TreeNode | null {
    const val = valStr.trim();
    if (val === "null" || val === "-" || val === "") return null;
    if (!nodeMap.has(val)) {
      nodeMap.set(val, { id: `node-${val}`, val });
    }
    return nodeMap.get(val)!;
  }

  let rootNode: TreeNode | null = null;

  for (const line of lines) {
    const match = line.match(/^([^\->]+)\s*->\s*(.+)$/);
    if (match) {
      const parentVal = match[1].trim();
      const children = match[2].split(",").map((c) => c.trim());
      const parent = getOrCreate(parentVal);
      if (!rootNode && parent) rootNode = parent;

      if (parent && children.length > 0) {
        parent.left = getOrCreate(children[0]);
        if (children.length > 1) {
          parent.right = getOrCreate(children[1]);
        }
      }
    }
  }

  return (
    rootNode || {
      id: "node-root",
      val: "Root",
      left: { id: "node-L", val: "L" },
      right: { id: "node-R", val: "R" },
    }
  );
}

interface LayoutNode {
  id: string;
  val: string | number;
  x: number;
  y: number;
  left?: LayoutNode | null;
  right?: LayoutNode | null;
}

interface LayoutEdge {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  key: string;
}

/**
 * Computes neat 2D SVG coordinates for binary tree
 */
function computeTreeLayout(root: TreeNode | null): {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  width: number;
  height: number;
} {
  if (!root) return { nodes: [], edges: [], width: 400, height: 200 };

  const LEVEL_HEIGHT = 64;
  const NODE_RADIUS = 20;

  // Assign horizontal x positions using in-order traversal
  let currentX = 0;
  const H_GAP = 52;
  const nodeMap = new Map<string, { x: number; y: number }>();

  function inOrderAssign(node: TreeNode | null, depth: number) {
    if (!node) return;
    inOrderAssign(node.left ?? null, depth + 1);
    currentX += H_GAP;
    nodeMap.set(node.id, { x: currentX, y: depth * LEVEL_HEIGHT + 36 });
    inOrderAssign(node.right ?? null, depth + 1);
  }

  inOrderAssign(root, 0);

  const flatNodes: LayoutNode[] = [];
  const flatEdges: LayoutEdge[] = [];

  function buildLayout(node: TreeNode | null): LayoutNode | null {
    if (!node) return null;
    const pos = nodeMap.get(node.id) || { x: 100, y: 36 };

    const lNode = buildLayout(node.left ?? null);
    const rNode = buildLayout(node.right ?? null);

    const layoutNode: LayoutNode = {
      id: node.id,
      val: node.val,
      x: pos.x,
      y: pos.y,
      left: lNode,
      right: rNode,
    };

    flatNodes.push(layoutNode);

    if (lNode) {
      flatEdges.push({
        fromX: pos.x,
        fromY: pos.y + NODE_RADIUS,
        toX: lNode.x,
        toY: lNode.y - NODE_RADIUS,
        key: `${node.id}-${lNode.id}`,
      });
    }

    if (rNode) {
      flatEdges.push({
        fromX: pos.x,
        fromY: pos.y + NODE_RADIUS,
        toX: rNode.x,
        toY: rNode.y - NODE_RADIUS,
        key: `${node.id}-${rNode.id}`,
      });
    }

    return layoutNode;
  }

  buildLayout(root);

  const minX = Math.min(...flatNodes.map((n) => n.x), 0);
  const maxX = Math.max(...flatNodes.map((n) => n.x), 400);
  const maxY = Math.max(...flatNodes.map((n) => n.y), 150);

  const paddingX = 40;
  // Normalize X positions with padding
  flatNodes.forEach((n) => {
    n.x = n.x - minX + paddingX;
  });
  flatEdges.forEach((e) => {
    e.fromX = e.fromX - minX + paddingX;
    e.toX = e.toX - minX + paddingX;
  });

  const totalWidth = maxX - minX + paddingX * 2;
  const totalHeight = maxY + 50;

  return { nodes: flatNodes, edges: flatEdges, width: Math.max(totalWidth, 360), height: totalHeight };
}

// Compute standard traversals
function getTraversals(root: TreeNode | null) {
  const preorder: string[] = [];
  const inorder: string[] = [];
  const postorder: string[] = [];
  const bfs: string[] = [];

  function dfs(node: TreeNode | null) {
    if (!node) return;
    preorder.push(node.id);
    dfs(node.left ?? null);
    inorder.push(node.id);
    dfs(node.right ?? null);
    postorder.push(node.id);
  }
  dfs(root);

  // BFS
  if (root) {
    const q = [root];
    while (q.length) {
      const n = q.shift()!;
      bfs.push(n.id);
      if (n.left) q.push(n.left);
      if (n.right) q.push(n.right);
    }
  }

  return { preorder, inorder, postorder, bfs };
}

export function TreeVisualization({
  treeData,
  title = "Binary Tree Visualizer",
  caption,
  className,
  defaultTraversal = "inorder",
}: TreeVisualizationProps) {
  const shouldReduceMotion = useReducedMotion();
  const root = useMemo(() => parseTreeInput(treeData), [treeData]);
  const { nodes, edges, width, height } = useMemo(() => computeTreeLayout(root), [root]);
  const traversals = useMemo(() => getTraversals(root), [root]);

  const [traversalType, setTraversalType] = useState<"preorder" | "inorder" | "postorder" | "bfs">(defaultTraversal);
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeSequence = traversals[traversalType];
  const currentNodeId = activeStep >= 0 && activeStep < activeSequence.length ? activeSequence[activeStep] : null;
  const visitedNodeIds = useMemo(
    () => new Set(activeStep >= 0 ? activeSequence.slice(0, activeStep + 1) : []),
    [activeSequence, activeStep]
  );

  // Reset when traversal type changes
  const handleSelectTraversal = (type: "preorder" | "inorder" | "postorder" | "bfs") => {
    setIsPlaying(false);
    setTraversalType(type);
    setActiveStep(-1);
  };

  // Playback timer
  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setTimeout(() => {
        if (activeStep < activeSequence.length - 1) {
          setActiveStep((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 700);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isPlaying, activeStep, activeSequence.length]);

  return (
    <figure
      className={cn(
        "my-6 overflow-hidden rounded-(--radius-card) border border-(--color-border) bg-(--color-surface-1) shadow-sm",
        className
      )}
      aria-label={title}
    >
      {/* ── Visualizer Header Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-(--color-border) bg-(--color-surface-2)/40 px-4 py-2.5 text-xs">
        <div className="flex items-center gap-2 font-semibold text-(--color-text-primary)">
          <Eye size={14} className="text-(--color-purple)" />
          <span>{title}</span>
        </div>

        {/* Traversal Selector Tabs */}
        <div className="flex items-center gap-1 rounded-lg bg-(--color-surface-1) p-0.5 border border-(--color-border)">
          {(["inorder", "preorder", "postorder", "bfs"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => handleSelectTraversal(type)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium rounded-md capitalize transition-colors",
                traversalType === type
                  ? "bg-(--color-purple-subtle) text-(--color-purple) font-semibold"
                  : "text-(--color-text-muted) hover:text-(--color-text-primary)"
              )}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* ── Interactive SVG Canvas ── */}
      <div className="relative overflow-x-auto p-4 flex justify-center scrollbar-thin">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full max-w-2xl h-auto"
          style={{ minWidth: "320px", minHeight: `${height}px` }}
          aria-hidden="true"
        >
          {/* Connector Edges */}
          <g className="tree-edges">
            {edges.map((edge) => (
              <line
                key={edge.key}
                x1={edge.fromX}
                y1={edge.fromY}
                x2={edge.toX}
                y2={edge.toY}
                stroke="var(--color-border)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            ))}
          </g>

          {/* Node Circles & Labels */}
          <g className="tree-nodes">
            {nodes.map((node) => {
              const isCurrent = node.id === currentNodeId;
              const isVisited = visitedNodeIds.has(node.id);

              return (
                <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                  {/* Subtle pulsing outer ring for active node */}
                  {isCurrent && (
                    <motion.circle
                      r="26"
                      fill="none"
                      stroke="rgba(34, 211, 238, 0.4)"
                      strokeWidth="2.5"
                      initial={shouldReduceMotion ? undefined : { scale: 0.8, opacity: 0 }}
                      animate={shouldReduceMotion ? undefined : { scale: [1, 1.25, 1], opacity: [0.8, 0.2, 0.8] }}
                      transition={{ repeat: Infinity, duration: 1.4 }}
                    />
                  )}

                  {/* Primary Node Surface */}
                  <circle
                    r="19"
                    className={cn(
                      "transition-all duration-200",
                      isCurrent
                        ? "fill-cyan-500/20 stroke-cyan-400 stroke-2"
                        : isVisited
                        ? "fill-emerald-500/20 stroke-emerald-400/70 stroke-[1.5]"
                        : "fill-(--color-surface-2) stroke-(--color-border) stroke-[1.5]"
                    )}
                  />

                  {/* Value Text */}
                  <text
                    textAnchor="middle"
                    dy="0.32em"
                    className={cn(
                      "font-mono text-xs font-bold transition-colors select-none",
                      isCurrent
                        ? "fill-cyan-200"
                        : isVisited
                        ? "fill-emerald-300"
                        : "fill-(--color-text-primary)"
                    )}
                  >
                    {node.val}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* ── Traversal Stepper / Control Bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-(--color-border) bg-(--color-surface-2)/20 px-4 py-2.5 text-xs">
        {/* Playback Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsPlaying((p) => !p)}
            className="focus-ring inline-flex items-center gap-1.5 rounded-md border border-(--color-border) bg-(--color-surface-1) px-2.5 py-1 text-xs font-medium text-(--color-text-primary) hover:bg-(--color-surface-2) transition-colors"
          >
            {isPlaying ? <Pause size={12} /> : <Play size={12} className="fill-current" />}
            <span>{isPlaying ? "Pause" : "Play Traversal"}</span>
          </button>

          <button
            type="button"
            disabled={activeStep <= 0}
            onClick={() => {
              setIsPlaying(false);
              setActiveStep((prev) => Math.max(prev - 1, 0));
            }}
            className="p-1 rounded-md text-(--color-text-muted) hover:text-(--color-text-primary) disabled:opacity-30"
            title="Step Back"
          >
            <ChevronLeft size={16} />
          </button>

          <button
            type="button"
            disabled={activeStep >= activeSequence.length - 1}
            onClick={() => {
              setIsPlaying(false);
              setActiveStep((prev) => Math.min(prev + 1, activeSequence.length - 1));
            }}
            className="p-1 rounded-md text-(--color-text-muted) hover:text-(--color-text-primary) disabled:opacity-30"
            title="Step Forward"
          >
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setActiveStep(-1);
            }}
            className="p-1 rounded-md text-(--color-text-muted) hover:text-(--color-text-primary)"
            title="Reset"
          >
            <RotateCcw size={13} />
          </button>
        </div>

        {/* Visited Sequence Stream */}
        <div className="flex items-center gap-2 overflow-x-auto max-w-sm scrollbar-none font-mono text-[11px]">
          <span className="text-(--color-text-muted) font-sans">Visited:</span>
          {activeStep >= 0 ? (
            <span className="text-cyan-300 font-semibold tabular-nums">
              {activeSequence
                .slice(0, activeStep + 1)
                .map((id) => nodes.find((n) => n.id === id)?.val)
                .join(" → ")}
            </span>
          ) : (
            <span className="text-(--color-text-muted) italic font-sans">Click play or step</span>
          )}
        </div>
      </div>

      {caption && (
        <figcaption className="px-4 py-2 text-[11px] text-(--color-text-muted) bg-(--color-surface-1) border-t border-(--color-border)">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
