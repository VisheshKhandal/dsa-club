export const CAREER_TRACKS = [
  { label: "FAANG / Big Tech", value: "FAANG / Big Tech", description: "Google, Meta, Amazon, Microsoft, Apple" },
  { label: "Product Company", value: "Product Company", description: "Tier-1 Tech, Unicorns & High-Growth scaleups" },
  { label: "High-Growth Startup", value: "Startup", description: "Fast-moving early & growth-stage engineering teams" },
  { label: "Service Company", value: "Service Company", description: "TCS, Infosys, Wipro, Accenture, Cognizant" },
  { label: "Internship", value: "Internship", description: "Pre-final & final year summer/winter internships" },
  { label: "Competitive Programming", value: "Competitive Programming", description: "Contests, ratings & algorithmic speed" },
] as const;

export const TARGET_ROLES = [
  { label: "Software Development Engineer (SDE)", value: "Software Development Engineer (SDE)" },
  { label: "Frontend Engineer", value: "Frontend Engineer" },
  { label: "Backend Engineer", value: "Backend Engineer" },
  { label: "Full Stack Engineer", value: "Full Stack Engineer" },
  { label: "Systems / Core Engineer", value: "Systems / Core Engineer" },
] as const;

export const EXPERIENCE_OPTIONS = [
  { label: "Beginner", value: "beginner", hint: "Learning core data structures, syntax, and foundational patterns" },
  { label: "Intermediate", value: "intermediate", hint: "Comfortable with trees, graphs, and standard DP patterns" },
  { label: "Advanced", value: "advanced", hint: "Targeting hard interview problems and optimized competitive code" },
] as const;

export const LANGUAGE_OPTIONS = [
  { label: "C++", value: "cpp", hint: "Standard Template Library (STL), maximum performance" },
  { label: "Python", value: "python", hint: "Expressive syntax, rapid whiteboard iteration" },
  { label: "Java", value: "java", hint: "Standard Collections Framework, enterprise SDE" },
  { label: "JavaScript", value: "javascript", hint: "Modern web runtime, full-stack algorithms" },
] as const;

export const DAILY_MINUTES_STEPS = [15, 30, 45, 60, 90, 120] as const;

export const DIFFICULTY_PREFERENCES = [
  {
    value: "adaptive",
    label: "Adaptive (Recommended)",
    badge: "Recommended",
    description: "Dynamically calibrates problem challenge to your current mastery evidence and solve streak.",
  },
  {
    value: "gentle",
    label: "Gentle Pace",
    badge: "Reinforce",
    description: "Prioritizes foundational patterns and high-confidence reinforcement before stepping up difficulty.",
  },
  {
    value: "stretch",
    label: "Stretch Challenge",
    badge: "Sprint",
    description: "Actively serves challenging/hard problems to accelerate readiness for competitive interviews.",
  },
] as const;

export const LEARNING_FOCUS_OPTIONS = [
  {
    value: "balanced",
    label: "Balanced Loop (Recommended)",
    description: "5-phase loop balancing roadmap concepts, weakness repair, and spaced revision.",
  },
  {
    value: "concept_first",
    label: "Concept-First Deep Dive",
    description: "Prioritizes reading patterns and theoretical intuition before problem-solving.",
  },
  {
    value: "practice_heavy",
    label: "Practice & Problem Sprint",
    description: "Prioritizes high-volume problem reps and targeted weakness repair drills.",
  },
] as const;

export function getPaceDescription(minutes: number): { pace: string; frequency: string; weeklyHours: string } {
  switch (minutes) {
    case 15:
      return {
        pace: "Foundation Pace",
        frequency: "~1 topic every 2 weeks",
        weeklyHours: "1.75 hrs/week",
      };
    case 30:
      return {
        pace: "Steady Pace",
        frequency: "~1 topic per week",
        weeklyHours: "3.5 hrs/week",
      };
    case 45:
      return {
        pace: "Accelerated Pace",
        frequency: "~1–2 topics per week",
        weeklyHours: "5.25 hrs/week",
      };
    case 60:
      return {
        pace: "Intensive Pace",
        frequency: "~2 topics per week",
        weeklyHours: "7.0 hrs/week",
      };
    case 90:
      return {
        pace: "Immersion Pace",
        frequency: "~3 topics per week",
        weeklyHours: "10.5 hrs/week",
      };
    case 120:
    default:
      return {
        pace: "Full-Time Sprint Pace",
        frequency: "~4+ topics per week",
        weeklyHours: "14.0 hrs/week",
      };
  }
}

export function parseGoal(rawGoal?: string): { track: string; role: string } {
  if (!rawGoal) {
    return { track: "FAANG / Big Tech", role: "Software Development Engineer (SDE)" };
  }
  const parts = rawGoal.split("·").map((p) => p.trim());
  if (parts.length >= 2) {
    const matchedTrack = CAREER_TRACKS.find(
      (t) => t.value.toLowerCase() === parts[0].toLowerCase() || t.label.toLowerCase() === parts[0].toLowerCase()
    );
    const matchedRole = TARGET_ROLES.find((r) => r.value.toLowerCase() === parts[1].toLowerCase());
    return {
      track: matchedTrack ? matchedTrack.value : parts[0],
      role: matchedRole ? matchedRole.value : parts[1],
    };
  }
  const matchedTrack = CAREER_TRACKS.find(
    (t) => t.value.toLowerCase() === rawGoal.toLowerCase() || t.label.toLowerCase() === rawGoal.toLowerCase()
  );
  return {
    track: matchedTrack ? matchedTrack.value : rawGoal,
    role: "Software Development Engineer (SDE)",
  };
}

export function formatGoal(track: string, role: string): string {
  return `${track} · ${role}`;
}
