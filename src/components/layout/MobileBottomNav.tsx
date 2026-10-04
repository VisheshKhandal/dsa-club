"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  GraduationCap,
  Puzzle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/dashboard",    label: "Home",     icon: Home },
  { href: "/intelligence", label: "Plan",     icon: Sparkles },
  { href: "/learn",        label: "Learn",    icon: GraduationCap },
  { href: "/practice",     label: "Practice", icon: Puzzle },
  { href: "/revision",     label: "Review",   icon: RefreshCw },
] as const;

type NavHref = (typeof NAV_ITEMS)[number]["href"];

function isActive(href: NavHref, pathname: string) {
  if (href === "/dashboard") return pathname === "/dashboard";
  if (href === "/learn") {
    return (
      pathname === "/learn" ||
      pathname.startsWith("/learn/") ||
      pathname === "/learning-paths" ||
      pathname.startsWith("/learning-paths/") ||
      pathname === "/missions" ||
      pathname.startsWith("/missions/")
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Spring config: smooth weighted glide — deliberate and premium, not instant or bouncy */
const pillSpring = {
  type: "spring" as const,
  stiffness: 260,
  damping: 28,
  mass: 1.0,
};

/**
 * MobileBottomNav — Premium floating glass navigation island.
 *
 * Design decisions backed by research:
 * - Persistent (no auto-hide): Apple HIG + M3 recommend persistent nav for task-switching apps
 * - Luminous glass capsule: M3 "active indicator pill" with dark-mode glass aesthetic
 * - Framer Motion layoutId: Physics-based spring animation (Linear/Arc feel)
 * - Obsidian glass shell: 4-layer depth with specular highlight + deep ambient shadow
 */
export function MobileBottomNav() {
  const pathname = usePathname();
  const [pressedHref, setPressedHref] = useState<NavHref | null>(null);

  return (
    <nav
      aria-label="Mobile navigation"
      className={cn(
        "md:hidden",
        "fixed inset-x-3 z-40"
      )}
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}
    >
      {/* Outer obsidian glass shell */}
      <div
        className={cn(
          "relative flex items-center",
          "rounded-[28px]",
          "bg-(--color-surface-1)/80 backdrop-blur-2xl",
          "border border-(--color-border)",
          "px-1.5 py-1.5"
        )}
        style={{
          boxShadow: [
            // Deep ambient shadow pool
            "0 16px 40px -8px rgba(0,0,0,0.55)",
            // Medium diffuse shadow
            "0 6px 12px -4px rgba(0,0,0,0.25)",
            // Inner top-edge gleam (specular)
            "inset 0 1px 0 0 rgba(255,255,255,0.08)",
          ].join(", "),
        }}
      >
        {/* Specular highlight edge — simulates light catching the top of a physical device */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-4 top-0 h-px rounded-full"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.18) 30%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.18) 70%, transparent)",
          }}
        />

        {/* Nav items */}
        {NAV_ITEMS.map((item) => {
          const active = isActive(item.href, pathname);
          const pressed = pressedHref === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              onPointerDown={() => setPressedHref(item.href)}
              onPointerUp={() => setPressedHref(null)}
              onPointerLeave={() => setPressedHref(null)}
              className={cn(
                "relative z-10 flex flex-1 flex-col items-center justify-center gap-[3px]",
                "min-h-[52px] rounded-[22px]",
                "select-none outline-none",
                "transition-transform duration-[80ms] ease-out",
                pressed && "scale-[0.85]"
              )}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {/* Luminous glass capsule — rendered inside the active item via layoutId */}
              {active && (
                <motion.div
                  layoutId="mobileNavActivePill"
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 rounded-[22px]"
                  style={{
                    background:
                      "linear-gradient(to bottom, rgba(183,243,107,0.18), rgba(183,243,107,0.08))",
                    border: "1px solid rgba(183,243,107,0.30)",
                    boxShadow: "0 0 20px rgba(183,243,107,0.18), inset 0 1px 0 0 rgba(183,243,107,0.12)",
                  }}
                  transition={pillSpring}
                />
              )}

              {/* Icon with morphing weight */}
              <span
                className={cn(
                  "relative flex items-center justify-center",
                  "transition-[color,transform] duration-[150ms] ease-out",
                  active
                    ? "text-(--accent-lime)"
                    : "text-(--color-text-muted)"
                )}
                style={{
                  transform: active ? "scale(1)" : "scale(0.92)",
                }}
              >
                <Icon
                  className="size-[20px] shrink-0"
                  strokeWidth={active ? 2.4 : 1.6}
                />
              </span>

              {/* Label with weight shift */}
              <span
                className={cn(
                  "text-[10px] leading-none tracking-wide",
                  "transition-[color,font-weight] duration-[150ms] ease-out",
                  active
                    ? "text-(--accent-lime) font-semibold"
                    : "text-(--color-text-muted) font-medium"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
