import React from "react";
import Link from "next/link";
import { FINAL_CTA_CONTENT } from "./landing-content";

export function FinalCtaSection() {
  return (
    <section className="relative py-16 md:py-24 border-t border-(--border-subtle) bg-(--bg-app) overflow-hidden">
      {/* Subtle Low-Intensity Radial Glow */}
      <div
        className="pointer-events-none absolute inset-0 z-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_75%,rgba(183,243,107,0.06)_0%,transparent_70%)]"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-[1160px] mx-auto px-5 sm:px-10 text-center">
        <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-bold text-(--text-primary) tracking-tight leading-tight max-w-3xl mx-auto">
          {FINAL_CTA_CONTENT.headline}
        </h2>

        <p className="mt-4 text-[16px] sm:text-[17px] text-(--text-secondary) max-w-lg mx-auto leading-relaxed">
          {FINAL_CTA_CONTENT.subtitle}
        </p>

        {/* Single Primary Action Button: Dominant Lime */}
        <div className="mt-8 flex justify-center">
          <Link
            href={FINAL_CTA_CONTENT.buttonHref}
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl bg-(--accent-lime) hover:bg-(--accent-lime-dark) text-(--bg-app) text-[16px] font-bold shadow-[0_0_24px_rgba(183,243,107,0.22)] transition-all duration-200 hover:shadow-[0_0_36px_rgba(183,243,107,0.4)] hover:-translate-y-0.5 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-app)"
          >
            <span>{FINAL_CTA_CONTENT.buttonLabel}</span>
          </Link>
        </div>

        {/* Secondary Login Link */}
        <div className="mt-4">
          <Link
            href={FINAL_CTA_CONTENT.loginHref}
            className="text-[14px] text-(--text-muted) hover:text-(--text-secondary) transition-colors"
          >
            {FINAL_CTA_CONTENT.loginText}
          </Link>
        </div>
      </div>
    </section>
  );
}

