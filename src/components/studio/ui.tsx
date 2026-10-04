import { cn } from "@/lib/utils";

// ── Stat Card ────────────────────────────────────────────────────
type StatCardProps = {
  label: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  trend?: { value: string; positive?: boolean };
  className?: string;
};

export function StatCard({ label, value, description, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("studio-card p-5 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium studio-text-muted uppercase tracking-wider">{label}</p>
        {icon && <span className="studio-text-accent transition-colors opacity-70 group-hover:opacity-100">{icon}</span>}
      </div>
      <div className="flex items-end justify-between gap-2">
        <p className="text-3xl font-bold tracking-tight studio-text tabular-nums">{value}</p>
        {trend && (
          <span
            className={cn(
              "studio-badge",
              trend.positive
                ? "studio-badge-emerald"
                : "studio-badge-rose"
            )}
          >
            {trend.value}
          </span>
        )}
      </div>
      {description && (
        <p className="text-sm studio-text-subtle">{description}</p>
      )}
    </div>
  );
}

// ── Page Header ──────────────────────────────────────────────────
type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  badge?: string;
};

export function PageHeader({ title, description, actions, badge }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <h1 className="text-3xl font-bold tracking-tight studio-text sm:text-4xl">{title}</h1>
          {badge && (
            <span className="studio-badge studio-badge-muted">
              {badge}
            </span>
          )}
        </div>
        {description && (
          <p className="max-w-3xl text-base leading-7 studio-text-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

// ── Section ──────────────────────────────────────────────────────
type SectionProps = {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
};

export function Section({ title, description, children, className }: SectionProps) {
  return (
    <section className={cn("space-y-4", className)}>
      {(title || description) && (
        <div>
          {title && <h2 className="text-lg font-semibold tracking-tight studio-text">{title}</h2>}
          {description && <p className="mt-1 text-sm leading-6 studio-text-muted">{description}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

// ── Empty State ──────────────────────────────────────────────────
type EmptyStateProps = {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="grid min-h-44 place-items-center rounded-[14px] border border-dashed border-purple-500/20 bg-purple-500/[0.02] p-8 text-center transition-colors hover:border-purple-500/30 hover:bg-purple-500/[0.04]">
      <div className="mb-4 studio-text-accent opacity-70">{icon}</div>
      <h3 className="mb-1 text-base font-semibold studio-text">{title}</h3>
      {description && (
        <p className="max-w-[320px] text-sm leading-6 studio-text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────────────
type StatusBadgeProps = {
  status: "published" | "draft" | "archived" | "active" | "suspended";
};

const statusConfig: Record<StatusBadgeProps["status"], { label: string; className: string }> = {
  published: { label: "Published", className: "studio-badge-emerald" },
  draft: { label: "Draft", className: "studio-badge-amber" },
  archived: { label: "Archived", className: "studio-badge-muted" },
  active: { label: "Active", className: "studio-badge-cyan" },
  suspended: { label: "Suspended", className: "studio-badge-rose" },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "studio-badge",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

// ── Difficulty Badge ─────────────────────────────────────────────
type DifficultyBadgeProps = {
  difficulty: "beginner" | "easy" | "medium" | "hard" | "advanced";
};

const diffConfig: Record<DifficultyBadgeProps["difficulty"], { label: string; className: string }> = {
  beginner: { label: "Beginner", className: "studio-badge-emerald" },
  easy: { label: "Easy", className: "studio-badge-emerald" },
  medium: { label: "Medium", className: "studio-badge-amber" },
  hard: { label: "Hard", className: "studio-badge-rose" },
  advanced: { label: "Advanced", className: "studio-badge-rose" },
};

export function DifficultyBadge({ difficulty }: DifficultyBadgeProps) {
  const config = diffConfig[difficulty];
  return (
    <span className={cn("studio-badge", config.className)}>
      {config.label}
    </span>
  );
}

// ── Table ────────────────────────────────────────────────────────
export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("w-full overflow-auto studio-card", className)}>
      <table className="w-full text-[15px]">{children}</table>
    </div>
  );
}

export function TableHead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="studio-table-header">{children}</tr>
    </thead>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("px-4 py-3 text-left text-xs font-medium uppercase tracking-wider studio-text-muted", className)}>
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="border-t-0">{children}</tbody>;
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={cn("px-4 py-3.5 text-[15px] studio-text studio-table-row", className)}>{children}</td>
  );
}

// ── Action Button ────────────────────────────────────────────────
type ActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "ghost" | "destructive";
  size?: "sm" | "md";
};

export function ActionButton({
  children,
  variant = "default",
  size = "md",
  className,
  ...props
}: ActionButtonProps) {
  return (
    <button
      className={cn(
        "pressable inline-flex items-center justify-center gap-1.5 focus-ring disabled:pointer-events-none disabled:opacity-50",
        size === "sm" ? "h-8 px-3 text-sm" : "h-10 px-4 text-[15px]",
        variant === "default" && "studio-btn-primary",
        variant === "outline" && "studio-btn-outline",
        variant === "ghost" && "studio-btn-ghost",
        variant === "destructive" && "studio-btn-danger",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

// ── Input ────────────────────────────────────────────────────────
export function StudioInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "flex h-10 w-full studio-input px-3 py-2 text-[15px] focus-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
}

export function StudioTextarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "flex min-h-[96px] w-full studio-input px-3 py-2 text-[15px] focus-ring disabled:cursor-not-allowed disabled:opacity-50 resize-y",
        className
      )}
      {...props}
    />
  );
}

export function StudioLabel({
  children,
  required,
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label className={cn("mb-1.5 block text-[14px] font-medium studio-text", className)} {...props}>
      {children}
      {required && <span className="ml-1 text-destructive">*</span>}
    </label>
  );
}

export function StudioSelect({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "flex h-10 w-full studio-input px-3 py-2 text-[15px] focus-ring disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}

// ── Field group ──────────────────────────────────────────────────
export function FieldGroup({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-1.5", className)}>{children}</div>;
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

// ── Card ─────────────────────────────────────────────────────────
export function StudioCard({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("studio-card", className)} {...props}>
      {children}
    </div>
  );
}

export function StudioCardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("border-b border-purple-500/10 px-6 py-4", className)}>{children}</div>;
}

export function StudioCardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("p-6", className)}>{children}</div>;
}
