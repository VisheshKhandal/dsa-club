import { auth } from "@/lib/auth";

/** Emails that receive the admin role. Never allow self-registration as admin. */
function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().has(email.toLowerCase());
}

/** Server-side helper: returns the current session user or null. */
export async function getSession() {
  return auth();
}

/** Server-side helper: throws a 403-equivalent error if not an admin. */
export async function requireAdmin() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email || !isAdminEmail(email)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

/** Server-side helper: returns userId or throws Unauthorized. */
export async function requireAuth() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) throw new Error("UNAUTHORIZED");
  return { userId: id, email: session!.user!.email!, session };
}
