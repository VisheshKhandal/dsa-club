import { NextResponse } from "next/server";
import NextAuth from "next-auth";
import authConfig from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const authPages = new Set(["/login", "/register", "/forgot-password", "/reset-password"]);

const protectedPages = [
  "/account",
  "/profile",
  "/dashboard",
  "/roadmap",
  "/intelligence",
  "/plan",
  "/learn",
  "/learning-paths",
  "/missions",
  "/practice",
  "/patterns",
  "/companies",
  "/interview",
  "/revision",
  "/review",
  "/progress",
  "/achievements",
  "/settings",
  "/notifications",
  "/search",
  "/onboarding",
  "/auth/resolve",
];

function getAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
  );
}

export default auth((request) => {
  const signedIn = Boolean(request.auth?.user?.email);
  const email = request.auth?.user?.email ?? "";
  const adminEmails = getAdminEmails();
  const isAdmin = signedIn && adminEmails.has(email.toLowerCase());
  
  const { pathname } = request.nextUrl;

  // Redirect authenticated users away from auth pages
  if (signedIn && authPages.has(pathname)) {
    return NextResponse.redirect(new URL(isAdmin ? "/studio" : "/auth/resolve", request.url));
  }

  const isStudentPage = protectedPages.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  const isStudioPage = pathname === "/studio" || pathname.startsWith("/studio/");

  // Admins trying to access student pages get redirected to studio
  if (isAdmin && isStudentPage) {
    return NextResponse.redirect(new URL("/studio", request.url));
  }

  // Protect student pages for non-authenticated users
  if (!signedIn && isStudentPage) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Protect /studio routes — require admin role
  if (isStudioPage) {
    if (!signedIn) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/403", request.url));
    }
  }

  return NextResponse.next();
});

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"] };
