"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, RefreshCw, Pencil, Trash2, Eye, EyeOff, Copy } from "lucide-react";
import {
  PageHeader,
  ActionButton,
  StudioInput,
  Table,
  TableHead,
  Th,
  TableBody,
  Td,
  StatusBadge,
  DifficultyBadge,
  EmptyState,
} from "@/components/studio/ui";
import { cn } from "@/lib/utils";

type Topic = {
  id: string;
  slug: string;
  name: string;
  description: string;
  order: number;
  difficulty: "beginner" | "easy" | "medium" | "hard" | "advanced";
  estimatedMinutes: number;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
};

type ApiResponse = { topics: Topic[]; total: number; pages: number };

function useTopics(search: string, status: string, page: number) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: search, status, page: String(page), limit: "20" });
      const res = await fetch(`/api/studio/topics?${params}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json() as ApiResponse;
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load topics");
    } finally {
      setLoading(false);
    }
  }, [search, status, page]);

  useEffect(() => { void load(); }, [load]);
  return { data, loading, error, reload: load };
}

export default function TopicsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error, reload } = useTopics(debouncedSearch, status, page);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/studio/topics/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      reload();
    } finally {
      setDeleting(null);
    }
  }

  async function handleTogglePublish(id: string, isPublished: boolean) {
    setToggling(id);
    try {
      const res = await fetch(`/api/studio/topics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !isPublished }),
      });
      if (!res.ok) throw new Error("Failed to update");
      reload();
    } finally {
      setToggling(null);
    }
  }

  const topics = data?.topics ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Topics"
        description="Create and manage DSA topics that form the foundation of your learning platform."
        badge={data ? String(data.total) : undefined}
        actions={
          <Link href="/studio/topics/new">
            <ActionButton>
              <Plus size={14} />
              New Topic
            </ActionButton>
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 studio-text-muted" />
          <StudioInput
            placeholder="Search topics..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          {["all", "published", "draft"].map((s) => (
            <button
              key={s}
              onClick={() => { setStatus(s); setPage(1); }}
              className={cn(
                "h-8 rounded-md px-3 text-xs font-medium transition-colors capitalize",
                status === s
                  ? "studio-btn-primary"
                  : "studio-btn-outline"
              )}
            >
              {s}
            </button>
          ))}
          <ActionButton variant="ghost" size="sm" onClick={reload}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </ActionButton>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Table */}
      {loading && topics.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw size={20} className="animate-spin studio-text-subtle" />
        </div>
      ) : topics.length === 0 ? (
        <EmptyState
          icon={<Search size={32} />}
          title="No topics found"
          description={search ? `No results for "${search}". Try a different search term.` : "Get started by creating your first topic."}
          action={
            <Link href="/studio/topics/new">
              <ActionButton>
                <Plus size={14} /> New Topic
              </ActionButton>
            </Link>
          }
        />
      ) : (
        <Table>
          <TableHead>
            <Th>Name</Th>
            <Th>Slug</Th>
            <Th>Difficulty</Th>
            <Th>Order</Th>
            <Th>Est. Time</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </TableHead>
          <TableBody>
            {topics.map((topic) => (
              <tr key={topic.id} className="group transition-colors studio-table-row">
                <Td>
                  <div className="flex flex-col">
                    <span className="font-medium studio-text">{topic.name}</span>
                    <span className="text-xs studio-text-muted truncate max-w-[200px]">{topic.description}</span>
                  </div>
                </Td>
                <Td>
                  <code className="text-xs bg-purple-500/10 text-purple-200 border border-purple-500/20 px-1.5 py-0.5 rounded font-mono">{topic.slug}</code>
                </Td>
                <Td>
                  <DifficultyBadge difficulty={topic.difficulty} />
                </Td>
                <Td className="tabular-nums">{topic.order}</Td>
                <Td className="tabular-nums">{topic.estimatedMinutes}m</Td>
                <Td>
                  <StatusBadge status={topic.isPublished ? "published" : "draft"} />
                </Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionButton
                      variant="ghost"
                      size="sm"
                      title={topic.isPublished ? "Unpublish" : "Publish"}
                      disabled={toggling === topic.id}
                      onClick={() => handleTogglePublish(topic.id, topic.isPublished)}
                    >
                      {topic.isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
                    </ActionButton>
                    <ActionButton
                      variant="ghost"
                      size="sm"
                      title="Duplicate"
                      onClick={() => router.push(`/studio/topics/new?from=${topic.id}`)}
                    >
                      <Copy size={13} />
                    </ActionButton>
                    <ActionButton
                      variant="ghost"
                      size="sm"
                      title="Edit"
                      onClick={() => router.push(`/studio/topics/${topic.id}`)}
                    >
                      <Pencil size={13} />
                    </ActionButton>
                    <ActionButton
                      variant="ghost"
                      size="sm"
                      title="Delete"
                      disabled={deleting === topic.id}
                      onClick={() => handleDelete(topic.id, topic.name)}
                      className="hover:text-red-400"
                    >
                      <Trash2 size={13} />
                    </ActionButton>
                  </div>
                </Td>
              </tr>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="studio-text-subtle text-xs">
            Showing {topics.length} of {data.total} topics
          </p>
          <div className="flex items-center gap-2">
            <ActionButton variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Previous
            </ActionButton>
            <span className="text-xs studio-text-muted">
              Page {page} of {data.pages}
            </span>
            <ActionButton variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>
              Next
            </ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}
