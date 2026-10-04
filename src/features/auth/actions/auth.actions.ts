"use server";

import bcrypt from "bcrypt";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { connectToDatabase } from "@/lib/db/mongodb";
import { signIn } from "@/lib/auth";
import { UserModel } from "@/features/identity/models/user.model";
import { requestPasswordReset, resetPassword } from "@/features/auth/services/password-reset.service";
import { forgotPasswordSchema, loginSchema, registerSchema, resetPasswordSchema } from "@/features/auth/validators/auth.validators";

import { resolvePostAuthRedirect } from "@/features/auth/services/post-auth-resolver.service";

export type AuthActionState = { status: "idle" | "error" | "success"; message?: string; fieldErrors?: Record<string, string[]> };

function invalid(state: { flatten: () => { fieldErrors: Record<string, string[]> } }): AuthActionState {
  return { status: "error", message: "Please correct the highlighted fields.", fieldErrors: state.flatten().fieldErrors };
}

export async function registerAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const callbackUrl = typeof raw.callbackUrl === "string" && raw.callbackUrl ? raw.callbackUrl : undefined;

  await connectToDatabase();
  const existing = await UserModel.exists({ email: parsed.data.email });
  if (existing) return { status: "error", message: "An account already exists for this email address." };
  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  let createdUser;
  try {
    createdUser = await UserModel.create({
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
      authProviders: ["credentials"],
    });
  } catch (error: unknown) {
    if (typeof error === "object" && error && "code" in error && error.code === 11000) {
      return { status: "error", message: "An account already exists for this email address." };
    }
    return { status: "error", message: "We could not create your account. Please try again." };
  }

  const destination = await resolvePostAuthRedirect({
    userId: String(createdUser._id),
    email: parsed.data.email,
    callbackUrl,
  });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: destination,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if (error instanceof AuthError) return { status: "success", message: "Account created. Please sign in." };
    throw error;
  }
  redirect(destination);
}

export async function loginAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const raw = Object.fromEntries(formData);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) return invalid(parsed.error);
  const callbackUrl = typeof raw.callbackUrl === "string" && raw.callbackUrl ? raw.callbackUrl : undefined;

  await connectToDatabase();
  const user = await UserModel.findOne({ email: parsed.data.email.toLowerCase(), status: "active" });

  const destination = await resolvePostAuthRedirect({
    userId: user ? String(user._id) : undefined,
    email: parsed.data.email,
    callbackUrl,
  });

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: destination,
    });
  } catch (error) {
    // Next.js redirect() throws internally — let it propagate so the browser navigates.
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    // Distinguish DB / network failures from wrong credentials.
    const name = error instanceof Error ? error.constructor.name : "";
    const message = error instanceof Error ? error.message : "";
    const isDbError =
      name === "MongooseServerSelectionError" ||
      name === "MongoNetworkError" ||
      name === "MongoNetworkTimeoutError" ||
      message.includes("Server selection timed out") ||
      message.includes("connect ECONNREFUSED") ||
      message.includes("connect ETIMEDOUT") ||
      // Auth.js wraps DB errors in CallbackRouteError — check the cause
      (name === "CallbackRouteError" &&
        error instanceof Error &&
        "cause" in error &&
        error.cause instanceof Error &&
        (error.cause.constructor.name.startsWith("Mongo") || error.cause.message.includes("timed out")));
    if (isDbError) {
      return { status: "error", message: "Cannot reach the database right now. Please try again in a moment." };
    }
    if (error instanceof AuthError) {
      return { status: "error", message: "Incorrect email or password." };
    }
    // Unknown error — do not leak internals to the browser.
    return { status: "error", message: "Something went wrong. Please try again." };
  }
  redirect(destination);
}

export async function signInWithGoogleAction(formData?: FormData) {
  const callbackUrl = formData?.get("callbackUrl") as string | undefined;
  const redirectTarget = "/auth/resolve" + (callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : "");
  await signIn("google", { redirectTo: redirectTarget });
}

export async function signInWithGitHubAction(formData?: FormData) {
  const callbackUrl = formData?.get("callbackUrl") as string | undefined;
  const redirectTarget = "/auth/resolve" + (callbackUrl ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : "");
  await signIn("github", { redirectTo: redirectTarget });
}

export async function forgotPasswordAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  try { await requestPasswordReset(parsed.data.email); } catch { /* Keep account existence private and allow retry later. */ }
  return { status: "success", message: "If an account exists for this email, a reset link has been sent." };
}

export async function resetPasswordAction(_previous: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);
  try { await resetPassword(parsed.data.token, parsed.data.password); return { status: "success", message: "Password updated. You can now sign in." }; }
  catch (error) { return { status: "error", message: error instanceof Error ? error.message : "Password reset failed." }; }
}
