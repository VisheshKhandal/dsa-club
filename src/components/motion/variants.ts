import type { Variants } from "framer-motion";

export const motionEase = [0.16, 1, 0.3, 1] as const;

export const pageEnter: Variants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.22, ease: motionEase },
    transitionEnd: { transform: "none" },
  },
};

export const sectionEnter: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: motionEase } },
};

export const popoverEnter: Variants = {
  hidden: { opacity: 0, y: -4 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.16, ease: motionEase } },
  exit: { opacity: 0, y: -2, transition: { duration: 0.12, ease: "easeOut" } },
};

export const listEnter: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.02,
    },
  },
};

export const listItemEnter: Variants = {
  hidden: { opacity: 0, y: 4 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.16, ease: motionEase },
  },
};

export const successEnter: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.22, ease: motionEase },
  },
};

export const fadeEnter: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.18, ease: motionEase } },
  exit: { opacity: 0, transition: { duration: 0.14, ease: "easeOut" } },
};

export const exitFade: Variants = {
  exit: { opacity: 0, transition: { duration: 0.14, ease: "easeOut" } },
};
