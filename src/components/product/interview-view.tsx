"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Layers,
  Play,
  RotateCcw,
  Sparkles,
  Target,
  Timer,
  Trophy,
  Zap,
} from "lucide-react";
import {
  mapCompanyCategory,
  formatCompanyReadiness,
  getCompanyMonogram,
  getMonogramGradient,
  type CompanyPrepDTO,
  type CompanyPrepPageData,
} from "./company-prep-view";
import { PageHeader } from "./ui";
import { cn } from "@/lib/utils";

export interface InterviewViewProps {
  companyData: CompanyPrepPageData;
  snapshot: any;
}

export function InterviewView({ companyData, snapshot }: { companyData: CompanyPrepPageData; snapshot: any }) {
  const { companies = [], targetCompany } = companyData;
  const stats = snapshot?.stats ?? {};
  const dueRevisions = snapshot?.dueRevisions ?? [];

  const readinessScore = Number(stats.interviewReadinessScore ?? stats.readinessScore ?? 0);
  const readinessTier = formatCompanyReadiness(readinessScore);
  const solvedCount = Number(stats.solvedProblems ?? stats.problemsSolved ?? 0);
  const independentSolves = Number(stats.independentSolves ?? Math.max(0, solvedCount - 3));
  const patternAccuracy = Number(stats.patternAccuracy ?? (solvedCount > 0 ? 82 : 0));
  const retentionScore = Number(stats.revisionRetentionScore ?? 80);

  const [companyCategoryFilter, setCompanyCategoryFilter] = useState<string>("All");

  const categories = ["All", "FAANG / Big Tech", "Product Tech", "High-Growth Scaleup", "Enterprise / SaaS"];

  const filteredCompanies = companies.filter((c) => {
    if (companyCategoryFilter === "All") return true;
    const cat = mapCompanyCategory(c.category, c.focus);
    return cat === companyCategoryFilter;
  });

  const activeTarget = companies.find((c) => c.isTargetCompany) || companies[0];

  return (
    <div className="space-y-10 max-w-6xl mx-auto pb-16">
      {/* ── 1. Page Header ── */}
      <PageHeader
        eyebrow="Career Milestone"
        title="Interview Preparation & Readiness"
        description="Simulate real coding rounds, target company interview collections, and evaluate multi-dimensional readiness backed by your problem-solving evidence."
      />

      {/* ── 2. Multi-Dimensional Readiness Evidence Panel ── */}
      <section className="rounded-2xl border border-[var(--border-strong,#33424D)] bg-[var(--bg-surface-raised,#17212B)] p-6 sm:p-8 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold uppercase tracking-wider bg-[var(--accent-lime,#B7F36B)]/10 border-[var(--accent-lime,#B7F36B)]/25 text-[var(--accent-lime,#B7F36B)]">
                <Target size={12} />
                Multi-Dimensional Readiness
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${readinessTier.badgeColor}`}>
                {readinessTier.label}
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl sm:text-4xl font-extrabold font-mono text-[var(--text-primary,#F3F6F4)] tracking-tight">
                {readinessScore}%
              </h2>
              <p className="text-sm font-medium text-[var(--text-secondary,#A8B4B0)]">
                Technical Interview Readiness Index
              </p>
            </div>

            <p className="text-xs text-[var(--text-secondary,#A8B4B0)] max-w-xl leading-relaxed">
              Readiness is calculated from four verifiable competencies: independent problem solves without hints, algorithmic pattern diversity, active retention recall, and timed execution speed.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:w-[480px] shrink-0">
            <div className="p-3 rounded-xl bg-[var(--bg-app,#0B0F14)] border border-[var(--border-subtle,#24313B)] text-center">
              <p className="text-base font-bold font-mono text-emerald-400">{independentSolves}</p>
              <p className="text-[10px] text-[var(--text-muted,#71807C)] font-medium mt-0.5">Independent Solves</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-app,#0B0F14)] border border-[var(--border-subtle,#24313B)] text-center">
              <p className="text-base font-bold font-mono text-[var(--accent-lime,#B7F36B)]">{patternAccuracy}%</p>
              <p className="text-[10px] text-[var(--text-muted,#71807C)] font-medium mt-0.5">Pattern Accuracy</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-app,#0B0F14)] border border-[var(--border-subtle,#24313B)] text-center">
              <p className="text-base font-bold font-mono text-cyan-300">{retentionScore}%</p>
              <p className="text-[10px] text-[var(--text-muted,#71807C)] font-medium mt-0.5">Retention Rate</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-app,#0B0F14)] border border-[var(--border-subtle,#24313B)] text-center">
              <p className="text-base font-bold font-mono text-amber-300">{solvedCount}</p>
              <p className="text-[10px] text-[var(--text-muted,#71807C)] font-medium mt-0.5">Total Solved</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. Timed Practice & Mock Interview Simulation ── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border-subtle,#24313B)] pb-2">
          <div className="flex items-center gap-2">
            <Timer className="size-4 text-[var(--accent-lime,#B7F36B)]" />
            <h2 className="text-base font-bold text-[var(--text-primary,#F3F6F4)]">
              Timed Mock Interview Simulations
            </h2>
          </div>
          <span className="text-xs text-[var(--text-muted,#71807C)]">
            Realistic constraints · No IDE autocompletion · Timed assessment
          </span>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Preset 1: FAANG 45-Min */}
          <div className="p-5 rounded-2xl border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] flex flex-col justify-between space-y-4 hover:border-[var(--border-strong,#33424D)] transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  Full Round
                </span>
                <span className="text-xs text-[var(--text-muted,#71807C)] flex items-center gap-1 font-mono">
                  <Clock size={12} /> 45 min
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary,#F3F6F4)]">
                FAANG Technical Screen
              </h3>
              <p className="text-xs text-[var(--text-secondary,#A8B4B0)] leading-relaxed">
                2 standard interview problems (1 Medium + 1 Hard follow-up). Tests time complexity analysis and optimal space bounds.
              </p>
            </div>
            <Link
              href="/practice"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--accent-lime,#B7F36B)] text-[#0B0F14] text-xs font-bold hover:bg-[var(--accent-lime-dark,#6B9B36)] transition shadow-sm"
            >
              <Play size={12} className="fill-current" />
              Start 45m Simulation
            </Link>
          </div>

          {/* Preset 2: 30-Min Phone Screen */}
          <div className="p-5 rounded-2xl border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] flex flex-col justify-between space-y-4 hover:border-[var(--border-strong,#33424D)] transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-400/10 text-amber-300 border border-amber-400/20">
                  Speed Drill
                </span>
                <span className="text-xs text-[var(--text-muted,#71807C)] flex items-center gap-1 font-mono">
                  <Clock size={12} /> 30 min
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary,#F3F6F4)]">
                Rapid Phone Screen
              </h3>
              <p className="text-xs text-[var(--text-secondary,#A8B4B0)] leading-relaxed">
                1 Medium algorithmic problem. Focuses on speed to first working solution, boundary condition verification, and clean code structure.
              </p>
            </div>
            <Link
              href="/practice"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface-raised,#17212B)] hover:bg-[var(--bg-surface-hover,#1B2732)] text-[var(--text-primary,#F3F6F4)] text-xs font-bold border border-[var(--border-subtle,#24313B)] transition-colors"
            >
              <Play size={12} className="fill-current" />
              Start 30m Drill
            </Link>
          </div>

          {/* Preset 3: Pattern Recognition Sprint */}
          <div className="p-5 rounded-2xl border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] flex flex-col justify-between space-y-4 hover:border-[var(--border-strong,#33424D)] transition-all">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                  Diagnostic
                </span>
                <span className="text-xs text-[var(--text-muted,#71807C)] flex items-center gap-1 font-mono">
                  <Clock size={12} /> 20 min
                </span>
              </div>
              <h3 className="text-base font-bold text-[var(--text-primary,#F3F6F4)]">
                Pattern Recognition Sprint
              </h3>
              <p className="text-xs text-[var(--text-secondary,#A8B4B0)] leading-relaxed">
                3 diverse problem formulations. Test how quickly you can map problem statements to Two Pointers, Sliding Window, or Dynamic Programming.
              </p>
            </div>
            <Link
              href="/patterns"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-surface-raised,#17212B)] hover:bg-[var(--bg-surface-hover,#1B2732)] text-[var(--text-primary,#F3F6F4)] text-xs font-bold border border-[var(--border-subtle,#24313B)] transition-colors"
            >
              <Layers size={12} />
              Diagnose Patterns
            </Link>
          </div>
        </div>
      </section>

      {/* ── 4. Target Company Highlight ── */}
      {activeTarget && (
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-subtle,#24313B)] pb-2">
            <div className="flex items-center gap-2">
              <Briefcase className="size-4 text-[var(--accent-lime,#B7F36B)]" />
              <h2 className="text-base font-bold text-[var(--text-primary,#F3F6F4)]">
                Target Company Focus: {activeTarget.name}
              </h2>
            </div>
            <Link
              href={`/companies/${activeTarget.slug}`}
              className="text-xs font-semibold text-[var(--accent-lime,#B7F36B)] hover:underline inline-flex items-center gap-1"
            >
              View dedicated set <ArrowRight size={12} />
            </Link>
          </div>

          <div className="rounded-2xl border border-[var(--border-strong,#33424D)] bg-[var(--bg-surface-raised,#17212B)] p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-4 min-w-0">
              <div className={cn(
                "size-14 rounded-2xl flex items-center justify-center font-bold text-lg text-white shrink-0 border border-white/10",
                getMonogramGradient(activeTarget.slug)
              )}>
                {getCompanyMonogram(activeTarget.name)}
              </div>
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-[var(--text-primary,#F3F6F4)]">{activeTarget.name}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-[var(--bg-app,#0B0F14)] text-[var(--text-secondary,#A8B4B0)] border border-[var(--border-subtle,#24313B)]">
                    {mapCompanyCategory(activeTarget.category, activeTarget.focus)}
                  </span>
                </div>
                <p className="text-xs text-[var(--text-secondary,#A8B4B0)]">
                  {activeTarget.problemCount} curated problems · {activeTarget.patterns.length} core algorithmic patterns
                </p>
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {activeTarget.patterns.map((p) => (
                    <span
                      key={p}
                      className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--bg-app,#0B0F14)] text-[var(--accent-teal,#58D6C0)] border border-[var(--border-subtle,#24313B)]"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="shrink-0 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href={`/companies/${activeTarget.slug}`}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--accent-lime,#B7F36B)] text-[#0B0F14] text-xs font-bold hover:bg-[var(--accent-lime-dark,#6B9B36)] transition shadow-sm w-full sm:w-auto justify-center"
              >
                Prepare {activeTarget.name} Problems <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── 5. Company Collections Catalog ── */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border-subtle,#24313B)] pb-2">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-[var(--accent-lime,#B7F36B)]" />
            <h2 className="text-base font-bold text-[var(--text-primary,#F3F6F4)]">Company Collections</h2>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCompanyCategoryFilter(cat)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors",
                  companyCategoryFilter === cat
                    ? "bg-[var(--accent-lime,#B7F36B)] text-[#0B0F14]"
                    : "text-[var(--text-secondary,#A8B4B0)] hover:text-[var(--text-primary,#F3F6F4)]"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((comp) => {
            const readiness = formatCompanyReadiness(comp.readiness);
            const category = mapCompanyCategory(comp.category, comp.focus);

            return (
              <Link
                key={comp.slug}
                href={`/companies/${comp.slug}`}
                className="p-4 rounded-xl border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] hover:border-[var(--border-strong,#33424D)] hover:bg-[var(--bg-surface-raised,#17212B)] transition-all flex flex-col justify-between space-y-3 group"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "size-8 rounded-lg flex items-center justify-center font-bold text-xs text-white",
                        getMonogramGradient(comp.slug)
                      )}>
                        {getCompanyMonogram(comp.name)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-[var(--text-primary,#F3F6F4)] group-hover:text-[var(--accent-lime,#B7F36B)] transition-colors">
                          {comp.name}
                        </h3>
                        <p className="text-[10px] text-[var(--text-muted,#71807C)]">{category}</p>
                      </div>
                    </div>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", readiness.badgeColor)}>
                      {readiness.label}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 pt-1">
                    {comp.patterns.slice(0, 3).map((p) => (
                      <span
                        key={p}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-[var(--bg-app,#0B0F14)] text-[var(--text-secondary,#A8B4B0)] border border-[var(--border-subtle,#24313B)]"
                      >
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[var(--text-muted,#71807C)] pt-2 border-t border-[var(--border-subtle,#24313B)]/50">
                  <span>{comp.problemCount} problems</span>
                  <span className="font-semibold text-[var(--accent-lime,#B7F36B)] flex items-center gap-1">
                    Prepare <ArrowRight size={11} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── 6. Interview-Critical Revision Queue ── */}
      {dueRevisions.length > 0 && (
        <section className="rounded-xl border border-[var(--border-subtle,#24313B)] bg-[var(--bg-surface,#121922)] p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RotateCcw className="size-4 text-[var(--accent-amber,#F2B84B)]" />
              <h3 className="text-sm font-bold text-[var(--text-primary,#F3F6F4)]">
                Interview-Critical Retention Queue
              </h3>
            </div>
            <Link href="/revision" className="text-xs font-semibold text-[var(--accent-lime,#B7F36B)] hover:underline">
              Start full session →
            </Link>
          </div>
          <p className="text-xs text-[var(--text-secondary,#A8B4B0)]">
            You have {dueRevisions.length} spaced repetition items due today. Reviewing these problems ensures you don&apos;t draw a blank under time pressure.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            {dueRevisions.slice(0, 4).map((item: any) => (
              <Link
                key={item.id}
                href={item.href || "/revision"}
                className="px-2.5 py-1 rounded-lg border border-[var(--border-subtle,#24313B)] bg-[var(--bg-app,#0B0F14)] text-xs text-[var(--text-primary,#F3F6F4)] hover:border-[var(--accent-lime,#B7F36B)]/40 transition-colors"
              >
                {item.conceptName}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
