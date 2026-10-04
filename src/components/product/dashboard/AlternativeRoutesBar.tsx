"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, Compass, RefreshCw, Shuffle, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlternativeRoutesBarProps {
  topicSlug?: string;
  topicName?: string;
  className?: string;
}

export function AlternativeRoutesBar({
  topicSlug,
  topicName = "current topic",
  className,
}: AlternativeRoutesBarProps) {
  const shuffleHref = topicSlug
    ? `/practice?topic=${topicSlug}&shuffle=true`
    : "/practice?shuffle=true";

  const routes = [
    {
      title: "View full schedule",
      href: "/plan",
      icon: Compass,
    },
    {
      title: "Review queue & history",
      href: "/review",
      icon: RefreshCw,
    },
    {
      title: `Random in ${topicName}`,
      href: shuffleHref,
      icon: Shuffle,
    },
    {
      title: "Explore curriculum roadmap",
      href: "/learn/paths",
      icon: Layers,
    },
  ];

  return (
    <nav
      aria-label="Secondary exploration routes"
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-4 pb-2 border-t border-(--border-subtle)/50 text-xs",
        className
      )}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wider text-(--text-muted)">
        Supporting Options
      </span>

      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {routes.map((route) => {
          const Icon = route.icon;
          return (
            <Link
              key={route.title}
              href={route.href}
              className="group inline-flex items-center gap-1.5 text-xs text-(--text-secondary) hover:text-(--text-primary) transition-colors"
            >
              <Icon className="size-3 text-(--text-muted) group-hover:text-(--accent-lime) transition-colors" />
              <span>{route.title}</span>
              <ArrowUpRight className="size-3 text-(--text-muted)/60 group-hover:text-(--text-primary) group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-150" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
