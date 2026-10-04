"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { LEARNER_STORY_CONTENT } from "./landing-content";
import { cn } from "@/lib/utils";

export function LearnerStorySection() {
  const [selectedStepId, setSelectedStepId] = useState<number>(2); // Default to Step 2 (Learn)

  const handleScrollToHowItWorks = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("how-it-works");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  const getStepStatus = (stepId: number) => {
    if (stepId < selectedStepId) return "complete";
    if (stepId === selectedStepId) return "current";
    return "next";
  };

  const getStepColorStyles = (stepId: number) => {
    switch (stepId) {
      case 1:
        // Review: warning / amber
        return {
          badge: "bg-[#F2B84B]/15 border-[#F2B84B]/30 text-[#F2B84B]",
          tag: "text-[#F2B84B] bg-[#F2B84B]/10",
        };
      case 2:
        // Learn: info / blue
        return {
          badge: "bg-[#7CB7FF]/15 border-[#7CB7FF]/30 text-[#7CB7FF]",
          tag: "text-[#7CB7FF] bg-[#7CB7FF]/10",
        };
      case 3:
      default:
        // Practice: primary / lime
        return {
          badge: "bg-[#B7F36B]/15 border-[#B7F36B]/30 text-[#B7F36B]",
          tag: "text-[#B7F36B] bg-[#B7F36B]/10",
        };
    }
  };

  return (
    <section
      id="learner-session"
      aria-labelledby="learner-session-heading"
      className="py-14 md:py-20 border-t border-(--border-subtle) bg-(--bg-app) relative overflow-hidden"
    >
      {/* Subtle radial ambient glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center opacity-25"
        aria-hidden="true"
      >
        <div className="size-[550px] rounded-full bg-[radial-gradient(circle,rgba(183,243,107,0.06)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-[1160px] mx-auto px-5 sm:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-14 items-center">
          {/* Left Column: Headline, Narrative, 3-Step Timeline, Result */}
          <div className="lg:col-span-7 flex flex-col items-start">
            {/* Eyebrow Label with Scenario Badge */}
            <div className="flex flex-wrap items-center gap-2.5 mb-5">
              <span className="text-[11px] font-mono tracking-[0.1em] text-(--accent-lime) uppercase font-bold">
                {LEARNER_STORY_CONTENT.label}
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-(--bg-surface-raised) border border-(--border-subtle) text-(--text-secondary)">
                {LEARNER_STORY_CONTENT.scenarioBadge}
              </span>
            </div>

            {/* Headline */}
            <h2
              id="learner-session-heading"
              className="text-[28px] sm:text-[36px] md:text-[42px] font-bold text-(--text-primary) leading-[1.14] tracking-tight whitespace-pre-line"
            >
              {LEARNER_STORY_CONTENT.headline}
            </h2>

            {/* Supporting Text */}
            <p className="mt-4 text-[16px] text-(--text-secondary) leading-relaxed max-w-[560px]">
              {LEARNER_STORY_CONTENT.subtitle}
            </p>

            {/* 3-Step Timeline (Three Actions) */}
            <div className="mt-8 w-full max-w-[560px] space-y-3" role="list">
              {LEARNER_STORY_CONTENT.steps.map((step) => {
                const status = getStepStatus(step.id);
                const isCurrent = status === "current";
                const isComplete = status === "complete";
                const colorStyles = getStepColorStyles(step.id);

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setSelectedStepId(step.id)}
                    aria-label={`Step ${step.id}: ${step.action}, ${step.duration}. ${step.summary}`}
                    className={cn(
                      "w-full text-left rounded-xl p-4 transition-all duration-200 border flex items-start gap-4 cursor-pointer",
                      isCurrent
                        ? "bg-(--bg-surface-raised) border-(--accent-lime)/40 shadow-[0_0_24px_rgba(183,243,107,0.08)]"
                        : "bg-(--bg-surface) border-(--border-subtle) hover:bg-(--bg-surface-raised) hover:border-(--border-strong)"
                    )}
                  >
                    {/* Time Badge */}
                    <div
                      className={cn(
                        "shrink-0 font-mono text-[12px] font-semibold px-2.5 py-1 rounded-md border",
                        colorStyles.badge
                      )}
                    >
                      {step.duration}
                    </div>

                    {/* Step Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-(--text-primary)">
                          {step.id}. {step.action}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-mono uppercase tracking-wider text-(--accent-lime) bg-(--accent-lime)/10 border border-(--accent-lime)/20 px-2 py-0.5 rounded-full font-semibold">
                            Current
                          </span>
                        )}
                        {isComplete && (
                          <span className="text-[10px] font-mono uppercase tracking-wider text-(--accent-teal) bg-(--accent-teal)/10 px-2 py-0.5 rounded-full font-semibold">
                            Complete
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-[13px] text-(--text-secondary) leading-normal">
                        {step.summary}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Result Box (One Result below the 3 actions) */}
            <div className="mt-5 w-full max-w-[560px] rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) p-4 flex items-start gap-3">
              <div className="size-6 shrink-0 rounded-full bg-(--accent-lime)/15 text-(--accent-lime) flex items-center justify-center mt-0.5">
                <CheckCircle2 className="size-4" />
              </div>
              <div className="text-[13px] text-(--text-secondary) leading-relaxed">
                <span className="font-semibold text-(--text-primary) mr-1.5">
                  {LEARNER_STORY_CONTENT.result.headline}:
                </span>
                {LEARNER_STORY_CONTENT.result.text}
              </div>
            </div>

            {/* CTA */}
            <div className="mt-7">
              <button
                type="button"
                onClick={handleScrollToHowItWorks}
                className="inline-flex items-center gap-2 text-[14px] font-semibold text-(--accent-lime) hover:text-(--accent-lime-dark) transition-colors group cursor-pointer"
              >
                <span>{LEARNER_STORY_CONTENT.cta.label}</span>
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Right Column: Simplified Marketing Preview Card */}
          <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
            <div className="w-full max-w-[420px] rounded-2xl border border-(--border-strong) bg-(--bg-surface-raised) p-6 sm:p-7 shadow-2xl backdrop-blur-sm relative">
              {/* Top Accent Line */}
              <div
                className="absolute top-0 left-6 right-6 h-[2px] bg-gradient-to-r from-transparent via-(--accent-lime)/40 to-transparent"
                aria-hidden="true"
              />

              {/* Card Header: Example learner session */}
              <div className="flex items-center justify-between gap-2 border-b border-(--border-subtle) pb-4">
                <div className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-(--accent-lime) animate-pulse" aria-hidden="true" />
                  <span className="text-[11px] font-mono uppercase tracking-wider text-(--accent-lime) font-bold">
                    Example learner session
                  </span>
                </div>
                <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-(--text-secondary) bg-(--bg-surface) px-2.5 py-1 rounded-md border border-(--border-subtle)">
                  <Clock className="size-3 text-(--accent-amber)" />
                  <span>{LEARNER_STORY_CONTENT.totalDuration}</span>
                </div>
              </div>

              {/* Topic Title */}
              <div className="mt-4">
                <div className="text-[12px] font-mono uppercase tracking-wider text-(--accent-lime) font-semibold">
                  Active Topic
                </div>
                <h3 className="text-[20px] font-bold text-(--text-primary) tracking-tight mt-0.5">
                  {LEARNER_STORY_CONTENT.topic}
                </h3>
              </div>

              {/* Step Sequence List */}
              <div className="mt-5 space-y-2.5">
                {LEARNER_STORY_CONTENT.steps.map((step) => {
                  const status = getStepStatus(step.id);
                  const isCurrent = status === "current";
                  const isComplete = status === "complete";
                  const colorStyles = getStepColorStyles(step.id);

                  return (
                    <div
                      key={step.id}
                      onClick={() => setSelectedStepId(step.id)}
                      className={cn(
                        "rounded-lg p-3 transition-all duration-150 border flex items-center justify-between text-[13px] cursor-pointer",
                        isCurrent
                          ? "bg-(--bg-surface) border-(--accent-lime)/50 text-(--text-primary) shadow-xs"
                          : isComplete
                          ? "bg-(--bg-surface)/40 border-(--border-subtle) text-(--text-secondary)"
                          : "bg-transparent border-(--border-subtle)/50 text-(--text-muted)"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={cn(
                            "size-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                            isComplete
                              ? "bg-(--accent-teal)/20 text-(--accent-teal)"
                              : isCurrent
                              ? "bg-(--accent-lime) text-(--bg-app)"
                              : "bg-(--bg-surface) text-(--text-muted) border border-(--border-subtle)"
                          )}
                        >
                          {isComplete ? "✓" : step.id}
                        </span>
                        <span className={cn("font-medium", isCurrent ? "text-(--text-primary)" : "text-(--text-secondary)")}>
                          {step.id}. {step.action}
                        </span>
                        <span className="text-[11px] font-mono text-(--text-muted)">
                          — {step.duration}
                        </span>
                      </div>

                      <span
                        className={cn(
                          "text-[11px] font-mono font-semibold px-2 py-0.5 rounded",
                          isComplete
                            ? "text-(--accent-teal) bg-(--accent-teal)/10"
                            : isCurrent
                            ? "text-(--accent-lime) bg-(--accent-lime)/15 font-bold"
                            : "text-(--text-muted)"
                        )}
                      >
                        {isComplete ? "Complete" : isCurrent ? "Current" : "Next"}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Contextual Rationale: Why this session? */}
              <div className="mt-5 rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-3.5">
                <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-(--accent-amber) font-bold mb-1">
                  <Sparkles className="size-3 text-(--accent-amber)" />
                  <span>Why this session?</span>
                </div>
                <p className="text-[12px] text-(--text-secondary) leading-relaxed">
                  {LEARNER_STORY_CONTENT.rationale}
                </p>
              </div>

              {/* Marketing Action Button */}
              <div className="mt-5">
                <Link
                  href={LEARNER_STORY_CONTENT.previewAction.href}
                  className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-(--accent-lime) text-(--bg-app) font-semibold text-[14px] shadow-xs hover:bg-(--accent-lime-dark) transition-all duration-150 active:scale-[0.99]"
                >
                  <span>{LEARNER_STORY_CONTENT.previewAction.label} →</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
