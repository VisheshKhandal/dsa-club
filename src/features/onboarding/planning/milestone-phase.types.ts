export type LearningPhase =
  | "orientation"          // Mental model, definitions, memory structure
  | "core_concept"        // Foundational invariants & conditions
  | "mechanics"           // Basic operations, pointers, traversals
  | "pattern_recognition" // Clues, pattern identification & classification
  | "guided_practice"     // Worked examples with hints & edge-case walk-throughs
  | "independent_practice"// Realistic targeted problem solving
  | "synthesis"           // Comparing techniques, trade-offs & complexities
  | "review";             // Spaced repetition & retention checkpoint

export type DailyMilestone = {
  dayNumber: number;
  dayLabel: string;
  topicName: string;
  topicSlug: string;
  phase: LearningPhase;
  title: string;
  focus: string;
  isFirstDay: boolean;
  isReviewOrCheckpoint: boolean;
};
