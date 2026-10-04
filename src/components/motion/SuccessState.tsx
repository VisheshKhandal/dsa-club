"use client";

import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { successEnter } from "./variants";
import { cn } from "@/lib/utils";

export interface SuccessStateProps {
  label?: string;
  size?: number;
  className?: string;
  iconClassName?: string;
}

export function SuccessState({
  label,
  size = 14,
  className,
  iconClassName = "text-emerald-400",
}: SuccessStateProps) {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return (
      <span className={cn("inline-flex items-center gap-1.5", className)}>
        <Check size={size} strokeWidth={2.5} className={iconClassName} />
        {label && <span>{label}</span>}
      </span>
    );
  }

  return (
    <motion.span
      initial="hidden"
      animate="visible"
      variants={successEnter}
      className={cn("inline-flex items-center gap-1.5", className)}
    >
      <Check size={size} strokeWidth={2.5} className={iconClassName} />
      {label && <span>{label}</span>}
    </motion.span>
  );
}
