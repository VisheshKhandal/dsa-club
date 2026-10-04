import { model, Schema } from "mongoose";
import { getModel } from "@/lib/db/model";
import { objectId, withTimestamps } from "@/lib/db/schema";

const passwordResetTokenSchema = withTimestamps(new Schema({
  userId: { type: objectId, ref: "User", required: true, index: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  expiresAt: { type: Date, required: true },
  usedAt: { type: Date, default: null },
}));

passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const PasswordResetTokenModel = getModel("PasswordResetToken", () => model("PasswordResetToken", passwordResetTokenSchema));
