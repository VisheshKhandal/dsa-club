import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/rbac";
import { StudioShell } from "@/components/studio/studio-shell";
import { connectToDatabase } from "@/lib/db/mongodb";
import { defaultStudioSettings, getStudioSettings } from "@/lib/studio-settings";

export const metadata: Metadata = {
  title: { default: "Studio · DSA Club", template: "%s · Studio" },
  description: "DSA Club content management studio — admin only.",
  robots: { index: false, follow: false },
};

export default async function StudioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const email = session?.user?.email;

  if (!email || !isAdminEmail(email)) {
    redirect("/403");
  }

  let settings = defaultStudioSettings;
  try {
    await connectToDatabase();
    settings = await getStudioSettings();
  } catch {
    settings = defaultStudioSettings;
  }

  return (
    <StudioShell user={{ name: session.user?.name, email: session.user?.email }} settings={settings}>
      {children}
    </StudioShell>
  );
}
