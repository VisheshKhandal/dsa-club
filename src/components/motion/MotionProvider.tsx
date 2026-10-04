"use client";

import { MotionConfig } from "framer-motion";
import { motionEase } from "./variants";

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig
      reducedMotion="user"
      transition={{ duration: 0.18, ease: motionEase }}
    >
      {children}
    </MotionConfig>
  );
}
