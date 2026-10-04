import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/rbac";
import { getOnboardingProfile } from "@/features/onboarding/services/onboarding.service";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageTransition } from "@/components/motion";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  
  // Admins belong in Studio — never show them the student app
  if (session.user.email && isAdminEmail(session.user.email)) {
    redirect("/studio");
  }
  
  const profile = await getOnboardingProfile(session.user.id);
  const status = profile?.onboarding?.status;
  if (status !== "completed" && status !== "skipped") {
    redirect("/onboarding");
  }

  return (
    <AppLayout
      user={{
        name: session.user.name,
        email: session.user.email,
      }}
    >
      <PageTransition>{children}</PageTransition>
    </AppLayout>
  );
}


