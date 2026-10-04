import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address").max(254);
export const passwordSchema = z.string().min(8, "Password must be at least 8 characters").max(128).regex(/[a-z]/, "Include a lowercase letter").regex(/[A-Z]/, "Include an uppercase letter").regex(/[0-9]/, "Include a number");

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(80),
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Password is required").max(128) });
export const forgotPasswordSchema = z.object({ email: emailSchema });
const resetPasswordFields = z.object({ password: passwordSchema, confirmPassword: z.string() });
export const resetPasswordFormSchema = resetPasswordFields.refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });
export const resetPasswordSchema = resetPasswordFields.extend({ token: z.string().min(32).max(256) }).refine((data) => data.password === data.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match" });

export type RegisterInput = z.infer<typeof registerSchema>;
