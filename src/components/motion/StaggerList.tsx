"use client";

import React from "react";
import { motion, type Variants } from "framer-motion";
import { listEnter, listItemEnter } from "./variants";

export interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
  staggerDelay?: number;
  initialDelay?: number;
}

export function StaggerList({
  children,
  className,
  staggerDelay = 0.06,
  initialDelay = 0.02,
}: StaggerListProps) {
  const customVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: Math.min(0.07, Math.max(0.04, staggerDelay)),
        delayChildren: initialDelay,
      },
    },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={customVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div variants={listItemEnter} className={className}>
      {children}
    </motion.div>
  );
}
