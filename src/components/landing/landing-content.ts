export interface NavItem {
  label: string;
  href: string;
}

export interface PainPointCard {
  id: string;
  title: string;
  problem: string;
  response: string;
}

export interface RotatingPatternProblem {
  id: string;
  title: string;
  difficulty: string;
  topic: string;
  correctPattern: string;
  options: string[];
  explanation: string;
  leetcodeSlug: string;
}

export interface LearningLoopStep {
  id: number;
  label: string;
  header: string;
  role: string;
  outcome: string;
}

export interface FeatureBlock {
  id: string;
  label: string;
  headline: string;
  body: string;
}

export interface SocialProofCard {
  id: string;
  stat: string;
  label: string;
  iconName: "book" | "branch" | "refresh";
}

export interface SessionStep {
  id: number;
  duration: string;
  action: string;
  summary: string;
  status: "complete" | "current" | "next";
}

export interface LearnerStoryContent {
  label: string;
  scenarioBadge: string;
  headline: string;
  subtitle: string;
  topic: string;
  totalDuration: string;
  steps: SessionStep[];
  result: {
    headline: string;
    text: string;
  };
  rationale: string;
  cta: {
    label: string;
    href: string;
  };
  previewAction: {
    label: string;
    href: string;
  };
}

export const LANDING_NAV_LINKS: NavItem[] = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Features", href: "#features" },
  { label: "Learning paths", href: "#learning-path" },
];

export const HERO_CONTENT = {
  eyebrow: "DSA Learning OS",
  headline: `Know what to learn,\npractice,\nand revise next.`,
  subtitle:
    "A structured DSA learning system that tells you what to learn, practice, and revise—based on your actual progress.",
  primaryCta: {
    label: "Start free →",
    href: "/register?callbackUrl=/onboarding",
  },
  secondaryCta: {
    label: "See how it works",
    targetId: "#how-it-works",
  },
  trustLine: "No credit card · Free to start · DSA only",
  previewCard: {
    tag: "TODAY'S MISSION",
    title: "Sliding Window Foundations",
    stageInfo: "Stage 3 of 9 · Binary Trees",
    progress: 36,
    buttonLabel: "Resume Mission →",
  },
};

export const PAIN_POINTS_CONTENT = {
  headline: "Most DSA confusion starts before the code.",
  subtitle:
    "Students fail not from lack of resources—but from having too many with no sequence.",
  cards: [
    {
      id: "resources",
      title: "Too many resources, no sequence",
      problem: "You keep switching between videos, blogs, and problem lists with no clear priority.",
      response: "A structured learning path gives you one clear next step.",
    },
    {
      id: "patterns",
      title: "Random practice, no pattern understanding",
      problem: "Solving problems without recognizing which pattern applies leads to memorizing rather than understanding.",
      response: "Every problem begins with pattern recognition before you write code.",
    },
    {
      id: "revision",
      title: "No revision system, so concepts fade",
      problem: "Studied Binary Search last month? Without structured recall, it is gone by interview day.",
      response: "Spaced review resurfaces concepts right as your retention curve begins to dip.",
    },
  ] as PainPointCard[],
};

export const LEARNER_STORY_CONTENT: LearnerStoryContent = {
  label: "Example learner session",
  scenarioBadge: "Typical 30-minute session",
  headline: "You have 30 minutes.\nDSA Club turns it into a focused DSA session.",
  subtitle:
    "Instead of choosing from thousands of problems, follow one guided loop: review what is fading, learn one concept, and practice one targeted problem.",
  topic: "Binary Trees",
  totalDuration: "30 minutes",
  steps: [
    {
      id: 1,
      duration: "5 min",
      action: "Review",
      summary: "Recall a pattern before it fades.",
      status: "complete",
    },
    {
      id: 2,
      duration: "10 min",
      action: "Learn",
      summary: "Understand one concept through a guided mission.",
      status: "current",
    },
    {
      id: 3,
      duration: "15 min",
      action: "Practice",
      summary: "Apply the pattern to one focused problem.",
      status: "next",
    },
  ],
  result: {
    headline: "After the session",
    text: "Your progress is recorded and your next learning step is clear.",
  },
  rationale:
    "This example combines a due review with your active Binary Tree learning path.",
  cta: {
    label: "See how the learning loop works",
    href: "#how-it-works",
  },
  previewAction: {
    label: "Build my learning path",
    href: "/register?callbackUrl=/onboarding",
  },
};

export const ROTATING_PATTERN_PROBLEMS: RotatingPatternProblem[] = [
  {
    id: "container-water",
    title: "Container With Most Water",
    difficulty: "Medium",
    topic: "Arrays",
    correctPattern: "Two Pointer",
    options: ["Two Pointer", "Sliding Window", "Binary Search", "Hashing"],
    explanation: "Two Pointer — shrink from both ends to maximize area",
    leetcodeSlug: "container-with-most-water",
  },
  {
    id: "search-rotated",
    title: "Search in Rotated Sorted Array",
    difficulty: "Medium",
    topic: "Arrays",
    correctPattern: "Binary Search",
    options: ["Binary Search", "Two Pointer", "Dynamic Programming", "Greedy"],
    explanation: "Binary Search — identify which half is sorted to halve search space",
    leetcodeSlug: "search-in-rotated-sorted-array",
  },
  {
    id: "find-anagrams",
    title: "Find All Anagrams in a String",
    difficulty: "Medium",
    topic: "Strings",
    correctPattern: "Sliding Window",
    options: ["Sliding Window", "Prefix Sum", "Two Pointer", "DFS Graph"],
    explanation: "Sliding Window — maintain fixed window count of character frequencies",
    leetcodeSlug: "find-all-anagrams-in-a-string",
  },
];

export const LEARNING_LOOP_CONTENT = {
  label: "THE LEARNING LOOP",
  headline: "Learn → Practice → Revise → Master",
  subtitle: "One session gives you direction. The learning loop turns repeated sessions into mastery.",
  steps: [
    {
      id: 0,
      label: "Learn",
      header: "Complete a focused mission",
      role: "Creates your starting point",
      outcome: "You always know exactly what to study next",
    },
    {
      id: 1,
      label: "Practice",
      header: "Solve targeted problems",
      role: "Connects problems to patterns",
      outcome: "You recognize approaches, not just memorize solutions",
    },
    {
      id: 2,
      label: "Revise",
      header: "Recall key concepts",
      role: "Resurfaces knowledge at the right time",
      outcome: "What you learned 2 weeks ago stays with you",
    },
    {
      id: 3,
      label: "Master",
      header: "Demonstrate understanding",
      role: "Shows evidence, not just completion",
      outcome: "You can explain it, not just solve it",
    },
  ] as LearningLoopStep[],
};

export const FEATURES_CONTENT = {
  label: "WHAT MAKES IT DIFFERENT",
  headline: "Built around understanding, not completion.",
  features: [
    {
      id: "structured-missions",
      label: "STRUCTURED LEARNING",
      headline: "A focused sequence, not a giant topic list.",
      body: "Understand the concept in a deliberate sequence. Each topic is broken into clear stages: visualize invariants, recognize approach, then practice.",
    },
    {
      id: "pattern-recognition",
      label: "PATTERN INTELLIGENCE",
      headline: "Recognize the right approach before writing code.",
      body: "Before solving any problem, identify the underlying pattern. You learn to recognize when and why an algorithmic approach fits.",
    },
    {
      id: "spaced-revision",
      label: "REVISION ENGINE",
      headline: "Return to important concepts before they fade.",
      body: "The revision engine schedules recall sessions based on your retention curve—not arbitrary reminders. Review before memory decay begins.",
    },
  ] as FeatureBlock[],
};

export const SOCIAL_PROOF_CONTENT = {
  headline: "Built around how learning actually works.",
  subtitle:
    "DSA Club is designed on evidence-based learning principles—not gamification.",
  cards: [
    {
      id: "stages",
      stat: "Structured missions",
      label: "Know what to study and why it comes next",
      iconName: "book",
    },
    {
      id: "patterns",
      stat: "Pattern-based practice",
      label: "Recognize approaches instead of memorizing solutions",
      iconName: "branch",
    },
    {
      id: "spaced-rep",
      stat: "Spaced review",
      label: "Return to concepts before they disappear",
      iconName: "refresh",
    },
  ] as SocialProofCard[],
  honestBlock: {
    text: "DSA Club is currently in active development. Early access students are working through structured missions and spaced revision sessions.",
    cta: "Be among the first learners →",
    href: "/register?callbackUrl=/onboarding",
  },
};

export const FINAL_CTA_CONTENT = {
  headline: "Open the app with a direction, not a blank page.",
  subtitle: "Set your goal. Get your first learning path. Start in minutes.",
  buttonLabel: "Build my learning path →",
  buttonHref: "/register?callbackUrl=/onboarding",
  loginText: "Already have an account? Log in",
  loginHref: "/login?callbackUrl=/dashboard",
};

export const FOOTER_CONTENT = {
  copyright: "© 2025 DSA Club. All rights reserved.",
  links: [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
  ],
};
