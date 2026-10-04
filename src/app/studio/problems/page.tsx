"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, RefreshCw, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
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

type Problem = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  source: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  tags: string[];
  isPublished: boolean;
  createdAt: string;
};

function useProblems(search: string, difficulty: string, status: string, page: number) {
  const [data, setData] = useState<{ problems: Problem[]; total: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ q: search, difficulty, status, page: String(page), limit: "20" });
      const res = await fetch(`/api/studio/problems?${p}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [search, difficulty, status, page]);

  useEffect(() => { void load(); }, [load]);
  return { data, loading, error, reload: load };
}

export default function ProblemsPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error, reload } = useProblems(debouncedSearch, difficulty, status, page);
  const problems = data?.problems ?? [];

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/studio/problems/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      reload();
    } finally { setDeleting(null); }
  }

  async function handleToggle(id: string, isPublished: boolean) {
    setToggling(id);
    try {
      await fetch(`/api/studio/problems/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !isPublished }),
      });
      reload();
    } finally { setToggling(null); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Problems"
        description="Manage all practice problems with links to external platforms."
        badge={data ? String(data.total) : undefined}
        actions={
          <Link href="/studio/problems/new">
            <ActionButton><Plus size={14} /> New Problem</ActionButton>
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 studio-text-muted" />
          <StudioInput
            placeholder="Search problems..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "easy", "medium", "hard"].map((d) => (
            <button key={d} onClick={() => { setDifficulty(d); setPage(1); }}
              className={cn("h-8 rounded-md px-3 text-xs font-medium capitalize transition-colors",
                difficulty === d ? "studio-btn-primary" : "studio-btn-outline")}>
              {d}
            </button>
          ))}
          <span className="studio-text-subtle text-xs">|</span>
          {["all", "published", "draft"].map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={cn("h-8 rounded-md px-3 text-xs font-medium capitalize transition-colors",
                status === s ? "studio-btn-primary" : "studio-btn-outline")}>
              {s}
            </button>
          ))}
          <ActionButton variant="ghost" size="sm" onClick={reload}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </ActionButton>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      {loading && problems.length === 0 ? (
        <div className="flex items-center justify-center py-16"><RefreshCw size={20} className="animate-spin studio-text-subtle" /></div>
      ) : problems.length === 0 ? (
        <EmptyState icon={<Target size={32} />} title="No problems found" description="Create your first problem to get started."
          action={<Link href="/studio/problems/new"><ActionButton><Plus size={14} /> New Problem</ActionButton></Link>} />
      ) : (
        <Table>
          <TableHead>
            <Th>Title</Th>
            <Th>Source</Th>
            <Th>Difficulty</Th>
            <Th>Tags</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </TableHead>
          <TableBody>
            {problems.map((p) => (
              <tr key={p.id} className="group transition-colors studio-table-row">
                <Td>
                  <div>
                    <p className="font-medium studio-text">{p.title}</p>
                    <code className="text-[10px] studio-text-muted font-mono">{p.slug}</code>
                  </div>
                </Td>
                <Td>
                  <span className="capitalize text-xs studio-text-muted">{p.source}</span>
                </Td>
                <Td><DifficultyBadge difficulty={p.difficulty} /></Td>
                <Td>
                  <div className="flex gap-1 flex-wrap">
                    {p.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] text-purple-200 border border-purple-500/20">{t}</span>
                    ))}
                    {p.tags.length > 3 && <span className="text-[10px] studio-text-subtle">+{p.tags.length - 3}</span>}
                  </div>
                </Td>
                <Td><StatusBadge status={p.isPublished ? "published" : "draft"} /></Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionButton variant="ghost" size="sm" disabled={toggling === p.id}
                      onClick={() => handleToggle(p.id, p.isPublished)}>
                      {p.isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
                    </ActionButton>
                    <ActionButton variant="ghost" size="sm" onClick={() => router.push(`/studio/problems/${p.id}`)}>
                      <Pencil size={13} />
                    </ActionButton>
                    <ActionButton variant="ghost" size="sm" disabled={deleting === p.id}
                      onClick={() => handleDelete(p.id, p.title)} className="hover:text-red-400">
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
          <p className="text-xs studio-text-subtle">Showing {problems.length} of {data.total} problems</p>
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

function Target({ size }: { size: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
