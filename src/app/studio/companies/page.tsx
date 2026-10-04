"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, RefreshCw, Pencil, Trash2, Eye, EyeOff, Building2 } from "lucide-react";
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
  EmptyState,
} from "@/components/studio/ui";
import { cn } from "@/lib/utils";

type Company = {
  id: string;
  slug: string;
  name: string;
  tier: "startup" | "growth" | "product" | "big_tech";
  isPublished: boolean;
};

function useCompanies(search: string, tier: string, status: string, page: number) {
  const [data, setData] = useState<{ companies: Company[]; total: number; pages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ q: search, tier, status, page: String(page), limit: "20" });
      const res = await fetch(`/api/studio/companies?${p}`);
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setData(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [search, tier, status, page]);

  useEffect(() => { void load(); }, [load]);
  return { data, loading, error, reload: load };
}

export default function CompaniesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [tier, setTier] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, loading, error, reload } = useCompanies(debouncedSearch, tier, status, page);
  const companies = data?.companies ?? [];

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeleting(id);
    try {
      const res = await fetch(`/api/studio/companies/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      reload();
    } finally { setDeleting(null); }
  }

  async function handleToggle(id: string, isPublished: boolean) {
    setToggling(id);
    try {
      await fetch(`/api/studio/companies/${id}`, {
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
        title="Companies"
        description="Build company-specific DSA preparation experiences, not just company profiles."
        badge={data ? String(data.total) : undefined}
        actions={
          <Link href="/studio/companies/new">
            <ActionButton><Plus size={14} /> New Company</ActionButton>
          </Link>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="relative max-w-xs flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 studio-text-muted" />
          <StudioInput
            placeholder="Search companies..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {["all", "startup", "growth", "product", "big_tech"].map((d) => (
            <button key={d} onClick={() => { setTier(d); setPage(1); }}
              className={cn("h-8 rounded-md px-3 text-xs font-medium capitalize transition-colors",
                tier === d ? "studio-btn-primary" : "studio-btn-outline")}>
              {d.replace("_", " ")}
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

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Preparation strategy", "Capture interview process, notes, tags, and resources."],
          ["Targeted practice", "Connect company preparation to problems, patterns, and roadmaps over time."],
          ["Student readiness", "Published companies become reusable prep surfaces in the student app."],
        ].map(([title, description]) => (
          <div key={title} className="studio-card p-4">
            <p className="text-base font-semibold studio-text">{title}</p>
            <p className="mt-1 text-sm leading-6 studio-text-muted">{description}</p>
          </div>
        ))}
      </div>

      {loading && companies.length === 0 ? (
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, index) => <div key={index} className="studio-skeleton h-16" />)}
        </div>
      ) : companies.length === 0 ? (
        <EmptyState icon={<Building2 size={32} />} title="No companies found" description="Add your first company."
          action={<Link href="/studio/companies/new"><ActionButton><Plus size={14} /> New Company</ActionButton></Link>} />
      ) : (
        <Table>
          <TableHead>
            <Th>Name</Th>
            <Th>Tier</Th>
            <Th>Status</Th>
            <Th className="text-right">Actions</Th>
          </TableHead>
          <TableBody>
            {companies.map((c) => (
              <tr key={c.id} className="group transition-colors studio-table-row">
                <Td>
                  <div>
                    <p className="font-medium studio-text">{c.name}</p>
                    <code className="text-[10px] studio-text-muted font-mono">{c.slug}</code>
                  </div>
                </Td>
                <Td>
                  <span className="capitalize text-xs studio-text-muted">{c.tier.replace("_", " ")}</span>
                </Td>
                <Td><StatusBadge status={c.isPublished ? "published" : "draft"} /></Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ActionButton variant="ghost" size="sm" disabled={toggling === c.id}
                      onClick={() => handleToggle(c.id, c.isPublished)}>
                      {c.isPublished ? <EyeOff size={13} /> : <Eye size={13} />}
                    </ActionButton>
                    <ActionButton variant="ghost" size="sm" onClick={() => router.push(`/studio/companies/${c.id}`)}>
                      <Pencil size={13} />
                    </ActionButton>
                    <ActionButton variant="ghost" size="sm" disabled={deleting === c.id}
                      onClick={() => handleDelete(c.id, c.name)} className="hover:text-red-400">
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
          <p className="text-xs studio-text-subtle">Showing {companies.length} of {data.total} companies</p>
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
