import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/rbac";
import { getOnboardingProfile } from "@/features/onboarding/services/onboarding.service";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

interface OnboardingPageProps {
  searchParams?: Promise<{ mode?: string; step?: string }>;
}

export default async function OnboardingPage({ searchParams }: OnboardingPageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  // Admins have no onboarding — send them to Studio
  if (session.user.email && isAdminEmail(session.user.email)) {
    redirect("/studio");
  }

  const resolvedParams = searchParams ? await searchParams : undefined;
  const isCalibrate = resolvedParams?.mode === "calibrate";
  const requestedStep = resolvedParams?.step;

  const profile = await getOnboardingProfile(session.user.id);
  const status = profile?.onboarding?.status;

  // Completed users are redirected to dashboard UNLESS explicitly calibrating
  if (status === "completed" && !isCalibrate) {
    redirect("/dashboard");
  }

  const draft = profile?.onboarding?.draft;
  const initialDraft = {
    experienceLevel: draft?.experienceLevel || (profile?.currentLevel as any) || undefined,
    companySlugs: draft?.companySlugs || [],
    customCompany: draft?.customCompany || undefined,
    dailyMinutes: draft?.dailyMinutes || (profile?.dailyMinutes as any) || undefined,
    language: draft?.language || (profile?.primaryLanguage as any) || undefined,
    topicKnowledgeMode: draft?.topicKnowledgeMode || undefined,
    knownTopicSlugs: draft?.knownTopicSlugs || [],
    learningGoal: draft?.learningGoal || undefined,
  };

  return (
    <OnboardingWizard
      initialDraft={initialDraft}
      initialStep={isCalibrate ? 0 : profile?.onboarding?.currentStep ?? 0}
      requestedStep={requestedStep}
      isCalibrateMode={isCalibrate}
    />
  );
}
