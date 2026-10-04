"use client";

import Link from "next/link";
import { ArrowRight, FileCode2, Timer, Zap } from "lucide-react";

interface ResumePoint {
  type: string;
  title: string;
  subtitle?: string;
  href: string;
  stage?: string;
}

interface ResumeContextBannerProps {
  resumePoint: ResumePoint | null | undefined;
  primaryMissionHref?: string;
}

export function ResumeContextBanner({ resumePoint, primaryMissionHref }: ResumeContextBannerProps) {
  if (!resumePoint?.href) return null;
  if (resumePoint.href === primaryMissionHref) return null;

  const Icon = resumePoint.type === "problem" ? FileCode2 : resumePoint.type === "session" ? Timer : Zap;

  return (
    <div className="flex flex-col gap-3 border-t border-(--color-border)/80 bg-(--color-surface-2)/40 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div className="flex min-w-0 items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-(--color-purple-subtle) text-(--color-purple)">
          <Icon size={16} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-(--color-text-muted)">Pick up where you left off</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-(--color-text-primary)">{resumePoint.title}</p>
          {resumePoint.subtitle && (
            <p className="mt-0.5 text-xs text-(--color-text-secondary)">{resumePoint.subtitle}</p>
          )}
        </div>
      </div>
      <Link
        href={resumePoint.href}
        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-(--color-purple)/35 bg-(--color-surface-1) px-3 py-2 text-xs font-semibold text-(--color-purple) transition hover:bg-(--color-purple-subtle)"
      >
        Continue
        <ArrowRight size={13} aria-hidden />
      </Link>
    </div>
  );
}
