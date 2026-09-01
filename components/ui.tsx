import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
} from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "accent";
type Size = "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-ink text-inverse-text hover:bg-ink-soft active:bg-ink-soft dark:bg-white dark:text-inverse-text dark:hover:opacity-80 dark:active:opacity-70",
  accent: "bg-primary-soft text-primary-ink hover:bg-primary/15 active:bg-primary/25",
  secondary:
    "bg-surface text-ink border border-border hover:bg-zinc-50 active:bg-zinc-100 dark:hover:bg-zinc-900 dark:active:bg-zinc-800",
  ghost:
    "bg-transparent text-ink hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-800/70 dark:active:bg-zinc-700/70",
  danger: "bg-absent text-white hover:opacity-90 active:opacity-80",
};

const sizeClasses: Record<Size, string> = {
  md: "h-11 px-4 text-sm rounded-full",
  lg: "h-13 px-5 text-base rounded-full",
};

export function Btn({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 font-semibold transition-colors select-none
        disabled:opacity-50 disabled:pointer-events-none active:translate-y-px
        ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconBtn({
  label,
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={`inline-flex size-11 items-center justify-center rounded-full text-ink transition-colors
        hover:bg-zinc-100 active:bg-zinc-200 dark:hover:bg-zinc-800/70 dark:active:bg-zinc-700/70 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Card({
  className = "",
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-xl border border-border bg-surface ${className}`}>{children}</div>
  );
}

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <label className="text-sm font-medium text-ink">{label}</label>
      {children}
      {hint && !error ? <p className="text-xs text-muted">{hint}</p> : null}
      {error ? <p className="text-xs font-medium text-absent-ink">{error}</p> : null}
    </div>
  );
}

const inputBase =
  "w-full h-12 rounded-lg border border-border bg-surface-soft px-3.5 text-base text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/60 focus:border-primary dark:bg-surface-soft";

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputBase} ${className}`} {...props} />;
}

export function Select({
  className = "",
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${inputBase} appearance-none pr-9 ${className}`} {...props}>
      {children}
    </select>
  );
}

export function Chip({
  tone = "neutral",
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement> & {
  tone?: "neutral" | "positive" | "negative" | "warning";
}) {
  const tones = {
    neutral: "bg-zinc-100 text-ink dark:bg-zinc-800 dark:text-zinc-100",
    positive: "bg-present-soft text-present-ink",
    negative: "bg-absent-soft text-absent-ink",
    warning: "bg-warning-soft text-warning-ink",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone]} ${className}`} {...props}>
      {children}
    </span>
  );
}

export function Spinner({ className = "size-4" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
    />
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="grid gap-0.5">
        <h1 className="text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
        {description ? <p className="text-sm text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-[15px] font-semibold tracking-tight text-ink">{children}</h2>;
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="grid place-items-center gap-2 px-6 py-12 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      {body ? <p className="max-w-[40ch] text-sm text-muted">{body}</p> : null}
      {action}
    </Card>
  );
}

export function InlineError({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <Card className="flex items-start gap-2.5 border-absent-border bg-absent-soft px-4 py-3">
      <span className="mt-0.5 text-absent-ink">
        <AlertGlyph />
      </span>
      <p className="text-sm font-medium text-absent-ink">{children}</p>
    </Card>
  );
}

function AlertGlyph() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 3.5 21 20H3z" />
      <path d="M12 10v4.5" />
      <circle cx="12" cy="17.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  );
}