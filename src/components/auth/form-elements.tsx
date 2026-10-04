"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Eye, EyeOff, LoaderCircle } from "lucide-react";

export function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[11px] font-bold uppercase tracking-wider text-(--text-secondary)">
        {label}
      </span>
      {children}
      {error && (
        <span role="alert" className="mt-1.5 block text-xs font-medium text-rose-400">
          {error}
        </span>
      )}
    </label>
  );
}

export function fieldClass(error?: string) {
  return [
    "h-12 w-full rounded-xl border bg-(--bg-surface-raised) px-4 text-sm text-(--text-primary) outline-none transition-all duration-200",
    "placeholder:text-(--text-muted) disabled:cursor-not-allowed disabled:opacity-60",
    "hover:border-(--border-strong) hover:bg-(--bg-surface)",
    "focus:border-(--accent-lime) focus:ring-1 focus:ring-(--accent-lime)/30",
    error
      ? "border-rose-500/80 focus:border-rose-400 focus:ring-rose-500/20"
      : "border-(--border-subtle)",
  ].join(" ");
}

export function PasswordField(
  props: React.InputHTMLAttributes<HTMLInputElement> & { error?: string }
) {
  const [visible, setVisible] = useState(false);
  const { error, ...rest } = props;

  return (
    <div className="relative">
      <input
        {...rest}
        type={visible ? "text" : "password"}
        className={`${fieldClass(error)} pr-11`}
      />
      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        onClick={() => setVisible(!visible)}
        className="absolute right-0 top-0 grid size-12 place-items-center text-(--text-muted) transition hover:text-(--text-primary) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime) cursor-pointer"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

export function SubmitButton({
  children,
  pendingText = "Please wait...",
}: {
  children: React.ReactNode;
  pendingText?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="relative flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-(--accent-lime) hover:bg-(--accent-lime-dark) px-4 text-sm font-bold text-(--bg-app) shadow-[0_0_24px_rgba(183,243,107,0.22)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_36px_rgba(183,243,107,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--accent-lime) active:scale-[0.99] disabled:cursor-not-allowed disabled:translate-y-0 disabled:opacity-55 cursor-pointer"
    >
      {pending && <LoaderCircle className="relative z-10 animate-spin" size={16} />}
      <span className="relative z-10">{pending ? pendingText : children}</span>
    </button>
  );
}
