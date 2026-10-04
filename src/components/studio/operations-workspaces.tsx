"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Repeat2, Search, Upload, Users } from "lucide-react";
import { ActionButton, EmptyState, PageHeader, StatusBadge, StudioCard, StudioCardContent, StudioInput, StudioLabel, StudioSelect, Table, TableBody, TableHead, Td, Th } from "@/components/studio/ui";

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

type UserRow = { id: string; name?: string; email: string; role?: string; status?: "active" | "suspended"; lastActiveAt?: string };
type AssetRow = { id: string; fileName: string; url: string; thumbnailUrl?: string; folder: string; assetType: string; sizeBytes?: number };
type SearchGroup = Record<string, { id: string; name: string; slug?: string; email?: string; type: string }[]>;

export function UsersWorkspace() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/studio/users?q=${encodeURIComponent(q)}&status=${status}`)
      .then(parseResponse).then((data) => setUsers(data.users ?? [])).catch((err) => setError(err.message)).finally(() => setLoading(false));
  }, [q, status]);

  return (
    <div className="space-y-6">
      <PageHeader title="Users" description="Inspect account status, roles, and recent activity. Privileged users are controlled server-side." />
      <StudioCard><StudioCardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row"><StudioInput placeholder="Search users..." value={q} onChange={(e) => setQ(e.target.value)} /><StudioSelect className="sm:w-44" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="suspended">Suspended</option></StudioSelect></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading ? <div className="h-40 animate-pulse rounded-lg bg-muted" /> : users.length === 0 ? <EmptyState icon={<Users size={28} />} title="No users found" description="Try a different search or status filter." /> : <Table><TableHead><Th>User</Th><Th>Role</Th><Th>Status</Th><Th>Last active</Th></TableHead><TableBody>{users.map((user) => <tr key={user.id}><Td><div className="font-medium">{user.name || "Unnamed user"}</div><div className="text-xs text-muted-foreground">{user.email}</div></Td><Td>{user.role ?? "student"}</Td><Td><StatusBadge status={user.status === "suspended" ? "suspended" : "active"} /></Td><Td className="text-muted-foreground">{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : "No activity yet"}</Td></tr>)}</TableBody></Table>}
      </StudioCardContent></StudioCard>
    </div>
  );
}

export function SearchWorkspace() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchGroup>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q.trim()) { setResults({}); return; }
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/studio/search?q=${encodeURIComponent(q)}`).then(parseResponse).then((data) => setResults(data.results ?? {})).finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const groups = Object.entries(results).filter(([, rows]) => rows.length > 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Studio Search" description="Search MongoDB content and users across the admin surface." />
      <StudioCard><StudioCardContent className="space-y-5"><div className="relative"><Search size={16} className="absolute left-3 top-3 text-muted-foreground" /><StudioInput className="h-11 pl-10" placeholder="Search topics, patterns, problems, missions, and users..." value={q} onChange={(e) => setQ(e.target.value)} /></div>{loading && <p className="inline-flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Searching...</p>}{!q.trim() ? <EmptyState icon={<Search size={28} />} title="Search the Studio" description="Enter a term to find content records and users." /> : groups.length === 0 && !loading ? <EmptyState icon={<Search size={28} />} title="No results" description="No matching MongoDB records were found." /> : <div className="grid gap-4 md:grid-cols-2">{groups.map(([group, rows]) => <div key={group} className="rounded-lg border p-4"><h2 className="mb-3 text-sm font-semibold capitalize">{group}</h2><div className="space-y-2">{rows.map((row) => <div key={`${row.type}-${row.id}`} className="rounded-md bg-muted/40 px-3 py-2"><div className="text-sm font-medium">{row.name}</div><div className="text-xs text-muted-foreground">{row.slug ?? row.email ?? row.id}</div></div>)}</div></div>)}</div>}</StudioCardContent></StudioCard>
    </div>
  );
}

export function MediaWorkspace() {
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [folder, setFolder] = useState("general");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = () => {
    setLoading(true);
    fetch("/api/studio/media").then(parseResponse).then((data) => setAssets(data.assets ?? [])).catch((err) => setMessage(err.message)).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const upload = async () => {
    if (!file) return;
    setSaving(true); setMessage("Uploading...");
    const body = new FormData();
    body.set("file", file);
    body.set("folder", folder);
    try {
      await fetch("/api/studio/media", { method: "POST", body }).then(parseResponse);
      setFile(null); setMessage("Upload complete"); load();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Media Library" description="Upload and reuse Cloudinary-backed assets. MongoDB stores metadata and URLs only." />
      <StudioCard><StudioCardContent className="grid gap-4 md:grid-cols-[1fr_180px_auto]"><div><StudioLabel>Asset file</StudioLabel><input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="block w-full studio-input px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-purple-500/20 file:px-2.5 file:py-1 file:text-xs file:font-medium file:text-purple-300 hover:file:bg-purple-500/30" /></div><div><StudioLabel>Folder</StudioLabel><StudioSelect value={folder} onChange={(e) => setFolder(e.target.value)}><option value="general">general</option><option value="topics">topics</option><option value="patterns">patterns</option><option value="missions">missions</option><option value="companies">companies</option><option value="achievements">achievements</option><option value="mindmaps">mindmaps</option></StudioSelect></div><div className="flex items-end"><ActionButton onClick={upload} disabled={!file || saving}>{saving ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Upload</ActionButton></div>{message && <p className="md:col-span-3 text-sm text-muted-foreground">{message}</p>}</StudioCardContent></StudioCard>
      {loading ? <div className="h-40 animate-pulse rounded-lg bg-muted" /> : assets.length === 0 ? <EmptyState icon={<ImageIcon size={28} />} title="No media yet" description="Upload images, SVGs, GIFs, diagrams, logos, and mission assets." /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{assets.map((asset) => <StudioCard key={asset.id}><StudioCardContent className="space-y-3 p-3">{asset.thumbnailUrl || asset.url ? <div className="relative aspect-video w-full overflow-hidden rounded-md border"><Image src={asset.thumbnailUrl || asset.url} alt={asset.fileName} fill sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover" /></div> : <div className="aspect-video rounded-md bg-muted" />}<div><div className="truncate text-sm font-medium">{asset.fileName}</div><div className="text-xs text-muted-foreground">{asset.folder} - {asset.assetType}</div></div><ActionButton type="button" variant="outline" size="sm" onClick={() => void navigator.clipboard.writeText(asset.url)}>Copy URL</ActionButton></StudioCardContent></StudioCard>)}</div>}
    </div>
  );
}

export function RevisionWorkspace() {
  return (
    <div className="space-y-6">
      <PageHeader title="Revision" description="Inspect revision readiness and student review activity from real platform records." />
      <StudioCard><StudioCardContent><EmptyState icon={<Repeat2 size={28} />} title="Revision data will appear from student activity" description="The revision engine and cron API are present; this dashboard intentionally stays empty until real review queues, attempts, and progress records exist." /></StudioCardContent></StudioCard>
    </div>
  );
}
