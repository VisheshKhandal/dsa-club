import type { Types } from "mongoose";

export type ObjectId = Types.ObjectId;
export type ISODateString = string;

export type Difficulty = "beginner" | "easy" | "medium" | "hard" | "advanced";
export type MasteryLevel = "unseen" | "introduced" | "developing" | "proficient" | "mastered";
export type RecommendationReason =
  | "revision_due" | "roadmap_next" | "weakness_repair" | "pattern_reinforcement"
  | "daily_goal" | "company_alignment" | "momentum" | "recovery";
