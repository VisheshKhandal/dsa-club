/**
 * Canonical Plan Visual Grammar
 *
 * Rules:
 * - ✓ teal = completed (tasks, milestone completion, verified mastery)
 * - ● lime = current / do now (active day, active task, primary CTA, pulsing current state)
 * - ○ neutral = upcoming (future days, upcoming tasks, standard secondary actions)
 * - ↻ blue/sky = revision / retention (spaced retrieval, retention review checkpoints)
 * - ! amber = plan at risk / attention (paused plan, streak at risk, unseeded task, catalog warning)
 * - 🔒 lock = dependency locked (prerequisite needed, future locked schedule)
 * - red/rose = destructive / error only (stop plan, delete, reset confirmation)
 */

export const PLAN_GRAMMAR = {
  completed: {
    text: "text-teal-400",
    textLight: "text-teal-300",
    bg: "bg-teal-500/10",
    bgSubtle: "bg-teal-950/15",
    border: "border-teal-500/30",
    borderLight: "border-teal-500/20",
    progressGradient: "from-teal-500 to-emerald-400",
    badge: "border-teal-500/30 bg-teal-500/10 text-teal-300",
    iconColor: "text-teal-400",
  },
  current: {
    text: "text-(--accent-lime)",
    bg: "bg-(--accent-lime)/10",
    bgSolid: "bg-(--accent-lime)",
    textOnSolid: "text-black",
    border: "border-(--accent-lime)",
    borderSubtle: "border-(--accent-lime)/40",
    ring: "ring-1 ring-(--accent-lime)/40",
    badge: "border-(--accent-lime)/30 bg-(--accent-lime)/10 text-(--accent-lime)",
    iconColor: "text-(--accent-lime)",
  },
  upcoming: {
    text: "text-zinc-400",
    textMuted: "text-zinc-500",
    bg: "bg-(--bg-surface)",
    bgRaised: "bg-(--bg-surface-raised)",
    border: "border-(--border-subtle)",
    badge: "border-(--border-subtle) bg-(--bg-surface-raised) text-zinc-400",
    iconColor: "text-zinc-500",
  },
  revision: {
    text: "text-sky-400",
    textLight: "text-sky-300",
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    badge: "border-sky-500/30 bg-sky-500/10 text-sky-400",
    iconColor: "text-sky-400",
  },
  atRisk: {
    text: "text-amber-400",
    textLight: "text-amber-300",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    iconColor: "text-amber-400",
  },
  locked: {
    text: "text-zinc-500",
    bg: "bg-zinc-900/40",
    border: "border-zinc-800",
    iconColor: "text-zinc-500",
  },
  destructive: {
    text: "text-rose-400",
    textLight: "text-rose-300",
    bg: "bg-rose-500/10",
    border: "border-rose-500/30",
    badge: "border-rose-500/30 bg-rose-500/10 text-rose-300",
    iconColor: "text-rose-400",
  },
} as const;
