import React from "react";
import { FEATURES_CONTENT } from "./landing-content";
import { FeaturesInteractive } from "./features-interactive";
import { ProductPlayground } from "./product-playground";

export function FeaturesSection() {
  return (
    <section
      id="features"
      className="py-14 md:py-20 border-t border-(--border-subtle) bg-(--bg-app) relative overflow-hidden"
    >
      <div className="max-w-[1160px] mx-auto px-5 sm:px-10">
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
          <span className="text-[11px] font-mono tracking-[0.1em] text-(--accent-lime) uppercase font-bold">
            {FEATURES_CONTENT.label}
          </span>
          <h2 className="text-[28px] sm:text-[34px] md:text-[40px] font-bold text-(--text-primary) mt-2 tracking-tight">
            {FEATURES_CONTENT.headline}
          </h2>
        </div>

        {/* Interactive Tab Switcher & Animated UI Preview */}
        <FeaturesInteractive />

        {/* Embedded Compact Interactive Product Playground */}
        <ProductPlayground />
      </div>
    </section>
  );
}
