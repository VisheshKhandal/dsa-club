"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, RefreshCw, Pencil, Trash2, Eye, EyeOff, GitBranch } from "lucide-react";
import {
  PageHeader, ActionButton, StudioInput, Table, TableHead, Th, TableBody,
  Td, StatusBadge, DifficultyBadge, EmptyState,
} from "@/components/studio/ui";
import { cn } from "@/lib/utils";

type Pattern = {
  id: string;
  slug: string;
  name: string;
  description: string;
  topicId: { _id: string; name: string } | null;
  difficulty: "beginner" | "easy" | "medium" | "hard" | "advanced";
  isPublished: boolean;
};

export default function PatternsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  
  const [data, setData] = useState<{ patterns: Pattern[]; total: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ q: debouncedSearch, status, page: String(page), limit: "20" });
      const res = await fetch(`/api/studio/patterns?${p}`);
      if (!res.ok) throw new Error("Failed to load");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  }, [debouncedSearch, status, page]);

  useEffect(() => { void load(); }, [load]);
  const patterns = data?.patterns ?? [];

  async function handleToggle(id: string, isPublished: boolean) {
    setToggling(id);
    try {
      await fetch(`/api/studio/patterns/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !isPublished }),
      });
      load();
    } finally { setToggling(null); }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeleting(id);
    try {
      await fetch(`/api/studio/patterns/${id}`, { method: "DELETE" });
      load();
    } finally { setDeleting(null); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Patterns"
        description="Manage algorithm patterns."
        badge={data ? String(data.total) : undefined}
        actions={
          <Link href="/studio/patterns/new">
            <ActionButton><Plus size={14} /> New Pattern</ActionButton>
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 studio-text-muted" />
          <StudioInput placeholder="Search patterns..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "published", "draft"].map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={cn("h-8 rounded-md px-3 text-xs font-medium capitalize transition-colors",
                status === s ? "studio-btn-primary" : "studio-btn-outline")}>
              {s}
            </button>
          ))}
          <ActionButton variant="ghost" size="sm" onClick={load}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </ActionButton>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      {loading && patterns.length === 0 ? (
        <div className="flex items-center justify-center py-16"><RefreshCw size={20} className="animate-spin studio-text-subtle" /></div>
      ) : patterns.length === 0 ? (
        <EmptyState icon={<GitBranch size={32} />} title="No patterns found" description="Create your first pattern to get started."
          action={<Link href="/studio/patterns/new"><ActionButton><Plus size={14} /> New Pattern</ActionButton></Link>} />
      ) : (
        <Table>
          <TableHead>
            <Th>Name</Th>
            <Th>Topic</Th>
            <Th>Difficulty</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </TableHead>
          <TableBody>
            {patterns.map((p) => (
              <tr key={p.id} className="group transition-colors studio-table-row">
                <Td>
                  <div>
                    <p className="font-medium studio-text">{p.name}</p>
                    <code className="text-[10px] studio-text-muted font-mono">{p.slug}</code>
                  </div>
                </Td>
                <Td><span className="text-sm studio-text-muted">{p.topicId?.name ?? "No topic"}</span></Td>
                <Td><DifficultyBadge difficulty={p.difficulty} /></Td>
                <Td><StatusBadge status={p.isPublished ? "published" : "draft"} /></Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionButton variant="ghost" size="sm" disabled={toggling === p.id} onClick={() => handleToggle(p.id, p.isPublished)}>
                      {p.isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
                    </ActionButton>
                    <ActionButton variant="ghost" size="sm" onClick={() => router.push(`/studio/patterns/${p.id}`)}>
                      <Pencil size={13} />
                    </ActionButton>
                    <ActionButton variant="ghost" size="sm" disabled={deleting === p.id} onClick={() => handleDelete(p.id, p.name)} className="hover:text-red-400">
                      <Trash2 size={13} />
                    </ActionButton>
                  </div>
                </Td>
              </tr>
            ))}
          </TableBody>
        </Table>
      )}

      {data && data.pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-xs studio-text-subtle">Showing {patterns.length} of {data.total} patterns</p>
          <div className="flex items-center gap-2">
            <ActionButton variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</ActionButton>
            <span className="text-xs studio-text-muted">Page {page} of {data.pages}</span>
            <ActionButton variant="outline" size="sm" disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)}>Next</ActionButton>
          </div>
        </div>
      )}
    </div>
  );
}
