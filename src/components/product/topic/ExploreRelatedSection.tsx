"use client";

import React from "react";
import Link from "next/link";
import { ArrowUpRight, BookOpen, Compass } from "lucide-react";
import type { TopicDetailData } from "@/components/product/topic-detail-view";

interface ExploreRelatedSectionProps {
  topics: TopicDetailData["relatedTopics"];
}

export function ExploreRelatedSection({ topics }: ExploreRelatedSectionProps) {
  if (!topics.length) return null;

  return (
    <nav
      aria-label="Explore Related Topics"
      className="space-y-3 pt-6 border-t border-(--color-border)"
    >
      <div className="flex items-center gap-2">
        <Compass size={14} className="text-(--color-purple)" />
        <span className="text-xs font-bold uppercase tracking-wider text-(--color-text-muted)">
          Explore Related Topics
        </span>
      </div>

      <div className="flex items-center gap-2.5 overflow-x-auto pb-1 scrollbar-none">
        {topics.map((topic) => (
          <Link
            key={topic.id}
            href={`/learn/topics/${topic.slug}`}
            className="group flex-shrink-0 flex items-center gap-2 rounded-(--radius-btn) border border-(--color-border) bg-(--color-surface-1) px-3 py-2 text-xs transition-all hover:border-(--color-purple)/40 hover:bg-(--color-surface-2)"
          >
            <BookOpen
              size={13}
              className="text-(--color-text-muted) group-hover:text-(--color-purple) transition-colors shrink-0"
            />
            <span className="font-medium text-(--color-text-primary) group-hover:text-(--color-purple) transition-colors whitespace-nowrap">
              {topic.title}
            </span>

            {topic.progress > 0 && (
              <span className="rounded-full bg-(--color-surface-2) px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-(--color-text-secondary) group-hover:text-(--color-text-primary)">
                {topic.progress}%
              </span>
            )}

            <ArrowUpRight
              size={12}
              className="text-(--color-text-muted) opacity-40 group-hover:opacity-100 group-hover:text-(--color-purple) transition-all"
            />
          </Link>
        ))}
      </div>
    </nav>
  );
}
