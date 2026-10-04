"use client";

import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Code2,
  Edit3,
  Gauge,
  Lightbulb,
  Puzzle,
  RefreshCw,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  completeOnboardingAction,
  saveOnboardingDraftAction,
  skipOnboardingAction,
} from "@/features/onboarding/actions/onboarding.actions";
import {
  companySlugs,
  onboardingSchema,
  type OnboardingInput,
} from "@/features/onboarding/validators/onboarding.validators";
import {
  generateRoadmapPreview,
  hasCompletePreviewInputs,
} from "@/features/onboarding/planning";

import {
  ONBOARDING_STEPS,
  type OnboardingStepId,
  type Draft,
  STEP_LABELS,
  resolveInitialStepId,
} from "@/features/onboarding/utils/onboarding-steps";

export {
  ONBOARDING_STEPS,
  type OnboardingStepId,
  type Draft,
  STEP_LABELS,
  resolveInitialStepId,
};

const companyLabels: Record<(typeof companySlugs)[number], string> = {
  amazon: "Amazon",
  google: "Google",
  microsoft: "Microsoft",
  adobe: "Adobe",
  flipkart: "Flipkart",
  atlassian: "Atlassian",
  other: "Other Targets",
};

const phaseLabels: Record<string, string> = {
  orientation: "Concept Foundation",
  mechanics: "Core Operations",
  pattern_recognition: "Pattern Recognition",
  guided_practice: "Guided Practice",
  independent_practice: "Targeted Problem",
  synthesis: "Complexity & Trade-offs",
  review: "Retention Checkpoint",
};

interface OnboardingWizardProps {
  initialDraft: Draft;
  initialStep?: number;
  requestedStep?: string;
  isCalibrateMode?: boolean;
}

export function OnboardingWizard({
  initialDraft,
  initialStep,
  requestedStep,
  isCalibrateMode = false,
}: OnboardingWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reduceMotion = useReducedMotion();

  const initialStepId = useMemo(
    () => resolveInitialStepId(requestedStep, initialStep, initialDraft, isCalibrateMode),
    [requestedStep, initialStep, initialDraft, isCalibrateMode]
  );

  const [activeStep, setActiveStep] = useState<OnboardingStepId>(initialStepId);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [pending, startTransition] = useTransition();

  // Truthful draft saving states with sequence guard
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const saveSeqRef = useRef(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [completionError, setCompletionError] = useState<string | null>(null);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [companyDisclosureOpen, setCompanyDisclosureOpen] = useState(
    Boolean(initialDraft.companySlugs && initialDraft.companySlugs.length > 0)
  );
  const [expandRemainingWeek, setExpandRemainingWeek] = useState(false);

  // Accessible heading focus and live announcer
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [announcement, setAnnouncement] = useState("");

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      experienceLevel: initialDraft.experienceLevel,
      companySlugs: initialDraft.companySlugs ?? [],
      customCompany: initialDraft.customCompany ?? "",
      dailyMinutes: initialDraft.dailyMinutes,
      language: initialDraft.language,
      topicKnowledgeMode: initialDraft.topicKnowledgeMode,
      knownTopicSlugs: initialDraft.knownTopicSlugs ?? [],
      learningGoal: initialDraft.learningGoal,
    },
  });

  const values = form.watch();
  const errors = form.formState.errors;

  const currentStepIndex = ONBOARDING_STEPS.indexOf(activeStep);
  const isQuestionStep = activeStep !== "plan";

  // Synchronize step with browser back/forward buttons
  useEffect(() => {
    const paramStep = searchParams.get("step") as OnboardingStepId | null;
    if (paramStep && (ONBOARDING_STEPS as readonly string[]).includes(paramStep) && paramStep !== activeStep) {
      const nextIdx = ONBOARDING_STEPS.indexOf(paramStep);
      const prevIdx = ONBOARDING_STEPS.indexOf(activeStep);
      setDirection(nextIdx >= prevIdx ? 1 : -1);
      setActiveStep(paramStep);
    }
  }, [searchParams, activeStep]);

  // Accessible step announcement and focus management
  useEffect(() => {
    if (activeStep === "plan") {
      setAnnouncement("Personalized plan preview and first session");
    } else {
      const info = STEP_LABELS[activeStep];
      setAnnouncement(`Step ${info.index} of 4: ${info.name}`);
    }
    // Subtle delay to let DOM settle before focusing heading
    const timer = setTimeout(() => {
      headingRef.current?.focus();
    }, 120);
    return () => clearTimeout(timer);
  }, [activeStep]);

  // URL state update helper
  const navigateToStep = (newStep: OnboardingStepId, newDirection: 1 | -1) => {
    setDirection(newDirection);
    setActiveStep(newStep);
    setCompletionError(null);

    const params = new URLSearchParams(window.location.search);
    params.set("step", newStep);
    if (isCalibrateMode) {
      params.set("mode", "calibrate");
    }
    const url = `/onboarding?${params.toString()}`;
    window.history.pushState(null, "", url);
  };

  // Perform truthful draft save to server
  const persistDraft = async (stepIdx: number, currentValues: OnboardingInput) => {
    const seq = ++saveSeqRef.current;
    setSaveStatus("saving");
    try {
      await saveOnboardingDraftAction(stepIdx, currentValues);
      if (seq === saveSeqRef.current) {
        setSaveStatus("saved");
      }
    } catch {
      if (seq === saveSeqRef.current) {
        setSaveStatus("error");
      }
    }
  };

  // Debounced auto-save on value change
  const triggerDebouncedSave = (newValues: OnboardingInput) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      void persistDraft(currentStepIndex, newValues);
    }, 600);
  };

  const handleValueChange = <K extends keyof OnboardingInput>(field: K, val: OnboardingInput[K]) => {
    form.setValue(field, val as any, { shouldValidate: true });
    const updated = { ...form.getValues(), [field]: val };
    triggerDebouncedSave(updated);
  };

  // Retry draft save if errored
  const handleRetrySave = () => {
    void persistDraft(currentStepIndex, form.getValues());
  };

  const validateCurrentStep = async (): Promise<boolean> => {
    if (activeStep === "goal") {
      const valid = await form.trigger(["learningGoal", "customCompany"]);
      return valid;
    }
    if (activeStep === "level") {
      return form.trigger(["experienceLevel"]);
    }
    if (activeStep === "time") {
      return form.trigger(["dailyMinutes"]);
    }
    if (activeStep === "language") {
      return form.trigger(["language"]);
    }
    return true;
  };

  const handleContinue = async () => {
    setCompletionError(null);
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    // Immediately flush save before advancing
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    void persistDraft(currentStepIndex + 1, form.getValues());

    const nextIndex = currentStepIndex + 1;
    if (nextIndex < ONBOARDING_STEPS.length) {
      navigateToStep(ONBOARDING_STEPS[nextIndex], 1);
    }
  };

  const handleBack = () => {
    setCompletionError(null);
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      navigateToStep(ONBOARDING_STEPS[prevIndex], -1);
    }
  };

  const handleStartSession = () => {
    setCompletionError(null);
    startTransition(async () => {
      try {
        const result = await completeOnboardingAction(form.getValues());
        const destination = result?.targetUrl || "/dashboard";
        router.replace(destination);
      } catch {
        setCompletionError("Unable to initialize your learning session. Please try again.");
      }
    });
  };

  const handleSkipConfirm = async () => {
    setSkipping(true);
    try {
      await skipOnboardingAction();
      window.location.assign("/dashboard");
    } catch {
      setSkipping(false);
      setShowSkipModal(false);
    }
  };

  const preview = useMemo(() => {
    if (activeStep !== "plan") return null;
    return generateRoadmapPreview(values);
  }, [activeStep, values]);

  // Motion variants with strict reduced-motion adherence
  const pageVariants: Variants = {
    enter: (dir: number) => ({
      x: reduceMotion ? 0 : dir > 0 ? 14 : -14,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
      transition: {
        duration: reduceMotion ? 0 : 0.19,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    },
    exit: (dir: number) => ({
      x: reduceMotion ? 0 : dir > 0 ? -14 : 14,
      opacity: 0,
      transition: {
        duration: reduceMotion ? 0 : 0.16,
        ease: [0.16, 1, 0.3, 1] as const,
      },
    }),
  };

  const planStaggerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: reduceMotion
        ? { duration: 0 }
        : {
            staggerChildren: 0.04,
            delayChildren: 0.02,
          },
    },
  };

  const planItemVariants: Variants = {
    hidden: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: reduceMotion
        ? { duration: 0 }
        : {
            duration: 0.24,
            ease: [0.16, 1, 0.3, 1] as const,
          },
    },
  };

  const progressPercent = isQuestionStep ? ((currentStepIndex + 1) / 4) * 100 : 100;

  return (
    <main className="relative min-h-screen bg-(--bg-app) text-white antialiased selection:bg-(--accent-lime) selection:text-black">
      {/* Accessible live announcer for screen readers */}
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Subtle brand glow (Lime ambient) */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(183,243,107,0.06), transparent 70%)",
        }}
        aria-hidden="true"
      />

      {/* Full-page Onboarding Container */}
      <div className="relative mx-auto flex min-h-screen max-w-4xl flex-col px-4 py-5 sm:px-8 sm:py-7">
        {/* Top Header */}
        <header className="flex items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime)"
            aria-label="DSA Club Home"
          >
            <Image
              src="/icons/dsa-club-logo-text.png"
              alt="DSA Club"
              width={132}
              height={32}
              className="h-7 w-auto object-contain"
              priority
            />
          </Link>

          <div className="flex items-center gap-3">
            {/* Truthful Save State indicator */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-colors ${
                saveStatus === "error"
                  ? "border border-rose-500/30 bg-rose-500/10 text-rose-300"
                  : "border border-white/[0.08] bg-white/[0.03] text-(--text-muted)"
              }`}
            >
              {saveStatus === "saving" && (
                <>
                  <RefreshCw size={11} className="animate-spin text-(--accent-lime)" aria-hidden="true" />
                  <span>Saving…</span>
                </>
              )}
              {saveStatus === "saved" && (
                <>
                  <Check size={11} className="text-(--accent-lime)" aria-hidden="true" />
                  <span className="text-slate-300">Saved</span>
                </>
              )}
              {saveStatus === "error" && (
                <button
                  type="button"
                  onClick={handleRetrySave}
                  className="flex items-center gap-1 hover:text-white focus-visible:outline-none"
                  title="Click to retry saving draft"
                >
                  <AlertCircle size={11} aria-hidden="true" />
                  <span>Save failed · Retry</span>
                </button>
              )}
              {saveStatus === "idle" && (
                <>
                  <Clock3 size={11} className="text-slate-400" aria-hidden="true" />
                  <span>Draft saved</span>
                </>
              )}
            </div>

            {/* Discreet Starter Plan Link - First-time only */}
            {!isCalibrateMode && (
              <button
                type="button"
                onClick={() => setShowSkipModal(true)}
                aria-label="Skip setup - Start with a starter plan"
                className="text-xs font-medium text-(--text-muted) transition hover:text-slate-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--accent-lime) rounded px-2 py-1"
              >
                Start with a starter plan
              </button>
            )}

            {isCalibrateMode && (
              <span className="inline-flex items-center gap-1 rounded-full border border-(--accent-lime)/30 bg-(--accent-lime)/10 px-2.5 py-0.5 text-[11px] font-semibold text-(--accent-lime)">
                Calibrate plan
              </span>
            )}
          </div>
        </header>

        {/* Progress Section (Questions 1 to 4) */}
        {isQuestionStep && (
          <div className="mt-5 sm:mt-6">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                {STEP_LABELS[activeStep].index} of 4 · {STEP_LABELS[activeStep].name}
              </span>
              <span className="text-[11px] text-(--text-muted)">
                {Math.round(progressPercent)}% completed
              </span>
            </div>
            <div
              className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.08]"
              role="progressbar"
              aria-valuenow={STEP_LABELS[activeStep].index}
              aria-valuemin={1}
              aria-valuemax={4}
              aria-label={`Step ${STEP_LABELS[activeStep].index} of 4`}
            >
              <motion.div
                className="h-full rounded-full bg-(--accent-lime)"
                animate={{ width: `${progressPercent}%` }}
                transition={{
                  duration: reduceMotion ? 0 : 0.25,
                  ease: "easeInOut",
                }}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="my-auto flex flex-1 flex-col justify-center py-6 sm:py-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={activeStep}
              custom={direction}
              variants={pageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full"
            >
              {/* ──────────────────────────────────────────────────────────
                  SCREEN 1: GOAL
                  ────────────────────────────────────────────────────────── */}
              {activeStep === "goal" && (
                <div className="space-y-6">
                  {/* Expectation context header */}
                  <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-1.5 text-xs font-medium text-(--accent-lime)">
                      <Sparkles size={13} aria-hidden="true" />
                      <span>4 quick choices · about a minute · change anytime.</span>
                    </div>
                    <h1
                      ref={headingRef}
                      tabIndex={-1}
                      className="text-2xl font-bold tracking-tight text-white focus:outline-none sm:text-3xl"
                    >
                      What are you learning DSA for?
                    </h1>
                    <p className="text-xs text-(--text-muted) sm:text-sm">
                      Choose what you want to achieve; we’ll focus your practice order and problem priorities.
                    </p>
                  </div>

                  {/* Goal Cards Grid */}
                  <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Learning Goal">
                    {[
                      {
                        value: "foundation",
                        title: "Build strong foundations",
                        detail: "Master core invariants, memory models, and fundamental data structures.",
                      },
                      {
                        value: "placement",
                        title: "Campus placement",
                        detail: "Targeted preparation for college technical rounds and coding assessments.",
                      },
                      {
                        value: "internship",
                        title: "Internship",
                        detail: "Practical problem solving and high-yield patterns for early internship rounds.",
                      },
                      {
                        value: "interview",
                        title: "Interview preparation",
                        detail: "High-frequency interview patterns, edge case intuition, and timed speed.",
                      },
                      {
                        value: "switch",
                        title: "Switch companies",
                        detail: "Targeted senior problem solving and high-yield algorithmic techniques.",
                      },
                      {
                        value: "not_sure",
                        title: "Not sure yet",
                        detail: "Start with a balanced foundation; you can adapt direction anytime.",
                      },
                    ].map((opt) => {
                      const isSelected = values.learningGoal === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => handleValueChange("learningGoal", opt.value as OnboardingInput["learningGoal"])}
                          className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime) ${
                            isSelected
                              ? "border-(--accent-lime) bg-(--accent-lime)/[0.08] shadow-[0_0_20px_rgba(183,243,107,0.12)]"
                              : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18] hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <span className="text-sm font-semibold text-slate-100 group-hover:text-white">
                              {opt.title}
                            </span>
                            <span
                              className={`flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                isSelected
                                  ? "border-(--accent-lime) bg-(--accent-lime) text-black"
                                  : "border-white/20"
                              }`}
                            >
                              {isSelected && <Check size={10} strokeWidth={3.5} aria-hidden="true" />}
                            </span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-(--text-muted)">{opt.detail}</p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Optional Disclosure: Add a company focus */}
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <button
                      type="button"
                      onClick={() => setCompanyDisclosureOpen((v) => !v)}
                      className="flex w-full items-center justify-between text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--accent-lime) rounded"
                      aria-expanded={companyDisclosureOpen}
                      aria-controls="company-disclosure-content"
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                        <Building2 size={14} className="text-(--accent-lime)" aria-hidden="true" />
                        <span>Add a company focus</span>
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-normal text-(--text-muted)">
                          Optional · No company focus is valid
                        </span>
                      </div>
                      {companyDisclosureOpen ? (
                        <ChevronUp size={15} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={15} className="text-slate-400" />
                      )}
                    </button>

                    {companyDisclosureOpen && (
                      <div id="company-disclosure-content" className="mt-4 space-y-3 pt-3 border-t border-white/[0.06]">
                        <p className="text-[11px] text-(--text-muted)">
                          Select up to 3 target companies to boost high-frequency interview patterns, or leave unselected for broad coverage.
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {companySlugs.map((slug) => {
                            const isSelected = values.companySlugs?.includes(slug);
                            return (
                              <button
                                key={slug}
                                type="button"
                                onClick={() => {
                                  const current = values.companySlugs ?? [];
                                  const nextSlugs = isSelected
                                    ? current.filter((s) => s !== slug)
                                    : current.length < 3
                                    ? [...current, slug]
                                    : current;
                                  handleValueChange("companySlugs", nextSlugs as OnboardingInput["companySlugs"]);
                                  if (slug === "other" && isSelected) {
                                    handleValueChange("customCompany", "");
                                  }
                                }}
                                className={`flex items-center justify-between rounded-lg border p-2.5 text-left text-xs transition duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--accent-lime) ${
                                  isSelected
                                    ? "border-(--accent-lime) bg-(--accent-lime)/[0.08] text-white"
                                    : "border-white/[0.06] bg-black/20 text-slate-300 hover:border-white/[0.14]"
                                }`}
                              >
                                <span className="font-medium">{companyLabels[slug]}</span>
                                <span
                                  className={`flex size-3.5 items-center justify-center rounded-full border transition ${
                                    isSelected
                                      ? "border-(--accent-lime) bg-(--accent-lime) text-black"
                                      : "border-white/20"
                                  }`}
                                >
                                  {isSelected && <Check size={8} strokeWidth={3} aria-hidden="true" />}
                                </span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Custom company input when "other" is selected */}
                        {values.companySlugs?.includes("other") && (
                          <div className="rounded-lg border border-(--accent-lime)/30 bg-(--accent-lime)/[0.04] p-3 text-xs">
                            <label htmlFor="customCompanyInput" className="block font-medium text-slate-200">
                              Target company name:
                            </label>
                            <input
                              id="customCompanyInput"
                              type="text"
                              placeholder="e.g. Uber, Netflix, Stripe..."
                              value={values.customCompany ?? ""}
                              onChange={(e) => handleValueChange("customCompany", e.target.value)}
                              className="mt-1.5 w-full rounded-md border border-white/[0.12] bg-black/40 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:border-(--accent-lime) focus:outline-none focus:ring-1 focus:ring-(--accent-lime)"
                              maxLength={50}
                            />
                            {errors.customCompany && (
                              <p className="mt-1 text-[11px] text-rose-400">
                                {errors.customCompany.message}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────
                  SCREEN 2: STARTING POINT
                  ────────────────────────────────────────────────────────── */}
              {activeStep === "level" && (
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <h1
                      ref={headingRef}
                      tabIndex={-1}
                      className="text-2xl font-bold tracking-tight text-white focus:outline-none sm:text-3xl"
                    >
                      Where are you starting from?
                    </h1>
                    <p className="text-xs text-(--text-muted) sm:text-sm">
                      We’ll set your active learning frontier without unnecessary repetition.
                    </p>
                  </div>

                  <div className="grid gap-3" role="radiogroup" aria-label="Starting Point">
                    {[
                      {
                        value: "beginner",
                        title: "New to DSA",
                        detail: "Starting with foundational concepts, visual models, and clean invariants.",
                      },
                      {
                        value: "intermediate",
                        title: "Know the basics; building pattern intuition",
                        detail: "Comfortable with syntax and basic loops; need structured pattern mastery.",
                      },
                      {
                        value: "advanced",
                        title: "Solve problems; need interview depth",
                        detail: "Can implement standard patterns; focusing on optimization, edge cases, and speed.",
                      },
                    ].map((opt) => {
                      const isSelected = values.experienceLevel === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() =>
                            handleValueChange("experienceLevel", opt.value as OnboardingInput["experienceLevel"])
                          }
                          className={`group relative flex items-start justify-between rounded-xl border p-4 text-left transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime) ${
                            isSelected
                              ? "border-(--accent-lime) bg-(--accent-lime)/[0.08] shadow-[0_0_20px_rgba(183,243,107,0.12)]"
                              : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18] hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="space-y-1">
                            <span className="block text-sm font-semibold text-slate-100 group-hover:text-white">
                              {opt.title}
                            </span>
                            <span className="block text-xs leading-5 text-(--text-muted)">{opt.detail}</span>
                          </div>
                          <span
                            className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                              isSelected
                                ? "border-(--accent-lime) bg-(--accent-lime) text-black"
                                : "border-white/20"
                            }`}
                          >
                            {isSelected && <Check size={10} strokeWidth={3.5} aria-hidden="true" />}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────
                  SCREEN 3: REALISTIC TIME
                  ────────────────────────────────────────────────────────── */}
              {activeStep === "time" && (
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <h1
                      ref={headingRef}
                      tabIndex={-1}
                      className="text-2xl font-bold tracking-tight text-white focus:outline-none sm:text-3xl"
                    >
                      How much time can you realistically give each day?
                    </h1>
                    <p className="text-xs text-(--text-muted) sm:text-sm">
                      A sustainable daily habit beats occasional marathon sessions. Missed days adjust automatically.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Daily Time">
                    {[
                      {
                        value: 15,
                        title: "15 minutes",
                        detail: "One quick concept or problem invariant · Sustainable habit",
                        hint: "Fits busy schedules · Steady retention without calendar friction.",
                      },
                      {
                        value: 30,
                        title: "30 minutes",
                        detail: "One focused pattern session · High retention with steady progress",
                        hint: "Completes typical foundation topics in ~10 days. Our most popular pace.",
                      },
                      {
                        value: 45,
                        title: "45 minutes",
                        detail: "Concept walkthrough + targeted problem · Solid daily depth",
                        hint: "Balanced pace for active pattern intuition and deliberate practice.",
                      },
                      {
                        value: 60,
                        title: "60 minutes",
                        detail: "Full problem cycle with edge case analysis and variations",
                        hint: "Accelerated topic progression with 1–2 complete problems daily.",
                      },
                    ].map((opt) => {
                      const isSelected = Number(values.dailyMinutes) === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => handleValueChange("dailyMinutes", opt.value as OnboardingInput["dailyMinutes"])}
                          className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime) ${
                            isSelected
                              ? "border-(--accent-lime) bg-(--accent-lime)/[0.08] shadow-[0_0_20px_rgba(183,243,107,0.12)]"
                              : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18] hover:bg-white/[0.04]"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-100 group-hover:text-white">
                                {opt.title}
                              </span>
                              <span
                                className={`flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                  isSelected
                                    ? "border-(--accent-lime) bg-(--accent-lime) text-black"
                                    : "border-white/20"
                                }`}
                              >
                                {isSelected && <Check size={10} strokeWidth={3.5} aria-hidden="true" />}
                              </span>
                            </div>
                            <p className="mt-1.5 text-xs leading-5 text-(--text-muted)">{opt.detail}</p>
                          </div>
                          {isSelected && (
                            <div className="mt-3 rounded-lg border border-(--accent-lime)/20 bg-(--accent-lime)/[0.06] p-2 text-[11px] font-medium text-(--accent-lime)">
                              {opt.hint}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────
                  SCREEN 4: CODING LANGUAGE
                  ────────────────────────────────────────────────────────── */}
              {activeStep === "language" && (
                <div className="space-y-6">
                  <div className="space-y-1.5">
                    <h1
                      ref={headingRef}
                      tabIndex={-1}
                      className="text-2xl font-bold tracking-tight text-white focus:outline-none sm:text-3xl"
                    >
                      Which language do you prefer to code in?
                    </h1>
                    <p className="text-xs text-(--text-muted) sm:text-sm">
                      Code walkthroughs, patterns, and hints will use this language. Topic ordering remains universal.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Coding Language">
                    {[
                      {
                        value: "cpp",
                        title: "C++",
                        detail: "STL containers, pointers, and high-performance algorithmic execution.",
                      },
                      {
                        value: "java",
                        title: "Java",
                        detail: "Strict typing, OOP structures, and enterprise interview standards.",
                      },
                      {
                        value: "python",
                        title: "Python",
                        detail: "Fast, readable syntax with expressive native data structures.",
                      },
                      {
                        value: "javascript",
                        title: "JavaScript",
                        detail: "Web-native arrays, objects, and modern algorithmic problem-solving.",
                      },
                    ].map((opt) => {
                      const isSelected = values.language === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="radio"
                          aria-checked={isSelected}
                          onClick={() => handleValueChange("language", opt.value as OnboardingInput["language"])}
                          className={`group relative flex flex-col justify-between rounded-xl border p-4 text-left transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime) ${
                            isSelected
                              ? "border-(--accent-lime) bg-(--accent-lime)/[0.08] shadow-[0_0_20px_rgba(183,243,107,0.12)]"
                              : "border-white/[0.08] bg-white/[0.02] hover:border-white/[0.18] hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-semibold text-slate-100 group-hover:text-white">
                              {opt.title}
                            </span>
                            <span
                              className={`flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors ${
                                isSelected
                                  ? "border-(--accent-lime) bg-(--accent-lime) text-black"
                                  : "border-white/20"
                              }`}
                            >
                              {isSelected && <Check size={10} strokeWidth={3.5} aria-hidden="true" />}
                            </span>
                          </div>
                          <p className="mt-1.5 text-xs leading-5 text-(--text-muted)">{opt.detail}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ──────────────────────────────────────────────────────────
                  SCREEN 5: YOUR PLAN
                  ────────────────────────────────────────────────────────── */}
              {activeStep === "plan" && (
                <div className="space-y-6">
                  {!hasCompletePreviewInputs(values) || !preview ? (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
                      <p className="text-sm font-medium text-amber-200">
                        Please finish answering the previous questions to generate your preview.
                      </p>
                      <button
                        type="button"
                        onClick={() => navigateToStep("goal", -1)}
                        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-(--accent-lime) px-4 py-2 text-xs font-semibold text-black"
                      >
                        Return to first question
                      </button>
                    </div>
                  ) : (
                    <motion.div
                      variants={planStaggerVariants}
                      initial="hidden"
                      animate="visible"
                      className="space-y-5"
                    >
                      {/* Plan Heading */}
                      <motion.div variants={planItemVariants} className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-(--accent-lime)/30 bg-(--accent-lime)/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-(--accent-lime)">
                            <span className="size-1.5 rounded-full bg-(--accent-lime) animate-pulse" aria-hidden="true" />
                            {isCalibrateMode ? "Calibrated Plan Ready" : "Personalized Plan Ready"}
                          </span>
                        </div>
                        <h1
                          ref={headingRef}
                          tabIndex={-1}
                          className="text-2xl font-bold tracking-tight text-white focus:outline-none sm:text-3xl"
                        >
                          Your first DSA session
                        </h1>
                        <p className="text-xs text-(--text-muted) sm:text-sm">
                          Personalized around your time, starting point, and goals. You can adjust any preference below anytime.
                        </p>
                      </motion.div>

                      {/* Preference summary row with direct Edit actions */}
                      <motion.div variants={planItemVariants} className="flex flex-wrap gap-2 text-xs">
                        <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-slate-200">
                          <Target size={13} className="text-(--accent-lime)" aria-hidden="true" />
                          <span>{preview.summary.learningGoalLabel}</span>
                          <button
                            type="button"
                            onClick={() => navigateToStep("goal", -1)}
                            className="ml-1 inline-flex items-center gap-0.5 text-[11px] text-(--text-muted) hover:text-(--accent-lime) focus-visible:outline-none"
                            title="Edit goal"
                          >
                            <Edit3 size={11} aria-hidden="true" />
                            <span className="underline">Edit</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-slate-200">
                          <Gauge size={13} className="text-(--accent-lime)" aria-hidden="true" />
                          <span>{preview.summary.experienceLabel}</span>
                          <button
                            type="button"
                            onClick={() => navigateToStep("level", -1)}
                            className="ml-1 inline-flex items-center gap-0.5 text-[11px] text-(--text-muted) hover:text-(--accent-lime) focus-visible:outline-none"
                            title="Edit level"
                          >
                            <Edit3 size={11} aria-hidden="true" />
                            <span className="underline">Edit</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-slate-200">
                          <Clock3 size={13} className="text-(--accent-lime)" aria-hidden="true" />
                          <span>{preview.summary.dailyMinutes} min/day</span>
                          <button
                            type="button"
                            onClick={() => navigateToStep("time", -1)}
                            className="ml-1 inline-flex items-center gap-0.5 text-[11px] text-(--text-muted) hover:text-(--accent-lime) focus-visible:outline-none"
                            title="Edit daily time"
                          >
                            <Edit3 size={11} aria-hidden="true" />
                            <span className="underline">Edit</span>
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-slate-200">
                          <Code2 size={13} className="text-(--accent-lime)" aria-hidden="true" />
                          <span>{preview.summary.languageLabel}</span>
                          <button
                            type="button"
                            onClick={() => navigateToStep("language", -1)}
                            className="ml-1 inline-flex items-center gap-0.5 text-[11px] text-(--text-muted) hover:text-(--accent-lime) focus-visible:outline-none"
                            title="Edit language"
                          >
                            <Edit3 size={11} aria-hidden="true" />
                            <span className="underline">Edit</span>
                          </button>
                        </div>

                        {preview.summary.companies.length > 0 && (
                          <div className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-slate-200">
                            <Building2 size={13} className="text-(--accent-lime)" aria-hidden="true" />
                            <span>
                              {preview.summary.customCompany
                                ? preview.summary.customCompany
                                : preview.summary.companyLabels.join(", ")}
                            </span>
                            <button
                              type="button"
                              onClick={() => navigateToStep("goal", -1)}
                              className="ml-1 inline-flex items-center gap-0.5 text-[11px] text-(--text-muted) hover:text-(--accent-lime) focus-visible:outline-none"
                              title="Edit target companies"
                            >
                              <Edit3 size={11} aria-hidden="true" />
                              <span className="underline">Edit</span>
                            </button>
                          </div>
                        )}
                      </motion.div>

                      {/* First Learning Session (Visually Dominant Focus) */}
                      <motion.div
                        variants={planItemVariants}
                        className="rounded-2xl border border-(--accent-lime)/40 bg-white/[0.03] p-5 shadow-[0_0_28px_rgba(183,243,107,0.1)] sm:p-6"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-(--accent-lime)/30 bg-(--accent-lime)/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-(--accent-lime)">
                            <span className="size-1.5 rounded-full bg-(--accent-lime) animate-pulse" aria-hidden="true" />
                            Today · First Session · Ready to start
                          </span>
                          <span className="flex items-center gap-1 text-xs font-semibold text-slate-300">
                            <Clock3 size={13} className="text-(--accent-lime)" aria-hidden="true" />
                            {preview.firstStep.estimatedMinutes} minutes
                          </span>
                        </div>

                        <h2 className="mt-3 text-xl font-bold text-white sm:text-2xl">
                          {preview.firstStep.topicName}
                        </h2>
                        <p className="mt-1 text-xs text-(--text-muted) sm:text-sm">
                          {preview.firstStep.title} · {preview.firstStep.focus}
                        </p>

                        <div className="mt-4 border-t border-white/[0.08] pt-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            Today’s 3-step practice flow:
                          </p>
                          <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
                            {preview.firstStep.breakdown.map((block) => {
                              const Icon = block.step === 1 ? Lightbulb : block.step === 2 ? Puzzle : Zap;
                              return (
                                <div
                                  key={block.step}
                                  className="rounded-xl border border-white/[0.06] bg-black/30 p-3 transition hover:border-(--accent-lime)/30"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="flex size-5 items-center justify-center rounded-md bg-(--accent-lime)/15 text-[10px] font-bold text-(--accent-lime)">
                                      {block.step}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-200">
                                      {block.title}
                                    </span>
                                  </div>
                                  <p className="mt-1.5 text-[11px] leading-4 text-slate-400">
                                    {block.detail}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>

                      {/* First-Week Learning Days with Expansion */}
                      <motion.div
                        variants={planItemVariants}
                        className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 sm:p-6"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                            Upcoming week schedule
                          </h3>
                          <span className="text-[11px] text-(--text-muted)">
                            {preview.summary.dailyMinutes} min/day pace
                          </span>
                        </div>

                        {/* Visible Days (Day 1 to 4) */}
                        <div className="relative mt-4 space-y-2 pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-px before:bg-white/[0.08]">
                          {preview.schedule
                            .slice(0, expandRemainingWeek ? 7 : 4)
                            .map((day) => (
                              <div
                                key={day.dayNumber}
                                className={`relative flex flex-col justify-between rounded-lg p-2.5 text-xs transition sm:flex-row sm:items-center sm:gap-4 ${
                                  day.isFirstDay
                                    ? "border border-(--accent-lime)/30 bg-(--accent-lime)/[0.05]"
                                    : "border border-transparent hover:border-white/[0.06] hover:bg-white/[0.02]"
                                }`}
                              >
                                <span
                                  className={`absolute -left-6 top-3.5 size-2 rounded-full ${
                                    day.isFirstDay
                                      ? "bg-(--accent-lime) ring-4 ring-(--accent-lime)/20"
                                      : day.isReviewOrCheckpoint
                                      ? "bg-(--accent-lime)/80 ring-2 ring-white/10"
                                      : "bg-slate-500 ring-2 ring-white/10"
                                  }`}
                                  aria-hidden="true"
                                />

                                <div className="flex items-center gap-2">
                                  <span
                                    className={`font-mono text-[11px] font-semibold ${
                                      day.isFirstDay ? "text-(--accent-lime)" : "text-slate-400"
                                    }`}
                                  >
                                    {day.dayLabel}
                                  </span>
                                  <span className="font-semibold text-slate-100">{day.title}</span>
                                  {day.phase && (
                                    <span className="hidden rounded bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-slate-400 sm:inline-block">
                                      {phaseLabels[day.phase] || day.phase}
                                    </span>
                                  )}
                                </div>

                                <div className="mt-1 text-[11px] text-(--text-muted) sm:mt-0">
                                  {day.isFirstDay ? (
                                    <span className="font-semibold text-(--accent-lime)">Start today</span>
                                  ) : day.isReviewOrCheckpoint ? (
                                    <span className="text-(--accent-lime)/80">Checkpoint & buffer</span>
                                  ) : (
                                    <span>{day.focus}</span>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>

                        {/* Expand / Collapse Button */}
                        {preview.schedule.length > 4 && (
                          <div className="mt-3 pt-3 border-t border-white/[0.06] text-center">
                            <button
                              type="button"
                              onClick={() => setExpandRemainingWeek((v) => !v)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--accent-lime) hover:underline focus-visible:outline-none"
                            >
                              <span>
                                {expandRemainingWeek
                                  ? "Show fewer days"
                                  : `Show remaining week (Days 5–${preview.schedule.length})`}
                              </span>
                              {expandRemainingWeek ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                            </button>
                          </div>
                        )}
                      </motion.div>

                      {/* Adaptive schedule reassurance */}
                      <motion.div
                        variants={planItemVariants}
                        className="flex items-start gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-xs text-(--text-muted)"
                      >
                        <Sparkles size={14} className="mt-0.5 shrink-0 text-(--accent-lime)" aria-hidden="true" />
                        <span>
                          <strong className="text-slate-200">Adaptive schedule: </strong>
                          Missed days never break streaks or penalize you. The spaced review queue automatically balances your learning pace.
                        </span>
                      </motion.div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Validation & Completion Error alerts */}
              {Object.keys(errors).length > 0 && (
                <p role="alert" className="mt-4 text-xs font-medium text-rose-400">
                  {(Object.values(errors)[0]?.message as string) ?? "Please choose an option to continue."}
                </p>
              )}
              {completionError && (
                <p role="alert" className="mt-4 text-xs font-medium text-rose-400">
                  {completionError}
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Navigation Area */}
        <footer className="mt-auto border-t border-white/[0.06] pt-4 sm:pt-5">
          {isQuestionStep ? (
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={handleBack}
                disabled={currentStepIndex === 0 || pending}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-(--text-muted) transition hover:bg-white/[0.05] hover:text-white disabled:invisible focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime)"
              >
                <ArrowLeft size={14} />
                Back
              </button>

              <button
                type="button"
                onClick={() => void handleContinue()}
                disabled={pending}
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-(--accent-lime) px-5 text-xs font-semibold text-black shadow-[0_4px_16px_rgba(183,243,107,0.2)] transition duration-150 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime)"
              >
                Continue
                <ArrowRight size={14} />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => navigateToStep("language", -1)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-medium text-(--text-muted) transition hover:bg-white/[0.05] hover:text-white focus-visible:outline-none"
              >
                <ArrowLeft size={14} />
                Back to questions
              </button>

              <button
                type="button"
                onClick={handleStartSession}
                disabled={pending}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-(--accent-lime) px-6 text-xs font-bold text-black shadow-[0_4px_24px_rgba(183,243,107,0.25)] transition duration-150 hover:brightness-105 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime)"
              >
                {pending ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    <span>Preparing your first session…</span>
                  </>
                ) : (
                  <>
                    <span>{isCalibrateMode ? "Update my plan" : "Start my first session"}</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </div>
          )}
        </footer>
      </div>

      {/* Discreet Starter Plan Confirmation Dialog */}
      {showSkipModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="skip-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-(--bg-surface) p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 id="skip-dialog-title" className="text-base font-semibold text-white">
                Start with a starter plan?
              </h3>
              <button
                type="button"
                onClick={() => setShowSkipModal(false)}
                className="rounded text-(--text-muted) hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-(--accent-lime)"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-xs leading-5 text-(--text-secondary)">
              You’ll start with our standard foundational curriculum. You can calibrate your goals, schedule, and target companies anytime from settings.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowSkipModal(false)}
                className="rounded-xl px-3.5 py-2 text-xs font-medium text-(--text-muted) transition hover:text-white"
              >
                Keep personalizing
              </button>
              <button
                type="button"
                onClick={handleSkipConfirm}
                disabled={skipping}
                className="rounded-xl bg-(--accent-lime) px-4 py-2 text-xs font-semibold text-black transition hover:brightness-105 active:scale-[0.98] disabled:opacity-50"
              >
                {skipping ? "Starting…" : "Use starter plan"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
