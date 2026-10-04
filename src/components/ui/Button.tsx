"use client";

import React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: "button" | "submit" | "reset";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      children,
      onClick,
      className,
      type = "button",
      icon,
      iconPosition = "left",
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    const variantStyles: Record<ButtonVariant, string> = {
      primary:
        "bg-(--accent-lime) text-(--bg-app) font-semibold hover:bg-(--accent-lime-dark) shadow-xs active:opacity-90",
      secondary:
        "border border-(--border-subtle) text-(--text-primary) bg-(--bg-surface-raised) hover:bg-(--bg-surface-hover) hover:border-(--border-strong)",
      ghost:
        "text-(--text-secondary) bg-transparent hover:text-(--text-primary) hover:bg-(--bg-surface-hover)",
      danger: "bg-(--accent-red) text-(--bg-app) font-semibold hover:opacity-90 shadow-xs",
    };

    const sizeStyles: Record<ButtonSize, string> = {
      sm: "px-3 py-1.5 text-xs rounded-(--radius-btn)",
      md: "px-4 py-2 text-sm rounded-(--radius-btn)",
      lg: "px-6 py-3 text-base rounded-(--radius-btn)",
    };

    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        disabled={isDisabled}
        className={cn(
          "inline-flex items-center justify-center gap-2 font-medium transition-[transform,background-color,border-color,color,box-shadow,opacity] duration-[150ms] ease-out",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--focus-ring) focus-visible:ring-offset-2 focus-visible:ring-offset-(--bg-app)",
          "hover:-translate-y-px active:translate-y-0 active:scale-[0.99]",
          variantStyles[variant],
          sizeStyles[size],
          loading && "pointer-events-none opacity-70 cursor-not-allowed",
          disabled && !loading && "opacity-50 cursor-not-allowed active:scale-100 pointer-events-none",
          className
        )}
        {...props}
        aria-busy={loading || undefined}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin shrink-0" />
        ) : (
          icon && iconPosition === "left" && <span className="shrink-0">{icon}</span>
        )}
        <span>{children}</span>
        {!loading && icon && iconPosition === "right" && (
          <span className="shrink-0">{icon}</span>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export const ButtonPrimary = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, "variant">>(
  (props, ref) => <Button ref={ref} variant="primary" {...props} />
);
ButtonPrimary.displayName = "ButtonPrimary";

export const ButtonSecondary = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, "variant">>(
  (props, ref) => <Button ref={ref} variant="secondary" {...props} />
);
ButtonSecondary.displayName = "ButtonSecondary";

export const ButtonGhost = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, "variant">>(
  (props, ref) => <Button ref={ref} variant="ghost" {...props} />
);
ButtonGhost.displayName = "ButtonGhost";

export const ButtonDanger = React.forwardRef<HTMLButtonElement, Omit<ButtonProps, "variant">>(
  (props, ref) => <Button ref={ref} variant="danger" {...props} />
);
ButtonDanger.displayName = "ButtonDanger";
