import React from "react";
import Link from "next/link";
import Image from "next/image";
import { LANDING_NAV_LINKS, FOOTER_CONTENT } from "./landing-content";

export function LandingFooter() {
  return (
    <footer className="bg-(--bg-app) border-t border-(--border-subtle) py-10">
      <div className="max-w-[1160px] mx-auto px-5 sm:px-10">
        {/* Top Row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-8">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center" title="DSA Club">
              <Image
                src="/icons/dsa-club-lockup.png"
                alt="DSA Club"
                width={120}
                height={30}
                className="h-7 w-auto object-contain"
              />
            </Link>
            <span className="text-[12px] font-mono text-(--text-muted) uppercase tracking-wider pl-2 border-l border-(--border-subtle)">
              Learning OS
            </span>
          </div>

          <nav aria-label="Footer navigation" className="flex items-center gap-6 text-[13px] font-medium text-(--text-secondary)">
            {LANDING_NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="hover:text-(--text-primary) transition-colors"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>

        {/* Divider */}
        <div className="h-[1px] w-full bg-(--border-subtle)" />

        {/* Bottom Row */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-(--text-muted)">
          <p>{FOOTER_CONTENT.copyright}</p>

          <div className="flex items-center gap-5">
            {FOOTER_CONTENT.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-(--text-secondary) transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
