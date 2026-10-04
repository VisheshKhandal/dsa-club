"use client";

import { useCallback, useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, BookOpen, Clock, GitBranch, ListChecks, RefreshCw, Target, Users } from "lucide-react";
import { ActionButton, EmptyState, PageHeader, StudioCard, StudioCardContent, StudioSelect } from "@/components/studio/ui";

type Range = "today" | "7d" | "30d" | "90d" | "all";
type AnalyticsData = {
  range: Range;
  overview: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    content: {
      totalTopics: number; totalPatterns: number; totalProblems: number; totalMissions: number;
      totalRoadmaps: number; totalLearningPaths: number; totalCompanies: number;
      publishedTopics: number; publishedPatterns: number; publishedProblems: number; publishedMissions: number;
      publishedRoadmaps: number; publishedLearningPaths: number;
    };
  } | null;
  activity: { problemAttempts: number; problemCompletions: number; missionCompletions: number; learningSessions: number; revisionReviews: number; dueRevisions: number; focusedMinutes: number };
  dailyActivity: { _id: string; focusedSeconds: number; sessions: number }[];
  dailySignups: { _id: string; count: number }[];
  topTopics: { _id: string; name: string; count: number }[];
  mostAttemptedProblems: { _id: string; title: string; attempts: number; completions: number }[];
  eventsByType: { _id: string; count: number }[];
};

function MetricCard({ label, value, sub, icon }: { label: string; value: string | number; sub: string; icon: React.ReactNode }) {
  return (
    <StudioCard>
      <StudioCardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium studio-text-muted">{label}</p>
          <span className="grid size-9 place-items-center rounded-md border border-purple-500/20 bg-purple-500/10 text-purple-400">{icon}</span>
        </div>
        <p className="text-3xl font-bold tabular-nums studio-text">{value}</p>
        <p className="text-sm studio-text-subtle">{sub}</p>
      </StudioCardContent>
    </StudioCard>
  );
}

function ChartShell({ title, empty, children }: { title: string; empty: boolean; children: React.ReactNode }) {
  return (
    <StudioCard>
      <StudioCardContent>
        <h2 className="mb-4 text-base font-semibold studio-text">{title}</h2>
        {empty ? <EmptyState icon={<Activity size={24} />} title="No data yet" description="This section will populate once real activity exists." /> : children}
      </StudioCardContent>
    </StudioCard>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [range, setRange] = useState<Range>("30d");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [bootstrapped, setBootstrapped] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    fetch("/api/studio/settings")
      .then((res) => res.ok ? res.json() : null)
      .then((payload) => {
        if (payload?.settings?.analyticsDefaultRange) setRange(payload.settings.analyticsDefaultRange);
        setAutoRefresh(Boolean(payload?.settings?.analyticsAutoRefresh));
      })
      .finally(() => setBootstrapped(true));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/studio/analytics?range=${range}`);
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.error ?? `Error ${res.status}`);
      setData(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load analytics");
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { if (bootstrapped) void load(); }, [bootstrapped, load]);
  useEffect(() => {
    if (!autoRefresh || !bootstrapped) return;
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [autoRefresh, bootstrapped, load]);

  const ov = data?.overview;
  const ct = ov?.content;
  const activity = data?.activity;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Real MongoDB metrics with empty states and date-aware activity filters."
        actions={<><StudioSelect value={range} onChange={(e) => setRange(e.target.value as Range)}><option value="today">Today</option><option value="7d">7 days</option><option value="30d">30 days</option><option value="90d">90 days</option><option value="all">All time</option></StudioSelect><ActionButton variant="outline" onClick={load} disabled={loading}><RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Retry</ActionButton></>}
      />

      {error && <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>}

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-32 studio-skeleton" />)}</div>
      ) : (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total Users" value={ov?.totalUsers ?? 0} sub={`${ov?.newUsers ?? 0} new in range`} icon={<Users size={17} />} />
            <MetricCard label="Active Users" value={ov?.activeUsers ?? 0} sub="Based on last activity timestamp" icon={<Activity size={17} />} />
            <MetricCard label="Study Time" value={`${activity?.focusedMinutes ?? 0}m`} sub={`${activity?.learningSessions ?? 0} learning sessions`} icon={<Clock size={17} />} />
            <MetricCard label="Revision Reviews" value={activity?.revisionReviews ?? 0} sub={`${activity?.dueRevisions ?? 0} scheduled or due`} icon={<RefreshCw size={17} />} />
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Topics" value={ct?.totalTopics ?? 0} sub={`${ct?.publishedTopics ?? 0} published`} icon={<BookOpen size={17} />} />
            <MetricCard label="Patterns" value={ct?.totalPatterns ?? 0} sub={`${ct?.publishedPatterns ?? 0} published`} icon={<GitBranch size={17} />} />
            <MetricCard label="Problems" value={ct?.totalProblems ?? 0} sub={`${activity?.problemCompletions ?? 0} solved in range`} icon={<Target size={17} />} />
            <MetricCard label="Missions" value={ct?.totalMissions ?? 0} sub={`${activity?.missionCompletions ?? 0} completed in range`} icon={<ListChecks size={17} />} />
          </section>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartShell title="Daily Study Activity" empty={!data?.dailyActivity.length}>
              <ResponsiveContainer width="100%" height={240}><AreaChart data={data?.dailyActivity ?? []}><CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.15)" /><XAxis dataKey="_id" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} /><YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} allowDecimals={false} /><Tooltip contentStyle={{ backgroundColor: "#0f0722", border: "1px solid rgba(168,85,247,0.2)" }} /><Area type="monotone" dataKey="sessions" stroke="#a855f7" fill="#a855f733" /></AreaChart></ResponsiveContainer>
            </ChartShell>
            <ChartShell title="Daily Signups" empty={!data?.dailySignups.length}>
              <ResponsiveContainer width="100%" height={240}><BarChart data={data?.dailySignups ?? []}><CartesianGrid strokeDasharray="3 3" stroke="rgba(168,85,247,0.15)" /><XAxis dataKey="_id" tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} /><YAxis tick={{ fontSize: 11, fill: "rgba(255,255,255,0.4)" }} allowDecimals={false} /><Tooltip contentStyle={{ backgroundColor: "#0f0722", border: "1px solid rgba(168,85,247,0.2)" }} /><Bar dataKey="count" fill="#22d3ee" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
            </ChartShell>
          </div>

          <div className="grid gap-6 xl:grid-cols-3">
            <ChartShell title="Most Attempted Problems" empty={!data?.mostAttemptedProblems.length}>
              <div className="space-y-3">{data?.mostAttemptedProblems.map((item) => <div key={item._id} className="rounded-md border border-purple-500/10 bg-white/[0.01] p-3"><p className="text-sm font-medium studio-text">{item.title}</p><p className="text-sm studio-text-muted">{item.attempts} attempts - {item.completions} completions</p></div>)}</div>
            </ChartShell>
            <ChartShell title="Popular Topics" empty={!data?.topTopics.length}>
              <div className="space-y-3">{data?.topTopics.map((item) => <div key={item._id} className="rounded-md border border-purple-500/10 bg-white/[0.01] p-3"><p className="text-sm font-medium studio-text">{item.name}</p><p className="text-sm studio-text-muted">{item.count} strong-topic signals</p></div>)}</div>
            </ChartShell>
            <ChartShell title="Activity Events" empty={!data?.eventsByType.length}>
              <div className="space-y-3">{data?.eventsByType.map((item) => <div key={item._id} className="rounded-md border border-purple-500/10 bg-white/[0.01] p-3"><p className="text-sm font-medium studio-text">{item._id}</p><p className="text-sm studio-text-muted">{item.count} events</p></div>)}</div>
            </ChartShell>
          </div>
        </>
      )}
    </div>
  );
}
