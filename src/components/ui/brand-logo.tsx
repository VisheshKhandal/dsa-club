"use client";

import React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
  /**
   * "lockup": Standard horizontal logo ("DSA" + "Club")
   * "icon": 3-circle icon only
   */
  variant?: "lockup" | "icon";
  alt?: string;
}

export const DARK_LOGO_PATH = "/icons/dsa-club-lockup.png";
export const LIGHT_LOGO_PATH = "/icons/DSA Club Lockup Light Mode.png";
export const ICON_LOGO_PATH = "/icons/dsa-club-icon.png";

/**
 * BrandLogo — Production-quality theme-aware DSA Club brand logo.
 *
 * Requirements:
 * - DARK MODE: Continues using the existing/current DSA Club logo (/icons/dsa-club-lockup.png)
 * - LIGHT MODE: Automatically switches to the light-mode logo (/icons/DSA Club Lockup Light Mode.png)
 * - Zero-latency switching without page reload via pure CSS selector synchronization
 * - Avoids Next.js SSR hydration mismatches by rendering a deterministic dual-asset DOM container
 *   where visibility is governed by active theme class and data-theme attribute.
 */
export function BrandLogo({
  width = 140,
  height = 36,
  className,
  priority = true,
  variant = "lockup",
  alt = "DSA Club",
}: BrandLogoProps) {
  if (variant === "icon") {
    return (
      <Image
        src={ICON_LOGO_PATH}
        alt={alt}
        width={width || 32}
        height={height || 32}
        className={cn("object-contain", className)}
        priority={priority}
      />
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center select-none relative brand-logo-container",
        className
      )}
    >
      {/* Dark mode logo (default) */}
      <Image
        src={DARK_LOGO_PATH}
        alt={alt}
        width={width}
        height={height}
        className="brand-logo-dark object-contain"
        priority={priority}
      />
      {/* Light mode logo */}
      <Image
        src={LIGHT_LOGO_PATH}
        alt={alt}
        width={width}
        height={height}
        className="brand-logo-light object-contain"
        priority={priority}
      />
    </span>
  );
}
