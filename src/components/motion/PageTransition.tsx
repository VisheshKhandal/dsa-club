"use client";

import { motion } from "framer-motion";
import { pageEnter } from "./variants";

export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  return <motion.div className={className} initial="hidden" animate="visible" variants={pageEnter}>{children}</motion.div>;
}
