"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Clock3,
  Sparkles,
  Target,
  X,
  Code2,
  Briefcase,
  GraduationCap,
  SlidersHorizontal,
} from "lucide-react";
import { customizeDashboardPlanAction } from "@/features/product/actions/dashboard-plan.actions";
import {
  companySlugs,
  type OnboardingInput,
} from "@/features/onboarding/validators/onboarding.validators";

interface DashboardPlanCustomizerProps {
  initialProfile?: {
    currentLevel?: string;
    dailyMinutes?: number;
    primaryLanguage?: string;
    goals?: string[];
    targetCompanies?: Array<{ name: string; slug: string }>;
    onboarding?: {
      draft?: Partial<OnboardingInput>;
      status?: string;
    };
  };
  onClose: () => void;
  onSuccess?: () => void;
}

const companyLabels: Record<(typeof companySlugs)[number], string> = {
  amazon: "Amazon",
  google: "Google",
  microsoft: "Microsoft",
  adobe: "Adobe",
  flipkart: "Flipkart",
  atlassian: "Atlassian",
  other: "Other Targets",
};

export function DashboardPlanCustomizer({
  initialProfile,
  onClose,
  onSuccess,
}: DashboardPlanCustomizerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const draft = initialProfile?.onboarding?.draft;

  // Initial values derived from draft or profile
  const [experienceLevel, setExperienceLevel] = useState<OnboardingInput["experienceLevel"]>(
    draft?.experienceLevel ||
      (initialProfile?.currentLevel as OnboardingInput["experienceLevel"]) ||
      "beginner"
  );

  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(() => {
    if (draft?.companySlugs?.length) return draft.companySlugs;
    if (initialProfile?.targetCompanies?.length) {
      return initialProfile.targetCompanies.map((c) => c.slug || "amazon");
    }
    return ["amazon"];
  });

  const [customCompany, setCustomCompany] = useState<string>(
    draft?.customCompany || ""
  );

  const [dailyMinutes, setDailyMinutes] = useState<OnboardingInput["dailyMinutes"]>(
    draft?.dailyMinutes ||
      (initialProfile?.dailyMinutes as OnboardingInput["dailyMinutes"]) ||
      30
  );

  const [language, setLanguage] = useState<OnboardingInput["language"]>(
    draft?.language ||
      (initialProfile?.primaryLanguage as OnboardingInput["language"]) ||
      "python"
  );

  const [learningGoal, setLearningGoal] = useState<OnboardingInput["learningGoal"]>(
    draft?.learningGoal || "interview"
  );

  const handleToggleCompany = (slug: string) => {
    setSelectedCompanies((prev) => {
      if (prev.includes(slug)) {
        if (prev.length === 1) return prev; // Keep at least one
        return prev.filter((s) => s !== slug);
      }
      if (prev.length >= 3) {
        // Max 3
        return [...prev.slice(1), slug];
      }
      return [...prev, slug];
    });
  };

  const handleSubmit = () => {
    setError(null);

    if (selectedCompanies.includes("other") && (!customCompany || customCompany.trim().length < 2)) {
      setError("Please specify your target company name (at least 2 characters).");
      return;
    }

    const payload: OnboardingInput = {
      experienceLevel,
      companySlugs: selectedCompanies as OnboardingInput["companySlugs"],
      customCompany: selectedCompanies.includes("other") ? customCompany.trim() : undefined,
      dailyMinutes,
      language,
      knownTopicSlugs: draft?.knownTopicSlugs || [],
      learningGoal,
    };

    startTransition(async () => {
      try {
        await customizeDashboardPlanAction(payload);
        setSuccess(true);
        router.refresh();
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 800);
      } catch (err: any) {
        setError(err?.message || "Failed to update learning plan. Please try again.");
      }
    });
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: -8, scale: 0.99 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.99 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="mt-4 overflow-hidden rounded-2xl border border-(--accent-lime)/30 bg-(--bg-surface) p-5 sm:p-6 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
      aria-label="Customize your learning plan"
    >
      {/* Header */}
      <div className="flex items-start justify-between border-b border-white/[0.08] pb-4">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-(--accent-lime)/30 bg-(--accent-lime)/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-(--accent-lime)">
            <SlidersHorizontal size={11} />
            In-Place Customizer
          </div>
          <h2 className="mt-1.5 text-base sm:text-lg font-bold text-white tracking-tight">
            You can customize your plan here
          </h2>
          <p className="mt-0.5 text-xs text-(--text-muted)">
            Tune your daily commitment, target companies, and learning goals in real time without leaving your dashboard.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="rounded-lg p-1.5 text-(--text-muted) transition hover:bg-white/[0.06] hover:text-white"
          aria-label="Close customizer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Grid of Customization Fields */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* 1. Daily Commitment */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Clock3 size={13} className="text-(--accent-lime)" />
            Daily Time Commitment
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { val: 30, label: "30 min", sub: "Steady habit" },
              { val: 60, label: "1 hour", sub: "Balanced" },
              { val: 120, label: "2 hours", sub: "Accelerated" },
              { val: 180, label: "3+ hours", sub: "Intensive" },
            ].map((item) => {
              const isSelected = dailyMinutes === item.val;
              return (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setDailyMinutes(item.val as OnboardingInput["dailyMinutes"])}
                  className={`rounded-xl border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--accent-lime) ${
                    isSelected
                      ? "border-(--accent-lime) bg-(--accent-lime)/10 text-white shadow-[0_0_12px_rgba(183,243,107,0.1)]"
                      : "border-white/[0.08] bg-white/[0.02] text-(--text-secondary) hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="block text-xs font-semibold text-slate-100">{item.label}</span>
                  <span className="block text-[10px] text-(--text-muted)">{item.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Experience Level */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <GraduationCap size={13} className="text-(--accent-lime)" />
            Experience Level
          </label>
          <div className="space-y-1.5">
            {[
              { val: "beginner", title: "Beginner", sub: "Visual mental models & foundations" },
              { val: "intermediate", title: "Intermediate", sub: "Pattern intuition & standard algorithms" },
              { val: "advanced", title: "Advanced", sub: "Complex optimizations & interview variations" },
            ].map((lvl) => {
              const isSelected = experienceLevel === lvl.val;
              return (
                <button
                  key={lvl.val}
                  type="button"
                  onClick={() => setExperienceLevel(lvl.val as OnboardingInput["experienceLevel"])}
                  className={`w-full flex items-center justify-between rounded-xl border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--accent-lime) ${
                    isSelected
                      ? "border-(--accent-lime) bg-(--accent-lime)/10 text-white"
                      : "border-white/[0.08] bg-white/[0.02] text-(--text-secondary) hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <div>
                    <span className="block text-xs font-semibold text-slate-100">{lvl.title}</span>
                    <span className="block text-[10px] text-(--text-muted)">{lvl.sub}</span>
                  </div>
                  <span
                    className={`flex size-3.5 shrink-0 items-center justify-center rounded-full border ${
                      isSelected
                        ? "border-(--accent-lime) bg-(--accent-lime) text-slate-950"
                        : "border-white/20"
                    }`}
                  >
                    {isSelected && <Check size={8} strokeWidth={3} />}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Primary Language */}
        <div className="space-y-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Code2 size={13} className="text-(--accent-lime)" />
            Language Preference
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {[
              { val: "cpp", label: "C++", sub: "STL Speed" },
              { val: "java", label: "Java", sub: "Enterprise" },
              { val: "python", label: "Python", sub: "Expressive" },
              { val: "javascript", label: "JavaScript", sub: "Web-native" },
            ].map((lang) => {
              const isSelected = language === lang.val;
              return (
                <button
                  key={lang.val}
                  type="button"
                  onClick={() => setLanguage(lang.val as OnboardingInput["language"])}
                  className={`rounded-xl border p-2.5 text-left transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--accent-lime) ${
                    isSelected
                      ? "border-(--accent-lime) bg-(--accent-lime)/10 text-white"
                      : "border-white/[0.08] bg-white/[0.02] text-(--text-secondary) hover:border-white/20 hover:bg-white/[0.04]"
                  }`}
                >
                  <span className="block text-xs font-semibold text-slate-100">{lang.label}</span>
                  <span className="block text-[10px] text-(--text-muted)">{lang.sub}</span>
                </button>
              );
            })}
          </div>

          {/* Goal Selector */}
          <div className="pt-2">
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <Target size={13} className="text-(--accent-lime)" />
              Learning Focus
            </label>
            <select
              value={learningGoal}
              onChange={(e) => setLearningGoal(e.target.value as OnboardingInput["learningGoal"])}
              className="mt-1.5 w-full rounded-xl border border-white/[0.12] bg-black/40 px-3 py-2 text-xs text-white focus:border-(--accent-lime) focus:outline-none"
            >
              <option value="interview">Interview preparation</option>
              <option value="foundation">Strengthen DSA foundations</option>
              <option value="placement">Campus placement season</option>
              <option value="switch">Company switch focus</option>
              <option value="internship">First internship readiness</option>
            </select>
          </div>
        </div>
      </div>

      {/* Target Companies Row */}
      <div className="mt-4 border-t border-white/[0.08] pt-4">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
            <Briefcase size={13} className="text-(--accent-lime)" />
            Target Companies (Select 1 to 3)
          </label>
          <span className="text-[11px] text-(--text-muted)">
            {selectedCompanies.length}/3 selected
          </span>
        </div>

        <div className="mt-2.5 flex flex-wrap gap-2">
          {companySlugs.map((slug) => {
            const isSelected = selectedCompanies.includes(slug);
            return (
              <button
                key={slug}
                type="button"
                onClick={() => handleToggleCompany(slug)}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--accent-lime) ${
                  isSelected
                    ? "border-(--accent-lime) bg-(--accent-lime)/15 text-white"
                    : "border-white/[0.08] bg-white/[0.02] text-(--text-secondary) hover:border-white/20"
                }`}
              >
                <span
                  className={`flex size-3 items-center justify-center rounded-full border ${
                    isSelected
                      ? "border-(--accent-lime) bg-(--accent-lime) text-slate-950"
                      : "border-white/30"
                  }`}
                >
                  {isSelected && <Check size={7} strokeWidth={3} />}
                </span>
                {companyLabels[slug]}
              </button>
            );
          })}
        </div>

        {/* Custom Company Input when "other" is selected */}
        {selectedCompanies.includes("other") && (
          <div className="mt-3 max-w-sm rounded-xl border border-(--accent-lime)/30 bg-(--accent-lime)/[0.05] p-3">
            <label htmlFor="customCompanyInDashboard" className="block text-[11px] font-semibold text-slate-200">
              Target company name:
            </label>
            <input
              id="customCompanyInDashboard"
              type="text"
              placeholder="e.g. Uber, Netflix, Salesforce..."
              value={customCompany}
              onChange={(e) => setCustomCompany(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/[0.12] bg-black/50 px-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-(--accent-lime) focus:outline-none"
              maxLength={50}
            />
            <span className="mt-1 block text-[10px] text-(--text-muted)">
              Used as authentic context for company-targeted practice.
            </span>
          </div>
        )}
      </div>

      {/* Error or Success notification */}
      {error && (
        <p role="alert" className="mt-3 text-xs font-medium text-rose-400">
          {error}
        </p>
      )}
      {success && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-(--accent-lime)/40 bg-(--accent-lime)/10 px-3 py-2 text-xs font-semibold text-(--accent-lime)">
          <Sparkles size={14} />
          Plan customized successfully! Generating updated roadmap…
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={isPending}
          className="rounded-xl border border-white/[0.1] px-4 py-2 text-xs font-medium text-(--text-secondary) transition hover:bg-white/[0.05] hover:text-white"
        >
          Cancel / Back to Dashboard
        </button>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={isPending || success}
          className="inline-flex items-center gap-2 rounded-xl bg-(--accent-lime) px-5 py-2 text-xs font-bold text-(--bg-app) shadow-[0_4px_16px_rgba(183,243,107,0.22)] transition hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Sparkles className="animate-spin" size={14} />
              Applying Plan…
            </>
          ) : (
            <>
              Save & Apply Plan
              <Check size={14} />
            </>
          )}
        </button>
      </div>
    </motion.section>
  );
}
