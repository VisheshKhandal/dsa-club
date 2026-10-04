import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Create New Password · DSA Club",
  description: "Set a new password for your DSA Club account.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <AuthShell
        title="Invalid reset link"
        subtitle="Request a fresh password reset link to continue."
      >
        <p className="mt-7 text-center text-sm text-(--text-secondary)">
          <Link
            href="/forgot-password"
            className="font-semibold text-(--accent-lime) hover:underline"
          >
            Request a new link
          </Link>
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Use at least 8 characters with uppercase, lowercase, and a number."
    >
      <ResetPasswordForm token={token} />
      <p className="mt-6 text-center text-sm text-(--text-secondary)">
        <Link
          href="/login"
          className="font-semibold text-(--accent-lime) hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}
