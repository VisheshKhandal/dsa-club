import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, GitBranch, Target, ListChecks, Users, Plus, ArrowRight, TrendingUp, Clock, Layers, Map, Award, type LucideIcon } from "lucide-react";
import { connectToDatabase } from "@/lib/db/mongodb";
import { LearningPathModel, MediaAssetModel, TopicModel, PatternModel, ProblemModel, MissionModel } from "@/features/content/models/content.model";
import { UserModel } from "@/features/identity/models/user.model";
import { AchievementModel } from "@/features/intelligence/models/intelligence.model";
import { RoadmapTemplateModel } from "@/features/learning/models/learning.model";
import { StatCard, Section, StudioCard, StudioCardContent } from "@/components/studio/ui";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

async function getOverviewStats() {
  try {
    await connectToDatabase();
    const [topics, patterns, problems, publishedMissions, draftMissions, roadmaps, learningPaths, achievements, media, users] = await Promise.all([
      TopicModel.countDocuments(),
      PatternModel.countDocuments(),
      ProblemModel.countDocuments(),
      MissionModel.countDocuments({ isPublished: true }),
      MissionModel.countDocuments({ isPublished: false }),
      RoadmapTemplateModel.countDocuments(),
      LearningPathModel.countDocuments(),
      AchievementModel.countDocuments(),
      MediaAssetModel.countDocuments(),
      UserModel.countDocuments({ status: "active" }),
    ]);
    return { topics, patterns, problems, publishedMissions, draftMissions, roadmaps, learningPaths, achievements, media, users };
  } catch {
    return { topics: 0, patterns: 0, problems: 0, publishedMissions: 0, draftMissions: 0, roadmaps: 0, learningPaths: 0, achievements: 0, media: 0, users: 0 };
  }
}

const quickActions = [
  { label: "New Topic", href: "/studio/topics/new", icon: BookOpen, description: "Create a new DSA topic" },
  { label: "New Pattern", href: "/studio/patterns/new", icon: GitBranch, description: "Add an algorithm pattern" },
  { label: "New Problem", href: "/studio/problems/new", icon: Target, description: "Add a practice problem" },
  { label: "New Mission", href: "/studio/missions/new", icon: ListChecks, description: "Build a learning mission" },
];

export default async function StudioOverviewPage() {
  const stats = await getOverviewStats();

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-[14px] border border-purple-500/10 bg-gradient-to-br from-[#0c0618] to-[#06010e] shadow-xl">
        {/* Animated background graph */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" aria-hidden="true">
          <svg className="absolute inset-0 h-full w-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="graph-pattern" width="100" height="100" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.5" fill="#a855f7" className="animate-glow-pulse" />
                <path d="M2 2 L100 100 M2 100 L100 2" stroke="rgba(168,85,247,0.15)" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#graph-pattern)" />
          </svg>
          <div className="absolute inset-0 bg-gradient-to-t from-[#06010e] via-transparent to-transparent" />
        </div>

        <div className="relative z-10 grid gap-8 p-6 sm:p-8 xl:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-sm font-semibold text-purple-300">
              <TrendingUp size={14} />
              Content command center
            </div>
            <h1 className="text-3xl font-bold tracking-tight studio-text sm:text-5xl">Shape the DSA Club learning graph.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 studio-text-muted">
              Manage topics, patterns, missions, problems, companies, roadmaps, and learning paths from one cohesive Studio.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/studio/missions/new" className="studio-btn-primary pressable inline-flex h-11 items-center gap-2 px-4 text-[15px]">
                <Plus size={16} /> Build Mission
              </Link>
              <Link href="/studio/roadmaps" className="studio-btn-outline pressable inline-flex h-11 items-center gap-2 px-4 text-[15px]">
                <Map size={16} /> Open Roadmaps
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Learning assets", stats.topics + stats.patterns + stats.problems + stats.publishedMissions + stats.draftMissions],
              ["Journey builders", stats.roadmaps + stats.learningPaths],
              ["Prep ecosystem", stats.achievements + stats.media],
              ["Active students", stats.users],
            ].map(([label, value]) => (
              <div key={label} className="motion-card rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition-colors hover:border-purple-500/20">
                <p className="text-3xl font-bold tracking-tight studio-text">{value}</p>
                <p className="mt-2 text-sm studio-text-muted">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <Section title="Platform Statistics" description="A quick pulse of what exists in your content system.">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard
            label="Topics"
            value={stats.topics}
            icon={<BookOpen size={16} />}
            description="Total topics"
          />
          <StatCard
            label="Patterns"
            value={stats.patterns}
            icon={<GitBranch size={16} />}
            description="Algorithm patterns"
          />
          <StatCard
            label="Problems"
            value={stats.problems}
            icon={<Target size={16} />}
            description="Practice problems"
          />
          <StatCard
            label="Published"
            value={stats.publishedMissions}
            icon={<ListChecks size={16} />}
            description="Live missions"
            trend={{ value: "Live", positive: true }}
          />
          <Link href="/studio/missions?status=draft" className="block transition-transform hover:scale-[1.01]">
            <StatCard
              label="Drafts"
              value={stats.draftMissions}
              icon={<Clock size={16} />}
              description="Draft missions"
            />
          </Link>
          <StatCard
            label="Users"
            value={stats.users}
            icon={<Users size={16} />}
            description="Active students"
            trend={{ value: "+0%", positive: true }}
          />
        </div>
      </Section>

      {/* Quick Actions */}
      <Section title="Quick Actions" description="Jump directly to content creation.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.href}
                href={action.href}
                className="studio-card group flex items-center gap-4 p-4"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-purple-500/20 bg-purple-500/10 text-purple-400 transition-transform group-hover:scale-105 group-hover:text-purple-300 group-hover:bg-purple-500/15">
                  <Icon size={17} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <p className="text-[15px] font-semibold studio-text">{action.label}</p>
                  </div>
                  <p className="truncate text-sm studio-text-subtle">{action.description}</p>
                </div>
                <ArrowRight size={15} className="shrink-0 studio-text-subtle transition-transform group-hover:translate-x-1" />
              </Link>
            );
          })}
        </div>
      </Section>

      {/* Content sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <StudioCard>
          <StudioCardContent>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold studio-text">Content Health</h3>
              <TrendingUp size={14} className="studio-text-muted" />
            </div>
            <div className="space-y-4">
              {[
                { label: "Topics", href: "/studio/topics", value: stats.topics, color: "bg-blue-500" },
                { label: "Patterns", href: "/studio/patterns", value: stats.patterns, color: "bg-violet-500" },
                { label: "Problems", href: "/studio/problems", value: stats.problems, color: "bg-amber-500" },
                { label: "Missions", href: "/studio/missions", value: stats.publishedMissions + stats.draftMissions, color: "bg-emerald-500" },
              ].map((item) => {
                const total = stats.topics + stats.patterns + stats.problems + (stats.publishedMissions + stats.draftMissions);
                const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                return (
                  <Link key={item.label} href={item.href} className="flex items-center gap-3 group">
                    <div className="w-24 shrink-0">
                      <p className="text-sm studio-text-muted transition-colors group-hover:studio-text">{item.label}</p>
                    </div>
                    <div className="flex-1 studio-progress-track">
                      <div
                        className={cn("studio-progress-fill", item.color)}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-sm font-medium studio-text tabular-nums">{item.value}</span>
                  </Link>
                );
              })}
            </div>
          </StudioCardContent>
        </StudioCard>

        <StudioCard>
          <StudioCardContent>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold studio-text">Studio Modules</h3>
              <ArrowRight size={14} className="studio-text-muted" />
            </div>
            <div className="space-y-1">
              {([
                { label: "Topics", href: "/studio/topics", status: "Active", icon: BookOpen },
                { label: "Patterns", href: "/studio/patterns", status: "Active", icon: GitBranch },
                { label: "Problems", href: "/studio/problems", status: "Active", icon: Target },
                { label: "Missions", href: "/studio/missions", status: "Active", icon: ListChecks },
                { label: "Companies", href: "/studio/companies", status: "Active", icon: Users },
                { label: "Roadmaps", href: "/studio/roadmaps", status: "Active", icon: Map },
                { label: "Learning Paths", href: "/studio/learning-paths", status: "Active", icon: Layers },
                { label: "Achievements", href: "/studio/achievements", status: "Active", icon: Award },
                { label: "Media Library", href: "/studio/media", status: "Active", icon: ArrowRight },
                { label: "Analytics", href: "/studio/analytics", status: "Active", icon: TrendingUp },
              ] satisfies Array<{ label: string; href: string; status: string; icon: LucideIcon }>).map((mod) => {
                const Icon = mod.icon;
                return (
                <Link
                  key={mod.label}
                  href={mod.href}
                  className="pressable flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-purple-500/10 group"
                >
                  <span className="flex items-center gap-2 text-[15px] studio-text">
                    <Icon size={15} className="studio-text-muted transition-colors group-hover:text-purple-400" />
                    {mod.label}
                  </span>
                  <span className={cn(
                    "studio-badge",
                    mod.status === "Active" ? "studio-badge-emerald" :
                    mod.status === "Beta" ? "studio-badge-amber" :
                    "studio-badge-muted"
                  )}>
                    {mod.status}
                  </span>
                </Link>
              );})}
            </div>
          </StudioCardContent>
        </StudioCard>
      </div>
    </div>
  );
}
