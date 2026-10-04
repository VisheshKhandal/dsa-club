"use client";

import Link from "next/link";
import { BookOpen, Brain, Briefcase, Compass, LineChart, Target } from "lucide-react";

const links = [
  { href: "/learn", label: "Learn", icon: BookOpen, description: "Topics & missions" },
  { href: "/practice", label: "Practice", icon: Target, description: "Problems" },
  { href: "/learn/paths", label: "Paths", icon: Compass, description: "Curriculum" },
  { href: "/revision", label: "Revision", icon: Brain, description: "Retention queue" },
  { href: "/progress", label: "Progress", icon: LineChart, description: "Mastery & stats" },
  { href: "/companies", label: "Interview prep", icon: Briefcase, description: "Company tracks" },
] as const;

export function DashboardExploreBar() {
  return (
    <nav aria-label="Explore DSA Club">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-(--color-purple)">Quick Navigate</p>
      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {links.map(({ href, label, icon: Icon, description }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-[4.25rem] flex-col justify-center rounded-xl border border-(--color-border) bg-(--color-surface-1)/80 px-3 py-2.5 transition-all duration-200 hover:-translate-y-0.5 hover:border-(--color-purple)/40 hover:bg-(--color-surface-2) hover:shadow-[0_0_16px_rgba(124,58,237,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--color-purple)/50"
          >
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-(--color-text-primary)">
              <Icon size={14} className="text-(--color-purple)" aria-hidden />
              {label}
            </span>
            <span className="mt-0.5 text-[10px] leading-snug text-(--color-text-muted) group-hover:text-(--color-text-secondary)">
              {description}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

