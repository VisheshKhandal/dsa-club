import React from "react";
import Link from "next/link";
import { BookOpen, GitBranch, RefreshCw } from "lucide-react";
import { SOCIAL_PROOF_CONTENT } from "./landing-content";

export function SocialProofSection() {
  const getIcon = (name: string) => {
    switch (name) {
      case "book":
        return <BookOpen className="size-5 text-(--accent-lime)" />;
      case "branch":
        return <GitBranch className="size-5 text-(--accent-lime)" />;
      case "refresh":
      default:
        return <RefreshCw className="size-5 text-(--accent-lime)" />;
    }
  };

  return (
    <section className="py-14 md:py-20 border-t border-(--border-subtle) bg-(--bg-app) relative overflow-hidden">
      <div className="max-w-[1160px] mx-auto px-5 sm:px-10">
        {/* Centered Heading */}
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
          <h2 className="text-[28px] sm:text-[34px] md:text-[40px] font-bold text-(--text-primary) tracking-tight leading-tight">
            {SOCIAL_PROOF_CONTENT.headline}
          </h2>
          <p className="mt-3 text-[16px] text-(--text-secondary) leading-relaxed">
            {SOCIAL_PROOF_CONTENT.subtitle}
          </p>
        </div>

        {/* 3 Evidence Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 md:mb-14">
          {SOCIAL_PROOF_CONTENT.cards.map((card) => (
            <div
              key={card.id}
              className="group rounded-2xl p-7 border bg-(--bg-surface) border-(--border-subtle) transition-all duration-300 hover:border-(--border-strong) hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="size-11 rounded-xl bg-(--accent-lime)/10 border border-(--accent-lime)/20 flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-105">
                {getIcon(card.iconName)}
              </div>

              <span className="text-[24px] sm:text-[28px] font-bold text-(--text-primary) block tracking-tight">
                {card.stat}
              </span>

              <p className="mt-2 text-[14px] text-(--text-secondary) leading-relaxed">
                {card.label}
              </p>
            </div>
          ))}
        </div>

        {/* Honest Framing Block with Slate Surface and Lime Action */}
        <div className="max-w-[680px] mx-auto rounded-2xl bg-(--bg-surface-raised) border border-(--border-subtle) p-7 sm:p-9 text-center shadow-lg transition-all duration-300 hover:border-(--border-strong)">
          <p className="text-[15px] text-(--text-primary) leading-relaxed font-normal">
            {SOCIAL_PROOF_CONTENT.honestBlock.text}
          </p>
          <div className="mt-5">
            <Link
              href={SOCIAL_PROOF_CONTENT.honestBlock.href}
              className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-(--accent-lime) hover:text-(--accent-lime-dark) transition-colors active:scale-[0.98]"
            >
              <span>{SOCIAL_PROOF_CONTENT.honestBlock.cta}</span>
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
