import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Create an Account · DSA Club",
  description: "Start your algorithmic mastery journey today with DSA Club's adaptive learning engine.",
};

export default async function RegisterPage({
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
      mode="register"
      callbackUrl={callbackUrl}
      googleEnabled={googleEnabled}
      githubEnabled={githubEnabled}
    />
  );
}
