"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { LANDING_NAV_LINKS } from "./landing-content";
import { cn } from "@/lib/utils";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");

  // Scroll listener for sticky frosted glass state (> 60px) and page progress
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 60);

      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (scrollY / totalHeight) * 100)));
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // IntersectionObserver for active section highlight
  useEffect(() => {
    const sectionIds = ["how-it-works", "features", "learning-path", "learner-session"];
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      {
        rootMargin: "-20% 0px -60% 0px",
        threshold: 0.1,
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!mobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

  // Smooth scroll handler for anchor links
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => {
    if (href.startsWith("#")) {
      e.preventDefault();
      const targetId = href.substring(1);
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth" });
      }
      setMobileOpen(false);
    }
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-200 ease-out",
          scrolled
            ? "bg-(--bg-app)/90 backdrop-blur-[16px] border-b border-(--border-subtle) shadow-lg shadow-black/30"
            : "bg-transparent border-b border-transparent"
        )}
      >
        <div className="max-w-[1160px] mx-auto h-20 px-5 sm:px-10 flex items-center justify-between relative">
          {/* Brand Logo: Clean icon lockup */}
          <Link
            href="/"
            className="flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime) rounded-md transition-opacity duration-200 hover:opacity-90"
            title="DSA Club"
          >
            <Image
              src="/icons/dsa-club-lockup.png"
              alt="DSA Club"
              width={140}
              height={36}
              priority
              className="h-9 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav Links (Simple text links, not equal-prominence buttons) */}
          <nav
            aria-label="Landing navigation"
            className="hidden md:flex items-center gap-7 text-[14px]"
          >
            {LANDING_NAV_LINKS.map((item) => {
              const targetId = item.href.replace("#", "");
              const isActive =
                activeSection === targetId ||
                (targetId === "learning-path" && activeSection === "how-it-works");

              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item.href)}
                  className={cn(
                    "relative py-1 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime) rounded-sm",
                    isActive
                      ? "text-(--text-primary) font-semibold"
                      : "text-(--text-secondary) hover:text-(--text-primary)"
                  )}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className="absolute -bottom-1 left-0 right-0 h-[2px] bg-(--accent-lime)"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }}
                    />
                  )}
                </a>
              );
            })}
          </nav>

          {/* Desktop Actions: Secondary text link + Single dominant lime button */}
          <div className="hidden md:flex items-center gap-4">
            <Link
              href="/login?callbackUrl=/dashboard"
              className="text-[14px] font-medium text-(--text-secondary) hover:text-(--text-primary) transition-colors px-3 py-1.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime)"
            >
              Log in
            </Link>
            <Link
              href="/register?callbackUrl=/onboarding"
              className="px-4.5 py-2 rounded-lg bg-(--accent-lime) text-(--bg-app) text-[14px] font-semibold transition-all duration-150 hover:bg-(--accent-lime-dark) active:scale-[0.98] shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-app)"
            >
              Start free
            </Link>
          </div>

          {/* Mobile Hamburger Button (44x44px touch target) */}
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="md:hidden flex items-center justify-center size-11 rounded-lg text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime)"
            aria-label="Open mobile navigation"
            aria-expanded={mobileOpen}
          >
            <Menu className="size-6" />
          </button>
        </div>

        {/* Scroll Progress Line (Subtle lime 2px bar at header bottom) */}
        {scrolled && (
          <div
            className="hidden md:block absolute bottom-0 left-0 right-0 h-[2px] bg-(--border-subtle) overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="h-full bg-(--accent-lime) transition-all duration-100 ease-out"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        )}
      </header>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setMobileOpen(false)}
            />

            {/* Slide-out Menu Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="fixed top-0 right-0 bottom-0 w-[290px] bg-(--bg-surface) border-l border-(--border-subtle) p-6 flex flex-col justify-between z-10"
            >
              <div>
                <div className="flex items-center justify-between mb-8">
                  <span className="text-[13px] font-mono uppercase tracking-wider text-(--text-muted) font-semibold">
                    Menu
                  </span>
                  <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="size-10 flex items-center justify-center rounded-lg text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-raised) transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime)"
                    aria-label="Close navigation menu"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <nav className="flex flex-col gap-2" aria-label="Mobile navigation">
                  {LANDING_NAV_LINKS.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item.href)}
                      className="px-4 py-3 rounded-lg text-[15px] font-medium text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-raised) transition-colors"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>

              {/* Mobile Drawer Actions */}
              <div className="pt-6 border-t border-(--border-subtle) flex flex-col gap-3">
                <Link
                  href="/login?callbackUrl=/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center py-2.5 rounded-lg text-[14px] font-medium text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--bg-surface-raised) transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/register?callbackUrl=/onboarding"
                  onClick={() => setMobileOpen(false)}
                  className="w-full text-center py-3 rounded-lg bg-(--accent-lime) text-(--bg-app) text-[15px] font-semibold transition-all hover:bg-(--accent-lime-dark) active:scale-[0.98] shadow-xs"
                >
                  Start free
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
