import { isAdminEmail } from "@/lib/rbac";
import { getOnboardingProfile } from "@/features/onboarding/services/onboarding.service";

export interface PostAuthParams {
  userId?: string | null;
  email?: string | null;
  callbackUrl?: string | null;
}

const BLOCKED_CALLBACK_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/profile",
  "/account",
  "/auth/resolve",
];

/**
 * Resolves the appropriate post-authentication destination based on user role and onboarding status:
 * 1. Admin users -> /studio
 * 2. Learners who haven't completed onboarding -> /onboarding
 * 3. Completed learners with a safe callbackUrl -> callbackUrl
 * 4. Completed learners default -> /dashboard
 */
export async function resolvePostAuthRedirect({
  userId,
  email,
  callbackUrl,
}: PostAuthParams): Promise<string> {
  // 1. Admin check
  if (email && isAdminEmail(email)) {
    return "/studio";
  }

  // 2. Onboarding check
  if (userId) {
    const profile = await getOnboardingProfile(userId);
    const status = profile?.onboarding?.status;
    if (status !== "completed" && status !== "skipped") {
      return "/onboarding";
    }
  } else {
    return "/onboarding";
  }

  // 3. Safe callback check for completed learners
  if (callbackUrl && typeof callbackUrl === "string") {
    if (
      callbackUrl.startsWith("/") &&
      !callbackUrl.startsWith("//") &&
      !callbackUrl.includes("://")
    ) {
      const pathname = callbackUrl.split("?")[0];
      const isBlocked = BLOCKED_CALLBACK_PATHS.some(
        (blocked) => pathname === blocked || pathname.startsWith(`${blocked}/`)
      );
      if (!isBlocked) {
        return callbackUrl;
      }
    }
  }

  // 4. Default destination
  return "/dashboard";
}
