"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { forgotPasswordAction, type AuthActionState } from "@/features/auth/actions/auth.actions";
import { forgotPasswordSchema } from "@/features/auth/validators/auth.validators";
import { FormField, fieldClass } from "@/components/auth/form-elements";

const initialAuthState: AuthActionState = { status: "idle" };

export function ForgotPasswordForm() {
  const [state, setState] = useState<AuthActionState>(initialAuthState);
  const [pending, startTransition] = useTransition();
  const form = useForm<{ email: string }>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  return (
    <form
      onSubmit={form.handleSubmit(({ email }) =>
        startTransition(async () => {
          const data = new FormData();
          data.set("email", email);
          setState(await forgotPasswordAction(state, data));
        })
      )}
      className="space-y-4"
      noValidate
    >
      <FormField
        label="Email address"
        error={form.formState.errors.email?.message ?? state.fieldErrors?.email?.[0]}
      >
        <input
          {...form.register("email")}
          type="email"
          autoComplete="email"
          disabled={pending}
          placeholder="you@example.com"
          className={fieldClass(form.formState.errors.email?.message)}
        />
      </FormField>

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

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-xl bg-(--accent-lime) text-sm font-bold text-(--bg-app) hover:bg-(--accent-lime-dark) shadow-[0_0_24px_rgba(183,243,107,0.2)] transition-all hover:-translate-y-0.5 active:scale-[0.99] disabled:opacity-60 cursor-pointer"
      >
        {pending ? "Sending reset link..." : "Send reset link"}
      </button>
    </form>
  );
}
