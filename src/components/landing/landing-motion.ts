export const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export const staggerChildren = {
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
};

export const revealViewport = {
  once: true,
  margin: "-80px",
};

export const springSubtle = {
  type: "spring",
  stiffness: 260,
  damping: 24,
};

export const springQuick = {
  type: "spring",
  stiffness: 350,
  damping: 26,
};

export const respectsReducedMotion = (animation: object) => ({
  ...animation,
  "@media (prefers-reduced-motion: reduce)": {
    transition: "none",
    animation: "none",
  },
});
