"use client";

import React, { useState, useEffect } from "react";
import { Check, HelpCircle, Layers, TrendingDown } from "lucide-react";
import { PAIN_POINTS_CONTENT } from "./landing-content";
import { BeforeAfterToggle } from "./before-after-toggle";
import { cn } from "@/lib/utils";

export function PainPointSection() {
  const [flippedCards, setFlippedCards] = useState<Record<string, boolean>>({});
  const [pulsingCards, setPulsingCards] = useState<Record<string, boolean>>({});

  const handleCardClick = (id: string) => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(10);
      } catch {
        // Ignore if browser restricts vibration
      }
    }

    setFlippedCards((prev) => {
      const nextState = !prev[id];
      return { ...prev, [id]: nextState };
    });
  };

  // After 3 seconds on back face: subtle indicator
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    Object.entries(flippedCards).forEach(([id, isFlipped]) => {
      if (isFlipped) {
        const timer = setTimeout(() => {
          setPulsingCards((prev) => ({ ...prev, [id]: true }));
        }, 3000);
        timers.push(timer);
      } else {
        setPulsingCards((prev) => ({ ...prev, [id]: false }));
      }
    });

    return () => timers.forEach(clearTimeout);
  }, [flippedCards]);

  const getFrontIcon = (type: string) => {
    switch (type) {
      case "scatter":
        return <Layers className="size-5 text-(--text-secondary)" />;
      case "question":
        return <HelpCircle className="size-5 text-(--text-secondary)" />;
      case "fade":
      default:
        return <TrendingDown className="size-5 text-(--text-secondary)" />;
    }
  };

  return (
    <section className="py-14 md:py-20 border-t border-(--border-subtle) bg-(--bg-app) relative overflow-hidden">
      <div className="max-w-[1160px] mx-auto px-5 sm:px-10">
        {/* Centered Heading */}
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
          <h2 className="text-[28px] sm:text-[34px] md:text-[40px] font-bold text-(--text-primary) tracking-tight leading-tight">
            {PAIN_POINTS_CONTENT.headline}
          </h2>
          <p className="mt-3 text-[16px] text-(--text-secondary) leading-relaxed">
            {PAIN_POINTS_CONTENT.subtitle}
          </p>
          <p className="mt-2 text-[12px] font-mono text-(--accent-lime) uppercase tracking-wider">
            Hover or tap to reveal solution
          </p>
        </div>

        {/* 3 Interactive 3D Flip Problem Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PAIN_POINTS_CONTENT.cards.map((card) => {
            const isFlipped = !!flippedCards[card.id];
            const isPulsing = !!pulsingCards[card.id];

            return (
              <div
                key={card.id}
                onClick={() => handleCardClick(card.id)}
                className={cn(
                  "group relative min-h-[260px] cursor-pointer rounded-2xl",
                  "[perspective:1000px]",
                  isFlipped && "is-flipped"
                )}
              >
                {/* Flip Card Inner Wrapper */}
                <div
                  className={cn(
                    "relative w-full h-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d]",
                    "group-hover:[transform:rotateY(180deg)]",
                    isFlipped && "[transform:rotateY(180deg)]"
                  )}
                >
                  {/* FRONT FACE: The Problem */}
                  <div className="absolute inset-0 w-full h-full rounded-2xl p-7 border bg-(--bg-surface-raised) border-(--border-subtle) flex flex-col justify-between backdrop-blur-sm [backface-visibility:hidden] [-webkit-backface-visibility:hidden] shadow-md group-hover:border-(--border-strong) transition-colors">
                    <div>
                      <div className="size-10 rounded-xl bg-(--bg-surface) border border-(--border-subtle) flex items-center justify-center mb-5 transition-transform duration-200 group-hover:scale-105">
                        {getFrontIcon(card.id)}
                      </div>

                      <h3 className="text-[17px] font-bold text-(--text-primary) leading-snug">
                        {card.title}
                      </h3>

                      <p className="mt-2.5 text-[14px] text-(--text-secondary) leading-relaxed">
                        {card.problem}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-(--border-subtle) flex items-center justify-between text-[11px] font-mono text-(--text-muted)">
                      <span>Problem</span>
                      <span className="text-(--accent-lime) group-hover:underline">
                        Reveal response →
                      </span>
                    </div>
                  </div>

                  {/* BACK FACE: DSA Club Response */}
                  <div
                    className={cn(
                      "absolute inset-0 w-full h-full rounded-2xl p-7 border flex flex-col justify-between [backface-visibility:hidden] [-webkit-backface-visibility:hidden] [transform:rotateY(180deg)] shadow-xl transition-all duration-200",
                      "bg-(--bg-surface-raised) border-(--accent-lime)/40",
                      isPulsing && "ring-1 ring-(--accent-lime)/50"
                    )}
                  >
                    <div>
                      <div className="size-8 rounded-full bg-(--accent-lime)/15 text-(--accent-lime) flex items-center justify-center mb-4">
                        <Check className="size-4 stroke-[3]" />
                      </div>

                      <span className="text-[11px] font-mono uppercase tracking-wider text-(--accent-lime) font-bold block mb-1">
                        DSA Club Solution
                      </span>

                      <h4 className="text-[16px] font-bold text-(--text-primary) leading-snug">
                        {card.title}
                      </h4>

                      <p className="mt-2 text-[14px] text-(--text-secondary) leading-relaxed">
                        {card.response}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-(--border-subtle) flex items-center justify-between text-[11px] font-mono text-(--accent-lime)">
                      <span>Structured Approach</span>
                      <span className="text-(--text-muted)">Tap to flip back ⟲</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Embedded Before → After Transformation Module */}
        <BeforeAfterToggle />
      </div>
    </section>
  );
}
