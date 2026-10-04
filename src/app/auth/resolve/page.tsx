import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { resolvePostAuthRedirect } from "@/features/auth/services/post-auth-resolver.service";

export default async function AuthResolvePage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const { callbackUrl } = await searchParams;

  const destination = await resolvePostAuthRedirect({
    userId: session.user.id,
    email: session.user.email,
    callbackUrl,
  });

  redirect(destination);
}
