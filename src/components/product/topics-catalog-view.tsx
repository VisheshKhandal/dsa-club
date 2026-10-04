"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Search,
  ChevronRight,
  ArrowRight,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface TopicItem {
  id: string;
  slug: string;
  title: string;
  difficulty: string;
  progress: number;
  minutes: number;
}

export interface TopicsCatalogViewProps {
  topics: TopicItem[];
}

function DiffBadge({ difficulty }: { difficulty: string }) {
  const d = (difficulty || "Medium").toLowerCase();
  const styles =
    d === "easy"
      ? "text-emerald-400 border-emerald-500/25 bg-emerald-500/10"
      : d === "hard"
      ? "text-rose-400 border-rose-500/25 bg-rose-500/10"
      : "text-amber-400 border-amber-500/25 bg-amber-500/10";

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wider",
        styles
      )}
    >
      {difficulty}
    </span>
  );
}

export function TopicsCatalogView({ topics }: TopicsCatalogViewProps) {
  const [search, setSearch] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("All");

  const filteredTopics = useMemo(() => {
    return topics.filter((t) => {
      const matchesSearch = t.title.toLowerCase().includes(search.toLowerCase());
      const matchesDiff =
        selectedDifficulty === "All" ||
        t.difficulty?.toLowerCase() === selectedDifficulty.toLowerCase();
      return matchesSearch && matchesDiff;
    });
  }, [topics, search, selectedDifficulty]);

  const masteredCount = useMemo(() => {
    return topics.filter((t) => (t.progress ?? 0) >= 100).length;
  }, [topics]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-(--border-subtle) pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-bold tracking-wide uppercase bg-(--accent-lime)/10 border-(--accent-lime)/25 text-(--accent-lime)">
              <BookOpen className="size-3" /> Curriculum Taxonomy
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-(--text-primary)">
            Concept Topics
          </h1>
          <p className="text-sm text-(--text-secondary) mt-1 max-w-2xl leading-relaxed">
            Master the canonical data structures and algorithmic concepts. Explore pattern recognition, theory, and curated practice sets.
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-(--bg-surface-raised) border border-(--border-subtle)">
            <CheckCircle2 className="size-4 text-(--accent-lime)" />
            <div className="text-xs">
              <span className="font-bold text-(--text-primary)">{masteredCount}</span>
              <span className="text-(--text-muted)">/{topics.length} Mastered</span>
            </div>
          </div>
          <Link
            href="/learn"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-raised) transition-colors"
          >
            <GraduationCap className="size-3.5" />
            Learn Hub
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-(--text-muted)" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topics by name..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-(--bg-surface-raised) border border-(--border-subtle) text-(--text-primary) placeholder:text-(--text-muted) focus:outline-none focus:ring-1 focus:ring-(--accent-lime) transition-colors"
          />
        </div>

        {/* Difficulty Filter Tabs */}
        <div className="flex items-center gap-1 bg-(--bg-surface-raised) border border-(--border-subtle) p-1 rounded-xl shrink-0 self-start sm:self-auto">
          {["All", "Easy", "Medium", "Hard"].map((diff) => (
            <button
              key={diff}
              type="button"
              onClick={() => setSelectedDifficulty(diff)}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer",
                selectedDifficulty === diff
                  ? "bg-(--accent-lime)/15 text-(--accent-lime)"
                  : "text-(--text-secondary) hover:text-(--text-primary)"
              )}
            >
              {diff}
            </button>
          ))}
        </div>
      </div>

      {/* Topics Grid */}
      {filteredTopics.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-(--border-subtle) bg-(--bg-surface-raised)/50">
          <BookOpen className="size-8 mx-auto text-(--text-muted) mb-2" />
          <p className="text-sm font-medium text-(--text-primary)">No topics found</p>
          <p className="text-xs text-(--text-muted) mt-1">
            Try adjusting your search query or difficulty filter.
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTopics.map((topic) => {
            const isMastered = (topic.progress ?? 0) >= 100;
            return (
              <Link
                key={topic.slug}
                href={`/learn/topics/${topic.slug}`}
                className="group relative flex flex-col justify-between p-4 rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) hover:border-(--accent-lime)/40 hover:bg-(--bg-surface-hover) transition-all duration-150"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-bold text-(--text-primary) group-hover:text-(--accent-lime) transition-colors line-clamp-1">
                      {topic.title}
                    </span>
                    <DiffBadge difficulty={topic.difficulty} />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-(--text-muted)">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {topic.minutes > 0 ? `~${topic.minutes}m` : "Self-paced"}
                    </span>
                    {topic.progress > 0 && (
                      <span className="font-mono text-(--accent-lime)">
                        {topic.progress}% mastery
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-(--border-subtle)/50 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-(--text-secondary) group-hover:text-(--text-primary) transition-colors">
                    {isMastered ? "Review Topic" : "Explore Concept"}
                  </span>
                  <ChevronRight className="size-3.5 text-(--text-muted) group-hover:text-(--accent-lime) group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
