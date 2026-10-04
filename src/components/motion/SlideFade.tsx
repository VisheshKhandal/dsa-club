"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { motionEase } from "./variants";

export interface SlideFadeProps {
  open: boolean;
  children: React.ReactNode;
  className?: string;
  duration?: number;
  initialHeight?: number | string;
}

export function SlideFade({
  open,
  children,
  className,
  duration = 0.16,
}: SlideFadeProps) {
  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          initial={{ opacity: 0, height: 0, overflow: "hidden" }}
          animate={{
            opacity: 1,
            height: "auto",
            overflow: "hidden",
            transition: {
              height: { duration, ease: motionEase },
              opacity: { duration: duration * 0.9, ease: "easeOut" },
            },
          }}
          exit={{
            opacity: 0,
            height: 0,
            overflow: "hidden",
            transition: {
              height: { duration: duration * 0.85, ease: "easeInOut" },
              opacity: { duration: duration * 0.6, ease: "easeIn" },
            },
          }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
