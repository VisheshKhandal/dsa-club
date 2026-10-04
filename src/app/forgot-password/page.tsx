import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Reset Password · DSA Club",
  description: "Reset your DSA Club account password.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we will send a secure reset link."
    >
      <ForgotPasswordForm />
      <p className="mt-6 text-center text-sm text-(--text-secondary)">
        <Link href="/login" className="font-semibold text-(--accent-lime) hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
