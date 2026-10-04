"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, RefreshCw, Pencil, Trash2, Eye, EyeOff, ListChecks } from "lucide-react";
import {
  PageHeader, ActionButton, StudioInput, Table, TableHead, Th, TableBody,
  Td, StatusBadge, DifficultyBadge, EmptyState,
} from "@/components/studio/ui";
import { cn } from "@/lib/utils";

type Mission = {
  id: string;
  slug: string;
  title: string;
  description: string;
  topicId: { _id: string; name: string } | null;
  difficulty: "beginner" | "easy" | "medium" | "hard";
  isPublished: boolean;
  steps: unknown[];
};

function MissionsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") ?? "all";

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(1);
  
  const [data, setData] = useState<{ missions: Mission[]; total: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Sync status if search params change
  useEffect(() => {
    const qStatus = searchParams.get("status");
    if (qStatus && (qStatus === "all" || qStatus === "published" || qStatus === "draft")) {
      setStatus(qStatus);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ q: debouncedSearch, status, page: String(page), limit: "20" });
      const res = await fetch(`/api/studio/missions?${p}`);
      if (!res.ok) throw new Error("Failed to load");
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally { setLoading(false); }
  }, [debouncedSearch, status, page]);

  useEffect(() => { void load(); }, [load]);
  const missions = data?.missions ?? [];

  async function handleToggle(id: string, isPublished: boolean) {
    setToggling(id);
    try {
      await fetch(`/api/studio/missions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: !isPublished }),
      });
      load();
    } finally { setToggling(null); }
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}"?`)) return;
    setDeleting(id);
    try {
      await fetch(`/api/studio/missions/${id}`, { method: "DELETE" });
      load();
    } finally { setDeleting(null); }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Missions"
        description="Build comprehensive learning paths that combine concepts, patterns, and problems."
        badge={data ? String(data.total) : undefined}
        actions={
          <Link href="/studio/missions/new">
            <ActionButton><Plus size={14} /> New Mission</ActionButton>
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 studio-text-muted" />
          <StudioInput placeholder="Search missions..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "published", "draft"].map((s) => (
            <button key={s} onClick={() => { setStatus(s); setPage(1); }}
              className={cn("h-8 rounded-md px-3 text-xs font-medium capitalize transition-colors",
                status === s ? "studio-btn-primary" : "studio-btn-outline")}>
              {s === "draft" ? "Drafts" : s}
            </button>
          ))}
          <ActionButton variant="ghost" size="sm" onClick={load}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
          </ActionButton>
        </div>
      </div>

      {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</div>}

      {loading && missions.length === 0 ? (
        <div className="flex items-center justify-center py-16"><RefreshCw size={20} className="animate-spin studio-text-subtle" /></div>
      ) : missions.length === 0 ? (
        <EmptyState icon={<ListChecks size={32} />} title="No missions found" description={status === "draft" ? "No draft missions right now. Create a new mission to start drafting." : "Create your first mission to get started."}
          action={<Link href="/studio/missions/new"><ActionButton><Plus size={14} /> New Mission</ActionButton></Link>} />
      ) : (
        <Table>
          <TableHead>
            <Th>Title</Th>
            <Th>Topic</Th>
            <Th>Steps</Th>
            <Th>Difficulty</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </TableHead>
          <TableBody>
            {missions.map((m) => (
              <tr key={m.id} className="group transition-colors studio-table-row">
                <Td>
                  <div>
                    <Link href={`/studio/missions/${m.id}`} className="font-medium studio-text hover:text-purple-300 transition-colors">
                      {m.title}
                    </Link>
                    <code className="text-[10px] studio-text-muted font-mono block">{m.slug}</code>
                  </div>
                </Td>
                <Td><span className="text-sm studio-text-muted">{m.topicId?.name ?? "No topic"}</span></Td>
                <Td><span className="tabular-nums text-sm studio-text-muted">{m.steps?.length ?? 0}</span></Td>
                <Td><DifficultyBadge difficulty={m.difficulty} /></Td>
                <Td><StatusBadge status={m.isPublished ? "published" : "draft"} /></Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                    <ActionButton variant="ghost" size="sm" disabled={toggling === m.id} onClick={() => handleToggle(m.id, m.isPublished)} title={m.isPublished ? "Unpublish" : "Publish"}>
                      {m.isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
                    </ActionButton>
                    <ActionButton
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/studio/missions/${m.id}`)}
                      title={m.isPublished ? "Edit mission" : "Continue draft"}
                      className="hover:text-purple-300"
                    >
                      <Pencil size={13} />
                      {!m.isPublished && <span className="ml-1 text-[11px]">Continue</span>}
                    </ActionButton>
                    <ActionButton variant="ghost" size="sm" disabled={deleting === m.id} onClick={() => handleDelete(m.id, m.title)} className="hover:text-red-400">
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
          <p className="text-xs studio-text-subtle">Showing {missions.length} of {data.total} missions</p>
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

export default function MissionsPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-16"><RefreshCw size={20} className="animate-spin studio-text-subtle" /></div>}>
      <MissionsPageContent />
    </Suspense>
  );
}

