"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, Code2, RefreshCw, Compass } from "lucide-react";

export function QuickActionsSection() {
  const actions = [
    {
      title: "Solve a problem",
      description: "Jump into curated algorithmic practice",
      href: "/practice",
      icon: Code2,
    },
    {
      title: "Review due items",
      description: "Spaced repetition retention queue",
      href: "/revision",
      icon: RefreshCw,
    },
    {
      title: "Explore my path",
      description: "Check learning roadmap and milestones",
      href: "/learning-paths",
      icon: Compass,
    },
  ];

  return (
    <section aria-labelledby="quick-actions-heading" className="mt-6">
      <h3 id="quick-actions-heading" className="sr-only">
        Quick actions
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.title}
              href={action.href}
              className="group flex items-center justify-between rounded-xl border border-(--border-subtle) bg-(--bg-surface) p-4 transition-all duration-150 hover:border-(--border-strong) hover:bg-(--bg-surface-raised)"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-(--bg-surface-raised) border border-(--border-subtle) text-(--text-muted) group-hover:text-(--accent-lime) transition-colors">
                  <Icon className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-card-title text-(--text-primary) group-hover:text-(--accent-lime) transition-colors">
                    {action.title}
                  </p>
                  <p className="text-caption text-(--text-muted) truncate">
                    {action.description}
                  </p>
                </div>
              </div>
              <ArrowRight className="size-4 text-(--text-muted) transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-(--text-primary) shrink-0 ml-2" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
