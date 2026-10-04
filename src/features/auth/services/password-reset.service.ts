import { createHash, randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { addHours } from "date-fns";
import { Resend } from "resend";
import { connectToDatabase } from "@/lib/db/mongodb";
import { UserModel } from "@/features/identity/models/user.model";
import { PasswordResetTokenModel } from "@/features/auth/models/password-reset-token.model";

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function requestPasswordReset(email: string) {
  await connectToDatabase();
  const user = await UserModel.findOne({ email, status: "active" }).select("+passwordHash");
  if (!user?.passwordHash) return;
  const token = randomBytes(32).toString("hex");
  await PasswordResetTokenModel.deleteMany({ userId: user._id, usedAt: null });
  await PasswordResetTokenModel.create({ userId: user._id, tokenHash: hashToken(token), expiresAt: addHours(new Date(), 1) });
  const appUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL;
  const resendKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM;
  if (!appUrl || !resendKey || !emailFrom) return;
  const resetUrl = new URL("/reset-password", appUrl);
  resetUrl.searchParams.set("token", token);
  await new Resend(resendKey).emails.send({
    from: emailFrom,
    to: user.email,
    subject: "Reset your DSA Club password",
    text: `Reset your password within one hour: ${resetUrl.toString()}`,
  });
}

export async function resetPassword(token: string, password: string) {
  await connectToDatabase();
  const record = await PasswordResetTokenModel.findOne({ tokenHash: hashToken(token), usedAt: null, expiresAt: { $gt: new Date() } });
  if (!record) throw new Error("This password reset link is invalid or has expired.");
  const passwordHash = await bcrypt.hash(password, 12);
  await UserModel.updateOne({ _id: record.userId }, { $set: { passwordHash }, $addToSet: { authProviders: "credentials" } });
  record.usedAt = new Date();
  await record.save();
}
