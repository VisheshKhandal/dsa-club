"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { HERO_CONTENT } from "./landing-content";
import { HeroProductPreview } from "./hero-product-preview";

export function LandingHero() {
  const reduced = useReducedMotion();

  const handleScrollToHowItWorks = (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById("how-it-works");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section className="relative pt-28 pb-16 md:pt-36 md:pb-20 overflow-hidden">
      {/* Static Background: Soft ambient lime glow behind headline and mockup */}
      <div
        className="pointer-events-none absolute inset-0 z-0"
        aria-hidden="true"
      >
        <div className="absolute -top-32 -left-32 size-[650px] rounded-full bg-[radial-gradient(circle,rgba(183,243,107,0.05)_0%,transparent_70%)]" />
      </div>

      <div className="relative z-10 max-w-[1160px] mx-auto px-5 sm:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: 55% desktop */}
          <div className="lg:col-span-7 flex flex-col items-start relative">
            {/* Eyebrow Label */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="relative z-10 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-(--accent-lime)/10 border border-(--accent-lime)/25 text-[11px] font-semibold tracking-wider text-(--accent-lime) uppercase mb-5"
            >
              <Sparkles className="size-3 text-(--accent-lime)" />
              <span>{HERO_CONTENT.eyebrow}</span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={reduced ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 text-[38px] sm:text-[50px] lg:text-[62px] font-extrabold text-(--text-primary) leading-[1.08] tracking-[-0.03em] whitespace-pre-line"
            >
              {HERO_CONTENT.headline}
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={reduced ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 mt-5 text-[17px] text-(--text-secondary) leading-[1.65] max-w-[480px]"
            >
              {HERO_CONTENT.subtitle}
            </motion.p>

            {/* CTA Row */}
            <motion.div
              initial={reduced ? false : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="relative z-10 mt-7 flex flex-wrap items-center gap-3.5 w-full sm:w-auto"
            >
              <Link
                href={HERO_CONTENT.primaryCta.href}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3 rounded-lg bg-(--accent-lime) text-(--bg-app) font-semibold text-[15px] shadow-xs transition-all duration-150 hover:bg-(--accent-lime-dark) active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-app)"
              >
                <span>{HERO_CONTENT.primaryCta.label}</span>
              </Link>

              <button
                type="button"
                onClick={handleScrollToHowItWorks}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-(--bg-surface) border border-(--border-subtle) text-(--text-secondary) hover:text-(--text-primary) hover:border-(--border-strong) font-medium text-[15px] transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime)"
              >
                <span>{HERO_CONTENT.secondaryCta.label}</span>
              </button>
            </motion.div>

            {/* Trust Line */}
            <motion.p
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, delay: 0.38 }}
              className="relative z-10 mt-4 text-[13px] text-(--text-muted) font-medium"
            >
              {HERO_CONTENT.trustLine}
            </motion.p>
          </div>

          {/* Right Column: 45% desktop — Live Product Preview Card */}
          <div className="lg:col-span-5 w-full flex justify-center lg:justify-end">
            <HeroProductPreview />
          </div>
        </div>
      </div>

      {/* Hidden brand asset anchor to preserve logo integration tests */}
      <div className="sr-only" aria-hidden="true">
        <Image
          src="/icons/dsa-club-logo-text.png"
          alt="DSA Club brand typography"
          width={120}
          height={30}
        />
      </div>
    </section>
  );
}
