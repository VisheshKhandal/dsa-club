"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LoaderCircle } from "lucide-react";
import { FormField, PasswordField, fieldClass } from "@/components/auth/form-elements";
import { loginAction, registerAction, type AuthActionState } from "@/features/auth/actions/auth.actions";
import { loginSchema, registerSchema, type RegisterInput } from "@/features/auth/validators/auth.validators";

type LoginValues = { email: string; password: string };

const initialAuthState: AuthActionState = { status: "idle" };

export function CredentialsForm({
  mode,
  callbackUrl,
}: {
  mode: "login" | "register";
  callbackUrl?: string;
}) {
  const action = mode === "login" ? loginAction : registerAction;
  const [state, formAction, pending] = useActionState(action, initialAuthState);
  const form = useForm<LoginValues | RegisterInput>({
    mode: "onChange",
    resolver: zodResolver(mode === "login" ? loginSchema : registerSchema),
    defaultValues:
      mode === "login"
        ? { email: "", password: "" }
        : { name: "", email: "", password: "", confirmPassword: "" },
  });
  const values = form.watch();
  const errors = form.formState.errors;
  const fieldError = (name: string) =>
    (errors as Record<string, { message?: string }>)[name]?.message ??
    state.fieldErrors?.[name]?.[0];

  const canSubmit =
    mode === "login"
      ? Boolean("email" in values && values.email && "password" in values && values.password)
      : Boolean(
          "name" in values &&
          values.name &&
          "email" in values &&
          values.email &&
          "password" in values &&
          values.password &&
          "confirmPassword" in values &&
          values.confirmPassword
        );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}

      {mode === "register" && (
        <FormField label="Full name" error={fieldError("name")}>
          <input
            {...form.register("name" as never)}
            autoComplete="name"
            disabled={pending}
            placeholder="Your name"
            className={fieldClass(fieldError("name"))}
          />
        </FormField>
      )}

      <FormField label="Email address" error={fieldError("email")}>
        <input
          {...form.register("email")}
          type="email"
          autoComplete="email"
          disabled={pending}
          placeholder="you@example.com"
          className={fieldClass(fieldError("email"))}
        />
      </FormField>

      <FormField label="Password" error={fieldError("password")}>
        <PasswordField
          {...form.register("password")}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          disabled={pending}
          placeholder="Enter your password"
          error={fieldError("password")}
        />
      </FormField>

      {mode === "register" && (
        <FormField label="Confirm password" error={fieldError("confirmPassword")}>
          <PasswordField
            {...form.register("confirmPassword" as never)}
            autoComplete="new-password"
            disabled={pending}
            placeholder="Repeat your password"
            error={fieldError("confirmPassword")}
          />
        </FormField>
      )}

      {mode === "login" && (
        <div className="flex justify-end pt-0.5">
          <Link
            href={
              callbackUrl
                ? `/forgot-password?callbackUrl=${encodeURIComponent(callbackUrl)}`
                : "/forgot-password"
            }
            className="text-xs font-medium text-(--text-muted) transition hover:text-(--accent-lime)"
          >
            Forgot password?
          </Link>
        </div>
      )}

      {state.message && (
        <div
          role="alert"
          className={`rounded-xl border px-4 py-3 text-sm ${
            state.status === "success"
              ? "border-(--accent-lime)/30 bg-(--accent-lime)/10 text-(--accent-lime)"
              : "border-rose-500/30 bg-rose-500/10 text-rose-300"
          }`}
        >
          {state.message}
        </div>
      )}

      <div className="pt-2">
        <button
          type="submit"
          disabled={pending || !canSubmit}
          className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-(--accent-lime) hover:bg-(--accent-lime-dark) px-4 text-sm font-bold text-(--bg-app) shadow-[0_0_24px_rgba(183,243,107,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_36px_rgba(183,243,107,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime) active:scale-[0.99] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-55 cursor-pointer"
        >
          {pending ? (
            <>
              <LoaderCircle className="relative z-10 animate-spin" size={16} />
              <span className="relative z-10">
                {mode === "login" ? "Signing in..." : "Creating account..."}
              </span>
            </>
          ) : (
            <>
              <span className="relative z-10">
                {mode === "login" ? "Sign in" : "Create account"}
              </span>
              <ArrowRight size={16} className="relative z-10 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}
