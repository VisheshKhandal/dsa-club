import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Access Denied",
  description: "You do not have permission to view this page.",
};

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-destructive/10 flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-12 h-12 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-3">
          <p className="text-xs font-mono font-medium text-muted-foreground uppercase tracking-widest">
            Error 403
          </p>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            Access Denied
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            You don&apos;t have permission to access this area. This section is
            restricted to DSA Club administrators only.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-ring"
          >
            Go to Dashboard
          </Link>
          <Link
            href="/login"
            className="inline-flex h-9 items-center justify-center rounded-md border bg-background px-5 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-ring"
          >
            Sign in with another account
          </Link>
        </div>
      </div>
    </div>
  );
}
