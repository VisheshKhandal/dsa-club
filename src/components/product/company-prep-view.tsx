"use client";

import React from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import {
  Building2,
  Target,
  Layers,
  Code2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Settings,
  Flame,
  Award,
  BookOpen,
} from "lucide-react";
import { Surface, PageHeader, MasteryRing } from "./ui";

/* ── Types & Interfaces ────────────────────────────────── */

export type CompanyPrepDTO = {
  id: string;
  slug: string;
  name: string;
  logo?: string;
  category: string;
  patterns: string[];
  problemCount: number;
  sets: number;
  readiness: number;
  focus: string[];
  isTargetCompany: boolean;
  hasContent: boolean;
  description?: string;
  status: "not_started" | "in_progress" | "completed";
};

export type CompanyPrepPageData = {
  companies: CompanyPrepDTO[];
  targetCompany: { id: string; name: string; slug: string } | null;
  hasAnyCompanyContent: boolean;
};

export function mapCompanyCategory(tier?: string, tags?: string[]): string {
  const normalizedTier = String(tier ?? "").toLowerCase();
  const lowerTags = (tags ?? []).map((t) => String(t).toLowerCase());

  if (
    lowerTags.includes("faang") ||
    lowerTags.includes("big-tech") ||
    lowerTags.includes("big tech") ||
    normalizedTier === "big_tech"
  ) {
    return "FAANG / Big Tech";
  }
  if (lowerTags.includes("fintech") || lowerTags.includes("finance")) {
    return "Fintech";
  }
  if (lowerTags.includes("enterprise") || lowerTags.includes("b2b")) {
    return "Enterprise / SaaS";
  }
  if (normalizedTier === "product") {
    return "Product Tech";
  }
  if (normalizedTier === "growth") {
    return "High-Growth Scaleup";
  }
  if (normalizedTier === "startup") {
    return "Early-Stage Startup";
  }
  return "Technology";
}

/* ── Helpers & Invariants (Exported for Testing) ────────── */

export function formatCompanyReadiness(readiness: number) {
  if (readiness >= 80) {
    return {
      label: "Interview Ready",
      isReady: true,
      color: "text-emerald-300",
      bg: "bg-emerald-500/10 border-emerald-500/25",
      badgeColor: "text-emerald-300 bg-emerald-500/15 border-emerald-500/30",
    };
  }
  if (readiness > 0) {
    return {
      label: "In Progress",
      isReady: false,
      color: "text-cyan-300",
      bg: "bg-cyan-500/10 border-cyan-500/25",
      badgeColor: "text-cyan-300 bg-cyan-500/15 border-cyan-500/30",
    };
  }
  return {
    label: "Not Started",
    isReady: false,
    color: "text-purple-200/50",
    bg: "bg-white/[0.03] border-white/[0.08]",
    badgeColor: "text-purple-200/60 bg-white/[0.04] border-white/[0.08]",
  };
}

export function getCompanyMonogram(name: string): string {
  if (!name) return "C";
  const words = name.trim().split(/\s+/);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.slice(0, Math.min(2, name.length)).toUpperCase();
}

export function getMonogramGradient(slug: string): string {
  const s = (slug || "").toLowerCase();
  if (s.includes("amazon")) return "from-amber-500/25 to-orange-500/15 text-amber-300 border-amber-500/30";
  if (s.includes("google")) return "from-blue-500/25 to-emerald-500/15 text-blue-300 border-blue-500/30";
  if (s.includes("microsoft")) return "from-cyan-500/25 to-indigo-500/15 text-cyan-300 border-cyan-500/30";
  if (s.includes("meta") || s.includes("facebook")) return "from-blue-600/25 to-purple-500/15 text-blue-200 border-blue-500/30";
  if (s.includes("apple")) return "from-zinc-400/25 to-slate-500/15 text-white border-white/30";
  if (s.includes("netflix")) return "from-rose-600/25 to-red-500/15 text-rose-300 border-rose-500/30";
  if (s.includes("stripe")) return "from-indigo-500/25 to-violet-500/15 text-indigo-300 border-indigo-500/30";
  return "from-purple-500/25 to-violet-500/15 text-purple-200 border-purple-500/30";
}

/* ── 1. Company Prep Context / Micro-Pipeline ──────────── */

export function CompanyPrepPipeline() {
  const steps = [
    {
      step: 1,
      title: "Target",
      desc: "Pick your target company",
      icon: Target,
      color: "text-purple-300",
    },
    {
      step: 2,
      title: "Patterns",
      desc: "Understand frequently asked patterns",
      icon: Layers,
      color: "text-cyan-300",
    },
    {
      step: 3,
      title: "Practice",
      desc: "Solve curated company problem sets",
      icon: Code2,
      color: "text-fuchsia-300",
    },
    {
      step: 4,
      title: "Readiness",
      desc: "Reach 80%+ interview readiness",
      icon: Award,
      color: "text-emerald-300",
    },
  ];

  return (
    <Surface level="inset" className="p-4 sm:p-5 border-purple-500/20 bg-purple-950/20 backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-purple-400" />
        <span className="text-[11px] font-bold uppercase tracking-wider text-purple-200/80">
          How Company Prep Works
        </span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={s.step}
              className="relative flex items-start gap-3 rounded-xl border border-(--color-border) bg-(--color-surface-2) p-3.5"
            >
              <div className="flex-shrink-0 grid size-8 place-items-center rounded-lg bg-(--color-surface-3) border border-(--color-border)">
                <Icon className={`w-4 h-4 ${s.color}`} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-(--color-text-muted) uppercase">Step {s.step}</span>
                  <span className="text-xs font-semibold text-(--color-text-primary)">{s.title}</span>
                </div>
                <p className="text-[11px] text-(--color-text-secondary) mt-0.5 leading-snug">{s.desc}</p>
              </div>
              {idx < steps.length - 1 && (
                <span className="hidden lg:block absolute -right-2 top-1/2 -translate-y-1/2 text-purple-400/30 text-xs font-bold">
                  →
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Surface>
  );
}

/* ── 2. Company Prep Empty State (Intentional In-Curation State) ── */

export function CompanyPrepEmptyState({
  targetCompany,
  pipelineCompanies,
}: {
  targetCompany: { id: string; name: string; slug: string } | null;
  pipelineCompanies: CompanyPrepDTO[];
}) {
  return (
    <div className="space-y-8">
      {/* Informative Hero */}
      <Surface level="elevated" className="relative overflow-hidden p-6 sm:p-8 border-purple-500/30">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-purple-500/15 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/25 text-(--color-purple)">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Curated Company Content In Progress</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-bold text-(--color-text-primary) tracking-tight">
            Company prep content is being added.
          </h2>

          {targetCompany ? (
            <div className="rounded-xl border border-purple-400/20 bg-purple-500/[0.08] p-4 text-sm text-(--color-text-primary) leading-relaxed">
              <span className="font-semibold text-(--color-text-primary)">Your target company: </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-purple-600 dark:text-purple-200 bg-purple-400/20 border border-purple-400/30 mr-1.5">
                {targetCompany.name}
              </span>
              We&apos;ll notify you when {targetCompany.name} curated interview sets and pattern breakdowns are ready.
            </div>
          ) : (
            <p className="text-sm sm:text-base text-(--color-text-secondary) leading-relaxed">
              Company-specific pattern distributions and high-frequency problem sets are being actively mapped.
              Set your target company in your profile to prioritize incoming sets for your goal.
            </p>
          )}

          {/* CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/practice"
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-400 via-purple-400 to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-[0_6px_24px_rgba(168,85,247,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(168,85,247,0.4)]"
            >
              Explore Practice <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/account"
              className="focus-ring inline-flex items-center justify-center gap-2 rounded-xl border border-(--color-border) bg-(--color-surface-2) px-5 py-3 text-sm font-semibold text-(--color-text-primary) transition hover:bg-(--color-surface-3)"
            >
              <Settings className="w-4 h-4 text-(--color-purple)" />
              {targetCompany ? "Change Target Company" : "Set Target Company"}
            </Link>
          </div>
        </div>
      </Surface>

      {/* What to Expect Preview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-(--color-border) bg-(--color-surface-1) shadow-xs dark:shadow-none p-5 space-y-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-300">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-(--color-text-primary)">Pattern Distributions</h3>
          <p className="text-xs text-(--color-text-secondary) leading-relaxed">
            Targeted frequency analysis showing which algorithmic patterns (e.g. Sliding Window, BFS) each company tests most.
          </p>
        </div>

        <div className="rounded-xl border border-(--color-border) bg-(--color-surface-1) shadow-xs dark:shadow-none p-5 space-y-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-purple-500/10 border border-purple-500/20 text-(--color-purple)">
            <Code2 className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-(--color-text-primary)">Curated Problem Sets</h3>
          <p className="text-xs text-(--color-text-secondary) leading-relaxed">
            High-yield problems tagged specifically to recent interview reports, avoiding low-yield generic grinding.
          </p>
        </div>

        <div className="rounded-xl border border-(--color-border) bg-(--color-surface-1) shadow-xs dark:shadow-none p-5 space-y-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-(--color-text-primary)">Readiness Signals</h3>
          <p className="text-xs text-(--color-text-secondary) leading-relaxed">
            Weighted readiness scoring measuring your mastery across that company&apos;s specific core patterns.
          </p>
        </div>
      </div>

      {/* Pipeline Companies List */}
      {pipelineCompanies.length > 0 && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-(--color-text-primary)">Companies in our curation pipeline</h3>
              <p className="text-xs text-(--color-text-muted) mt-0.5">
                Problem sets and pattern weightings are currently being mapped for these target companies.
              </p>
            </div>
            <span className="text-xs font-medium text-(--color-text-muted)">
              {pipelineCompanies.length} companies queued
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pipelineCompanies.map((company) => {
              const monogram = getCompanyMonogram(company.name);
              const gradient = getMonogramGradient(company.slug);
              const isTarget = Boolean(targetCompany && (targetCompany.slug === company.slug || targetCompany.id === company.id));

              return (
                <div
                  key={company.slug}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-4 transition ${
                    isTarget
                      ? "border-purple-400/40 bg-purple-500/[0.08]"
                      : "border-(--color-border) bg-(--color-surface-1) shadow-xs dark:shadow-none"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`grid size-10 place-items-center rounded-xl font-bold text-sm bg-gradient-to-br border ${gradient} flex-shrink-0`}
                    >
                      {monogram}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold text-(--color-text-primary)">
                          {company.name}
                        </span>
                        {isTarget && (
                          <span className="rounded bg-purple-400/20 border border-purple-400/30 px-1.5 py-0.5 text-[9px] font-bold text-purple-600 dark:text-purple-200">
                            Target
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-(--color-text-muted) truncate">{company.category}</p>
                    </div>
                  </div>

                  <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] font-medium text-purple-200/60 shrink-0">
                    In Curation
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 3. Featured Target Company Hero Card (When Content Exists) ── */

export function TargetCompanyHeroCard({
  company,
}: {
  company: CompanyPrepDTO;
}) {
  const readinessInfo = formatCompanyReadiness(company.readiness);
  const monogram = getCompanyMonogram(company.name);
  const gradient = getMonogramGradient(company.slug);

  return (
    <Surface
      level="elevated"
      className="relative overflow-hidden p-6 sm:p-8 border-purple-400/40 shadow-[0_16px_48px_rgba(168,85,247,0.18)]"
    >
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-purple-500/20 via-fuchsia-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative">
        <div className="space-y-4 max-w-xl">
          {/* Target Company Badge */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500/20 to-fuchsia-500/20 border border-purple-400/30 text-purple-200">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              Primary Target Company
            </span>
            <span className="text-xs font-medium text-(--color-text-muted)">· {company.category}</span>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`grid size-14 place-items-center rounded-2xl font-black text-xl bg-gradient-to-br border ${gradient} flex-shrink-0 shadow-lg`}
            >
              {monogram}
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-(--color-text-primary) tracking-tight">
                {company.name} Preparation
              </h2>
              <p className="text-xs sm:text-sm text-(--color-text-secondary) mt-0.5">
                {company.sets} problem sets · {company.problemCount} curated problems
              </p>
            </div>
          </div>

          {/* Most Asked Patterns */}
          {company.patterns.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-(--color-text-muted)">
                Most Asked Patterns
              </span>
              <div className="flex flex-wrap gap-1.5">
                {company.patterns.map((pat) => (
                  <span
                    key={pat}
                    className="rounded-lg border border-purple-400/25 bg-purple-400/10 px-2.5 py-1 text-xs font-medium text-purple-600 dark:text-purple-200"
                  >
                    {pat}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Readiness Meter & Primary Action */}
        <div className="flex flex-col sm:flex-row lg:flex-col items-start sm:items-center lg:items-end gap-5 shrink-0">
          <div className="flex items-center gap-4">
            <MasteryRing value={company.readiness} size="md" />
            <div className="text-left lg:text-right">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${readinessInfo.badgeColor}`}>
                {readinessInfo.label}
              </span>
              <p className="text-xs text-(--color-text-muted) mt-1">Personal Interview Readiness</p>
            </div>
          </div>

          <Link
            href={`/companies/${company.slug}`}
            className="focus-ring w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-400 via-purple-400 to-violet-500 px-6 py-3 text-sm font-bold text-white shadow-[0_6px_24px_rgba(168,85,247,0.3)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_32px_rgba(168,85,247,0.4)]"
          >
            Prepare for {company.name} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </Surface>
  );
}

/* ── 4. Company Overview Card (When Content Exists) ────────── */

export function CompanyOverviewCard({
  company,
}: {
  company: CompanyPrepDTO;
}) {
  const readinessInfo = formatCompanyReadiness(company.readiness);
  const monogram = getCompanyMonogram(company.name);
  const gradient = getMonogramGradient(company.slug);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col justify-between rounded-2xl border border-(--color-border) bg-(--color-surface-1) shadow-xs dark:shadow-none p-5 sm:p-6 transition hover:border-purple-300/40 hover:bg-(--color-surface-2) hover:shadow-[0_12px_32px_rgba(168,85,247,0.12)]"
    >
      <div className="space-y-4">
        {/* Top row: Monogram, Name, Category & Readiness */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`grid size-11 place-items-center rounded-xl font-bold text-base bg-gradient-to-br border ${gradient} flex-shrink-0`}
            >
              {monogram}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-(--color-text-primary) group-hover:text-(--color-purple) transition">
                  {company.name}
                </h3>
                {company.isTargetCompany && (
                  <span className="rounded bg-purple-400/20 border border-purple-400/30 px-1.5 py-0.5 text-[9px] font-bold text-purple-600 dark:text-purple-200">
                    Target
                  </span>
                )}
              </div>
              <span className="text-xs text-(--color-text-muted)">{company.category}</span>
            </div>
          </div>
          <MasteryRing value={company.readiness} size="sm" />
        </div>

        {/* Readiness and Sets Info */}
        <div className="flex items-center justify-between text-xs pt-1 border-t border-(--color-border)">
          <span className="text-(--color-text-muted)">
            {company.sets} problem sets · {company.problemCount} problems
          </span>
          <span className={`font-semibold ${readinessInfo.color}`}>
            {company.readiness}% {readinessInfo.label}
          </span>
        </div>

        {/* Most Asked Patterns */}
        {company.patterns.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-(--color-text-muted)">
              Most Asked Patterns
            </span>
            <div className="flex flex-wrap gap-1.5">
              {company.patterns.map((pat) => (
                <span
                  key={pat}
                  className="rounded-md border border-(--color-border) bg-(--color-surface-2) px-2 py-0.5 text-[11px] font-medium text-(--color-text-secondary) group-hover:border-purple-400/30 transition"
                >
                  {pat}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Primary CTA */}
      <div className="pt-5 mt-4 border-t border-(--color-border)">
        <Link
          href={`/companies/${company.slug}`}
          className="focus-ring flex items-center justify-center gap-2 w-full rounded-xl border border-purple-400/30 bg-purple-500/10 py-2.5 text-xs font-bold text-(--color-purple) transition hover:bg-purple-500/20 group-hover:border-purple-400/50"
        >
          Prepare for {company.name} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </motion.div>
  );
}

/* ── 5. Main Company Prep View ─────────────────────────────── */

export function CompanyPrepView({
  data,
  companies: legacyCompanies,
}: {
  data?: CompanyPrepPageData;
  companies?: any[];
}) {
  const shouldReduceMotion = useReducedMotion();

  // Normalize data support
  const pageData: CompanyPrepPageData = data ?? {
    companies: (legacyCompanies ?? []).map((c) => ({
      id: c.id ?? c.slug,
      slug: c.slug,
      name: c.name,
      category: c.focus?.[0] ? String(c.focus[0]).replace("_", " ") : "Technology",
      patterns: [],
      problemCount: 0,
      sets: c.sets ?? 0,
      readiness: c.readiness ?? 0,
      focus: c.focus ?? [],
      isTargetCompany: false,
      hasContent: Boolean(c.sets > 0 || (c.patterns && c.patterns.length > 0)),
      status: "not_started",
    })),
    targetCompany: null,
    hasAnyCompanyContent: Boolean(legacyCompanies?.some((c) => c.sets > 0)),
  };

  const { companies, targetCompany, hasAnyCompanyContent } = pageData;

  // Separate companies with content vs. in curation
  const companiesWithContent = companies.filter((c) => c.hasContent);
  const companiesInCuration = companies.filter((c) => !c.hasContent);

  // If student has target company, check if it has content
  const targetCompanyWithContent = targetCompany
    ? companiesWithContent.find((c) => c.slug === targetCompany.slug || c.id === targetCompany.id)
    : null;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header */}
      <PageHeader
        title="Company Prep"
        description="Targeted interview preparation based on company-specific pattern distributions."
      />

      {/* Pedagogical Micro-Pipeline */}
      <CompanyPrepPipeline />

      {/* Content vs. Empty State */}
      {!hasAnyCompanyContent ? (
        <CompanyPrepEmptyState
          targetCompany={targetCompany}
          pipelineCompanies={companies}
        />
      ) : (
        <div className="space-y-8">
          {/* Target Company Hero (if target company has content) */}
          {targetCompanyWithContent && (
            <TargetCompanyHeroCard company={targetCompanyWithContent} />
          )}

          {/* Company Grid (for companies with content) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-(--color-text-primary)">Available Company Curations</h2>
                <p className="text-xs text-(--color-text-muted) mt-0.5">
                  Explore interview sets with verified pattern frequencies.
                </p>
              </div>
              <span className="text-xs font-medium text-(--color-text-muted)">
                {companiesWithContent.length} available
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {companiesWithContent
                .filter((c) => c.slug !== targetCompanyWithContent?.slug)
                .map((company) => (
                  <CompanyOverviewCard key={company.slug} company={company} />
                ))}
            </div>
          </div>

          {/* Companies in Curation (Secondary) */}
          {companiesInCuration.length > 0 && (
            <div className="space-y-4 pt-6 border-t border-(--color-border)">
              <div>
                <h3 className="text-sm font-semibold text-(--color-text-primary)">More Companies in Curation</h3>
                <p className="text-xs text-(--color-text-muted) mt-0.5">
                  Upcoming interview sets currently being researched and added.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {companiesInCuration.map((company) => {
                  const monogram = getCompanyMonogram(company.name);
                  const gradient = getMonogramGradient(company.slug);
                  return (
                    <div
                      key={company.slug}
                      className="flex items-center justify-between gap-3 rounded-xl border border-(--color-border) bg-(--color-surface-1) shadow-xs dark:shadow-none p-3.5"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`grid size-9 place-items-center rounded-lg font-bold text-xs bg-gradient-to-br border ${gradient} flex-shrink-0`}
                        >
                          {monogram}
                        </div>
                        <div className="min-w-0">
                          <span className="truncate text-xs font-semibold text-(--color-text-primary) block">
                            {company.name}
                          </span>
                          <span className="text-[11px] text-(--color-text-muted)">{company.category}</span>
                        </div>
                      </div>
                      <span className="rounded-full border border-(--color-border) bg-(--color-surface-2) px-2 py-0.5 text-[10px] font-medium text-(--color-text-muted)">
                        In Curation
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
