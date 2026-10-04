import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Sign in · DSA Club",
  description: "Sign in to your DSA Club account to access algorithmic missions, pattern recognition, and spaced revision.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<{ callbackUrl?: string }>;
}) {
  const params = searchParams ? await searchParams : undefined;
  const callbackUrl = params?.callbackUrl;
  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const githubEnabled = Boolean(process.env.GITHUB_ID && process.env.GITHUB_SECRET);

  return (
    <AuthShell
      mode="login"
      callbackUrl={callbackUrl}
      googleEnabled={googleEnabled}
      githubEnabled={githubEnabled}
    />
  );
}
