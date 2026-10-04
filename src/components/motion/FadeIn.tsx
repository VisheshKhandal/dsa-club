"use client";

import React from "react";
import { motion } from "framer-motion";
import { sectionEnter, fadeEnter } from "./variants";

export interface FadeInProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  slide?: boolean;
}

export function FadeIn({
  children,
  className,
  delay = 0,
  slide = true,
}: FadeInProps) {
  const variants = slide ? sectionEnter : fadeEnter;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      transition={{ delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
