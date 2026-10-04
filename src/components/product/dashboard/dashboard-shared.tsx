import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export const motionEase = [0.16, 1, 0.3, 1] as const;

export const enter = {
  hidden: { opacity: 0, y: 4 },
  show: { opacity: 1, y: 0, transition: { duration: 0.2, ease: motionEase as [number, number, number, number] } },
};

export function scoreTone(value: number) {
  if (value >= 70) {
    return {
      dot: "bg-(--accent-lime)",
      text: "text-(--accent-lime)",
      border: "border-(--accent-lime)/30",
    };
  }
  if (value >= 30) {
    return {
      dot: "bg-(--accent-teal)",
      text: "text-(--accent-teal)",
      border: "border-(--accent-teal)/30",
    };
  }
  return {
    dot: "bg-(--accent-amber)",
    text: "text-(--accent-amber)",
    border: "border-(--accent-amber)/30",
  };
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-label text-(--text-muted) uppercase tracking-wider font-semibold">{children}</p>
  );
}

/** Level 2: Surface — Subtle background with border for grouped content */
export function DashboardSurface({
  children,
  className,
  "aria-labelledby": ariaLabelledby,
}: {
  children: React.ReactNode;
  className?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-(--border-subtle) bg-(--bg-surface) shadow-xs",
        className
      )}
      aria-labelledby={ariaLabelledby}
    >
      {children}
    </div>
  );
}

/** Level 3: Raised Panel — Elevated surface with stronger background for current action / Today's Plan */
export function DashboardSurfaceRaised({
  children,
  className,
  "aria-labelledby": ariaLabelledby,
}: {
  children: React.ReactNode;
  className?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-(--border-subtle) bg-(--bg-surface-raised) shadow-xs",
        className
      )}
      aria-labelledby={ariaLabelledby}
    >
      {children}
    </div>
  );
}

/** Alias for backward compatibility without decorative purple glows */
export const DashboardSurfaceGlow = DashboardSurfaceRaised;

export function DashboardSurfaceDivider() {
  return <div className="h-px w-full bg-(--border-subtle)" role="separator" />;
}

export function learnerStepTitle(step: { title?: string; kind?: string } | null | undefined) {
  const title = String(step?.title ?? step?.kind ?? "Learning step").trim();
  const friendlyKinds: Record<string, string> = {
    introduction: "Introduction",
    intuition: "Build intuition",
    concept: "Core concept",
    mental_model: "Mental model",
    visualization: "Visualize it",
    pattern: "Recognize patterns",
    example: "Worked example",
    practice: "Practice",
    reflection: "Reflect",
    mastery: "Mastery",
  };
  return friendlyKinds[title.toLowerCase()] ?? title.replace(/[_-]+/g, " ");
}

export function RationaleList({ reasons }: { reasons: string[] }) {
  return (
    <div className="mt-2 border-t border-(--border-subtle) pt-2 text-caption leading-5 text-(--text-secondary)">
      {reasons.map((reason) => (
        <p key={reason} className="flex gap-1.5">
          <Check size={12} className="mt-0.5 shrink-0 text-(--accent-lime)" aria-hidden />
          {reason}
        </p>
      ))}
    </div>
  );
}
