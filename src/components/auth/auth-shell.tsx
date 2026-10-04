"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LearningCockpit } from "@/components/auth/learning-cockpit";
import { CredentialsForm } from "@/components/auth/credentials-form";
import { signInWithGitHubAction, signInWithGoogleAction } from "@/features/auth/actions/auth.actions";

type AuthMode = "login" | "register";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.3 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0 fill-current" aria-hidden="true">
      <path d="M12 .5a12 12 0 0 0-3.79 23.39c.6.11.82-.26.82-.58v-2.04c-3.34.73-4.04-1.42-4.04-1.42-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.13-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.47 11.47 0 0 1 6.01 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.49 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.58A12 12 0 0 0 12 .5z" />
    </svg>
  );
}

function SocialButton({
  provider,
  action,
  enabled,
  callbackUrl,
}: {
  provider: "Google" | "GitHub";
  action: (formData?: FormData) => Promise<void>;
  enabled: boolean;
  callbackUrl?: string;
}) {
  return (
    <form action={action} className="w-full">
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
      <button
        type="submit"
        disabled={!enabled}
        className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-(--border-subtle) bg-(--bg-surface-raised) px-4 text-sm font-medium text-(--text-primary) shadow-xs transition hover:border-(--border-strong) hover:bg-(--bg-surface) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime) active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
      >
        {provider === "Google" ? <GoogleIcon /> : <GitHubIcon />}
        <span>Continue with {provider}</span>
      </button>
    </form>
  );
}

export function AuthShell({
  mode: initialMode = "login",
  title,
  subtitle,
  children,
  callbackUrl,
  googleEnabled = true,
  githubEnabled = true,
}: {
  title?: string;
  subtitle?: string;
  mode?: AuthMode;
  children?: React.ReactNode;
  callbackUrl?: string;
  googleEnabled?: boolean;
  githubEnabled?: boolean;
}) {
  const router = useRouter();
  const [currentMode, setCurrentMode] = useState<AuthMode>(initialMode);

  const switchMode = (newMode: AuthMode) => {
    setCurrentMode(newMode);
    const target = newMode === "login" ? "/login" : "/register";
    const dest = callbackUrl ? `${target}?callbackUrl=${encodeURIComponent(callbackUrl)}` : target;
    router.push(dest);
  };

  const isLogin = currentMode === "login";

  return (
    <main className="relative flex min-h-[100dvh] w-full flex-col justify-center overflow-x-hidden bg-(--bg-app) p-3 text-(--text-primary) sm:p-5 lg:p-[clamp(14px,2dvh,28px)]">
      {/* Subtle Low-Intensity Ambient Lighting (Clipped to prevent document scrollbars) */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -left-20 -top-20 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(183,243,107,0.04)_0%,transparent_70%)]" />
        <div className="absolute -bottom-20 -right-20 size-[520px] rounded-full bg-[radial-gradient(circle,rgba(183,243,107,0.03)_0%,transparent_70%)]" />
      </div>

      {/* Main Centered 16:9 Split-Screen Container */}
      <div className="relative m-auto flex w-full max-w-[1540px] flex-1 flex-col overflow-hidden rounded-3xl border border-(--border-subtle) bg-(--bg-surface) shadow-2xl backdrop-blur-2xl lg:grid lg:grid-cols-[1.18fr_0.82fr]">
        {/* Left Column: Learning Cockpit */}
        <LearningCockpit />

        {/* Right Column: Authentication Suite */}
        <section
          aria-label="Authentication Panel"
          className="relative flex flex-1 flex-col justify-center bg-(--bg-surface) px-5 py-9 sm:px-10 lg:px-[clamp(36px,4.5vw,60px)] lg:py-[clamp(24px,3.5vh,44px)]"
        >
          <div className="m-auto w-full max-w-[440px]">
            {children ? (
              /* Custom Form Mode: /forgot-password, /reset-password */
              <div>
                <div className="space-y-1.5 mb-7">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-(--text-primary)">
                    {title ?? "Reset your password"}
                  </h1>
                  {subtitle && (
                    <p className="text-[14px] text-(--text-secondary) leading-relaxed">
                      {subtitle}
                    </p>
                  )}
                </div>
                {children}
              </div>
            ) : (
              /* Standard Mode: Sign in / Create account */
              <>
                {/* Top Tab Switcher with Animated Sliding Underline */}
                <div className="mb-8 flex items-center border-b border-(--border-subtle) text-sm font-semibold">
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className={`relative pb-3 text-left transition-colors duration-200 cursor-pointer ${
                      isLogin ? "text-(--text-primary)" : "text-(--text-muted) hover:text-(--text-secondary)"
                    }`}
                  >
                    Sign in
                    {isLogin && (
                      <motion.span
                        layoutId="active-auth-tab"
                        className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-(--accent-lime)"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className={`relative ml-7 pb-3 text-left transition-colors duration-200 cursor-pointer ${
                      !isLogin ? "text-(--text-primary)" : "text-(--text-muted) hover:text-(--text-secondary)"
                    }`}
                  >
                    Create account
                    {!isLogin && (
                      <motion.span
                        layoutId="active-auth-tab"
                        className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-(--accent-lime)"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </button>
                </div>

                {/* Headline and Supporting Copy */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentMode}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="space-y-1.5"
                  >
                    <h1 className="text-3xl font-extrabold tracking-tight text-(--text-primary) sm:text-4xl">
                      {isLogin ? "Welcome back." : "Create your account."}
                    </h1>
                    <p className="text-[15px] text-(--text-secondary) font-normal">
                      {isLogin
                        ? "Pick up your next clear learning step."
                        : "Set your goal and get a learning path built around your next step."}
                    </p>
                  </motion.div>
                </AnimatePresence>

                {/* Form Fields & Submit CTA */}
                <div className="mt-7">
                  <CredentialsForm mode={currentMode} callbackUrl={callbackUrl} />
                </div>

                {/* OR CONTINUE WITH Divider */}
                <div className="mt-7 flex items-center gap-3 text-[11px] font-mono font-bold uppercase tracking-wider text-(--text-muted) before:h-px before:flex-1 before:bg-(--border-subtle) after:h-px after:flex-1 after:bg-(--border-subtle)">
                  or continue with
                </div>

                {/* Social Authentication Buttons */}
                <div className="mt-4 grid gap-2.5">
                  <SocialButton
                    provider="Google"
                    action={signInWithGoogleAction}
                    enabled={googleEnabled}
                    callbackUrl={callbackUrl}
                  />
                  <SocialButton
                    provider="GitHub"
                    action={signInWithGitHubAction}
                    enabled={githubEnabled}
                    callbackUrl={callbackUrl}
                  />
                </div>

                {/* Bottom Account-Switching Link */}
                <p className="mt-7 text-center text-sm text-(--text-secondary)">
                  {isLogin ? (
                    <>
                      New to DSA Club?{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("register")}
                        className="font-semibold text-(--accent-lime) hover:underline cursor-pointer"
                      >
                        Create an account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => switchMode("login")}
                        className="font-semibold text-(--accent-lime) hover:underline cursor-pointer"
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </p>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
