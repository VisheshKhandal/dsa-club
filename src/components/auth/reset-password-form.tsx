"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordAction, type AuthActionState } from "@/features/auth/actions/auth.actions";
import { resetPasswordFormSchema } from "@/features/auth/validators/auth.validators";
import { FormField, PasswordField } from "@/components/auth/form-elements";

const initialAuthState: AuthActionState = { status: "idle" };

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, setState] = useState<AuthActionState>(initialAuthState);
  const [pending, startTransition] = useTransition();
  const form = useForm<{ password: string; confirmPassword: string }>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const error = (name: "password" | "confirmPassword") =>
    form.formState.errors[name]?.message ?? state.fieldErrors?.[name]?.[0];

  return (
    <form
      onSubmit={form.handleSubmit((values) =>
        startTransition(async () => {
          const data = new FormData();
          data.set("token", token);
          data.set("password", values.password);
          data.set("confirmPassword", values.confirmPassword);
          setState(await resetPasswordAction(state, data));
        })
      )}
      className="space-y-4"
      noValidate
    >
      <FormField label="New password" error={error("password")}>
        <PasswordField
          {...form.register("password")}
          autoComplete="new-password"
          placeholder="Create a new password"
          error={error("password")}
        />
      </FormField>

      <FormField label="Confirm new password" error={error("confirmPassword")}>
        <PasswordField
          {...form.register("confirmPassword")}
          autoComplete="new-password"
          placeholder="Repeat your new password"
          error={error("confirmPassword")}
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
        {pending ? "Updating password..." : "Update password"}
      </button>
    </form>
  );
}
