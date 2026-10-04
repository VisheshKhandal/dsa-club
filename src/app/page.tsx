import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/rbac";
import { getOnboardingProfile } from "@/features/onboarding/services/onboarding.service";
import { LandingPage } from "@/components/landing/landing-page";

export default async function HomePage() {
  const session = await auth();
  if (!session?.user?.id) return <LandingPage />;
  
  // Admins skip onboarding and go straight to Studio
  if (session.user.email && isAdminEmail(session.user.email)) {
    redirect("/studio");
  }
  
  const profile = await getOnboardingProfile(session.user.id);
  const isFinished = profile?.onboarding?.status === "completed" || profile?.onboarding?.status === "skipped";
  redirect(isFinished ? "/dashboard" : "/onboarding");
}
