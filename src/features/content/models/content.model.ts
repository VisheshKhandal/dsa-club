import { model, Schema, type InferSchemaType } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";

const topicSchema = withTimestamps(new Schema({
  slug: { type: String, required: true, trim: true, lowercase: true, match: /^[a-z0-9-]+$/ },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  description: { type: String, required: true, maxlength: 1000 },
  order: { type: Number, required: true, min: 0 },
  difficulty: { type: String, enum: ["beginner", "easy", "medium", "hard", "advanced"], required: true },
  prerequisiteTopicIds: [{ type: objectId, ref: "Topic" }],
  estimatedMinutes: { type: Number, required: true, min: 5, max: 10_000 },
  isPublished: { type: Boolean, default: false, index: true },
}));
topicSchema.index({ slug: 1 }, { unique: true });
topicSchema.index({ isPublished: 1, order: 1 });

const patternSchema = withTimestamps(new Schema({
  slug: { type: String, required: true, lowercase: true, match: /^[a-z0-9-]+$/ },
  name: { type: String, required: true, maxlength: 120 },
  topicId: { type: objectId, ref: "Topic", required: true, index: true },
  description: { type: String, required: true, maxlength: 2000 },
  whenToUse: { type: String, default: "", maxlength: 2000 },
  mentalModel: { type: String, default: "", maxlength: 2000 },
  variations: [{ type: String, trim: true, maxlength: 300 }],
  signalKeywords: [{ type: String, trim: true, maxlength: 80 }],
  prerequisitePatternIds: [{ type: objectId, ref: "Pattern" }],
  difficulty: { type: String, enum: ["beginner", "easy", "medium", "hard", "advanced"], required: true },
  isPublished: { type: Boolean, default: false, index: true },
}));
patternSchema.index({ slug: 1 }, { unique: true });
patternSchema.index({ topicId: 1, isPublished: 1 });

const problemSchema = withTimestamps(new Schema({
  slug: { type: String, required: true, lowercase: true, match: /^[a-z0-9-]+$/ },
  title: { type: String, required: true, maxlength: 220 },
  summary: { type: String, required: true, maxlength: 3000 },
  thinkingDirection: { type: String, default: "", maxlength: 3000 },
  dryRunPrompt: { type: String, default: "", maxlength: 3000 },
  hints: [{
    level: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, default: "", maxlength: 120 },
    content: { type: String, required: true, maxlength: 1000 },
  }],
  commonMistakes: [{ type: String, trim: true, maxlength: 300 }],
  source: { type: String, enum: ["internal", "leetcode", "geeksforgeeks", "codeforces", "other"], required: true },
  sourceUrl: { type: String, required: true, maxlength: 2048 },
  externalId: { type: String, default: null, maxlength: 120 },
  topicIds: [{ type: objectId, ref: "Topic", required: true }],
  patternIds: [{ type: objectId, ref: "Pattern", required: true }],
  difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true, index: true },
  estimatedMinutes: { type: Number, required: true, min: 5, max: 300 },
  qualityScore: { type: Number, default: 0.5, min: 0, max: 1 },
  companyIds: [{ type: objectId, ref: "Company" }],
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
  isPublished: { type: Boolean, default: false, index: true },
}));
problemSchema.index({ slug: 1 }, { unique: true });
problemSchema.index({ topicIds: 1, difficulty: 1, isPublished: 1 });
problemSchema.index({ patternIds: 1, difficulty: 1, isPublished: 1 });

const missionSchema = withTimestamps(new Schema({
  slug: { type: String, required: true, lowercase: true, match: /^[a-z0-9-]+$/ },
  title: { type: String, required: true, maxlength: 160 },
  description: { type: String, required: true, maxlength: 2000 },
  topicId: { type: objectId, ref: "Topic", required: true, index: true },
  patternId: { type: objectId, ref: "Pattern", default: null },
  estimatedMinutes: { type: Number, required: true, min: 5, max: 480 },
  difficulty: { type: String, enum: ["beginner", "easy", "medium", "hard"], required: true },
  steps: [{ 
    key: { type: String, required: true }, 
    kind: { type: String, enum: ["introduction", "intuition", "concept", "mental_model", "visualization", "pattern", "example", "practice", "reflection", "mastery"], required: true }, 
    content: { type: String, default: "" }, // New rich-text field
    targetId: { type: objectId, default: null }, 
    required: { type: Boolean, default: true }, 
    weight: { type: Number, min: 0, max: 1, required: true } 
  }],
  order: { type: Number, default: 0, index: true },
  isPublished: { type: Boolean, default: false, index: true },
}));
missionSchema.index({ slug: 1 }, { unique: true });
missionSchema.index({ isPublished: 1, order: 1 });

const companySchema = withTimestamps(new Schema({
  slug: { type: String, required: true, lowercase: true, match: /^[a-z0-9-]+$/ },
  name: { type: String, required: true, maxlength: 120 },
  logo: { type: String, default: "" }, // New field
  description: { type: String, default: "", maxlength: 2000 }, // New field
  interviewProcess: { type: String, default: "", maxlength: 2000 }, // New field
  hiringNotes: { type: String, default: "", maxlength: 1000 }, // New field
  tier: { type: String, enum: ["startup", "growth", "product", "big_tech"], required: true },
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }], // New field
  externalLinks: [{ title: { type: String, required: true }, url: { type: String, required: true } }], // New field
  isPublished: { type: Boolean, default: false, index: true },
  isActive: { type: Boolean, default: true, index: true },
}));
companySchema.index({ slug: 1 }, { unique: true });

const companyPatternSchema = withTimestamps(new Schema({ companyId: { type: objectId, ref: "Company", required: true }, patternId: { type: objectId, ref: "Pattern", required: true }, relevanceScore: { type: Number, required: true, min: 0, max: 1 }, frequency: { type: String, enum: ["low", "medium", "high"], required: true } }));
companyPatternSchema.index({ companyId: 1, patternId: 1 }, { unique: true });
const companyProblemSchema = withTimestamps(new Schema({ companyId: { type: objectId, ref: "Company", required: true }, problemId: { type: objectId, ref: "Problem", required: true }, reportedAt: { type: Date, default: null }, confidence: { type: Number, default: 0.5, min: 0, max: 1 } }));
companyProblemSchema.index({ companyId: 1, problemId: 1 }, { unique: true });

export type Topic = InferSchemaType<typeof topicSchema>;
export type Pattern = InferSchemaType<typeof patternSchema>;
export type Problem = InferSchemaType<typeof problemSchema>;
export type Mission = InferSchemaType<typeof missionSchema>;
export const TopicModel = getModel("Topic", () => model<Topic>("Topic", topicSchema));
export const PatternModel = getModel("Pattern", () => model<Pattern>("Pattern", patternSchema));
export const ProblemModel = getModel("Problem", () => model<Problem>("Problem", problemSchema));
export const MissionModel = getModel("Mission", () => model<Mission>("Mission", missionSchema));
export const CompanyModel = getModel("Company", () => model("Company", companySchema));
export const CompanyPatternModel = getModel("CompanyPattern", () => model("CompanyPattern", companyPatternSchema));
export const CompanyProblemModel = getModel("CompanyProblem", () => model("CompanyProblem", companyProblemSchema));

// ─── Learning Path ──────────────────────────────────────────────────────────
const learningPathSchema = withTimestamps(new Schema({
  slug: { type: String, required: true, lowercase: true, match: /^[a-z0-9-]+$/ },
  title: { type: String, required: true, maxlength: 160 },
  description: { type: String, default: "", maxlength: 2000 },
  coverImage: { type: String, default: "" },
  estimatedMinutes: { type: Number, required: true, min: 30, max: 50000 },
  difficulty: { type: String, enum: ["beginner", "easy", "medium", "hard", "advanced"], required: true },
  audience: { type: String, default: "", maxlength: 500 },
  // Ordered stages, each containing refs
  stages: [{
    order: { type: Number, required: true },
    title: { type: String, required: true, maxlength: 120 },
    description: { type: String, default: "", maxlength: 500 },
    topicIds: [{ type: objectId, ref: "Topic" }],
    patternIds: [{ type: objectId, ref: "Pattern" }],
    problemIds: [{ type: objectId, ref: "Problem" }],
    missionIds: [{ type: objectId, ref: "Mission" }],
    estimatedMinutes: { type: Number, default: 60, min: 5 },
  }],
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
  isPublished: { type: Boolean, default: false, index: true },
  isFeatured: { type: Boolean, default: false },
}));
learningPathSchema.index({ slug: 1 }, { unique: true });
learningPathSchema.index({ isPublished: 1, isFeatured: -1 });

export type LearningPath = InferSchemaType<typeof learningPathSchema>;
export const LearningPathModel = getModel("LearningPath", () => model<LearningPath>("LearningPath", learningPathSchema));

// ─── Media Asset (Cloudinary-backed) ────────────────────────────────────────
const mediaAssetSchema = withTimestamps(new Schema({
  publicId: { type: String, required: true },       // Cloudinary public_id
  url: { type: String, required: true },             // Cloudinary secure_url
  thumbnailUrl: { type: String, default: "" },       // Cloudinary thumbnail URL
  fileName: { type: String, required: true, maxlength: 255 },
  originalName: { type: String, default: "", maxlength: 255 },
  mimeType: { type: String, required: true, maxlength: 100 },
  assetType: { type: String, enum: ["image", "video", "pdf", "svg", "gif", "other"], required: true },
  folder: { type: String, default: "general", maxlength: 120 },
  sizeBytes: { type: Number, default: 0 },
  width: { type: Number, default: null },
  height: { type: Number, default: null },
  tags: [{ type: String, trim: true, lowercase: true, maxlength: 40 }],
  altText: { type: String, default: "", maxlength: 255 },
  uploadedBy: { type: String, default: "admin", maxlength: 254 },
}));
mediaAssetSchema.index({ publicId: 1 }, { unique: true });
mediaAssetSchema.index({ folder: 1, assetType: 1, createdAt: -1 });
mediaAssetSchema.index({ tags: 1 });

export type MediaAsset = InferSchemaType<typeof mediaAssetSchema>;
export const MediaAssetModel = getModel("MediaAsset", () => model<MediaAsset>("MediaAsset", mediaAssetSchema));

// ─── Platform Settings ───────────────────────────────────────────────────────
const platformSettingSchema = new Schema({
  key: { type: String, required: true },
  value: { type: Schema.Types.Mixed, required: true },
  category: { type: String, default: "general" },
  updatedAt: { type: Date, default: Date.now },
});
platformSettingSchema.index({ key: 1 }, { unique: true });
export const PlatformSettingModel = getModel("PlatformSetting", () => model("PlatformSetting", platformSettingSchema));
