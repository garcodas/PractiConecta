"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { ApiError } from "@/lib/api";
import { APPLICATION_STATUSES, CAREERS, MODALITIES, OFFER_STATUSES, SCHEDULES } from "@/lib/catalogs";

type ButtonVariant = "primary" | "secondary" | "danger";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-strong",
  secondary: "border border-line bg-surface text-ink hover:bg-canvas",
  danger: "border border-danger/40 bg-surface text-danger hover:bg-danger-soft",
};

const BUTTON_BASE =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

export function Button({
  variant = "primary",
  busy = false,
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; busy?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      disabled={busy || props.disabled}
      aria-busy={busy}
      className={`${BUTTON_BASE} ${VARIANTS[variant]} ${className}`}
    >
      {busy && <span aria-hidden className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  children,
  className = "",
}: {
  href: string;
  variant?: ButtonVariant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${BUTTON_BASE} ${VARIANTS[variant]} ${className}`}>
      {children}
    </Link>
  );
}

const STATUS_STYLES: Record<string, string> = {
  ENVIADA: "bg-sky-100 text-sky-900",
  EN_REVISION: "bg-amber-100 text-amber-900",
  ENTREVISTA: "bg-violet-100 text-violet-900",
  ACEPTADA: "bg-emerald-100 text-emerald-900",
  RECHAZADA: "bg-red-100 text-red-900",
  PENDIENTE: "bg-amber-100 text-amber-900",
  APROBADA: "bg-emerald-100 text-emerald-900",
  CERRADA: "bg-slate-200 text-slate-800",
};

/** Única representación de un estado: siempre texto y color, igual en todas las vistas. */
export function StatusBadge({ kind, status }: { kind: "application" | "offer"; status: string }) {
  const label = (kind === "application" ? APPLICATION_STATUSES : OFFER_STATUSES)[status] ?? status;
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${STATUS_STYLES[status] ?? ""}`}>
      {label}
    </span>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex rounded-md bg-canvas px-2 py-1 text-xs font-medium text-muted">{children}</span>;
}

export function OfferTags({ offer }: { offer: { careerCode: string; modality: string; schedule: string } }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Tag>{CAREERS[offer.careerCode]}</Tag>
      <Tag>{MODALITIES[offer.modality]}</Tag>
      <Tag>{SCHEDULES[offer.schedule]}</Tag>
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl border border-line bg-surface p-4 sm:p-5 ${className}`}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  action,
  crumbs,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  crumbs?: { label: string; href?: string }[];
}) {
  return (
    <header className="mb-6">
      {crumbs && (
        <nav aria-label="Migas de pan" className="mb-2 text-sm text-muted">
          <ol className="flex flex-wrap items-center gap-1.5">
            {crumbs.map((crumb, index) => (
              <li key={crumb.label} className="flex items-center gap-1.5">
                {index > 0 && <span aria-hidden>/</span>}
                {crumb.href ? (
                  <Link href={crumb.href} className="underline-offset-2 hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page" className="text-ink">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-balance sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-muted">{description}</p>}
        </div>
        {action}
      </div>
    </header>
  );
}

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Cargando" className="space-y-3">
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="h-28 animate-pulse rounded-xl bg-line/60" />
      ))}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line px-6 py-12 text-center">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="mx-auto mt-1 max-w-md text-muted">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: ApiError; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-danger/30 bg-danger-soft p-5">
      <p className="font-medium text-danger">{error.message}</p>
      {onRetry && error.retryable && (
        <Button variant="secondary" className="mt-3" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "danger"; children: React.ReactNode }) {
  const styles = {
    info: "border-accent/30 bg-accent-soft text-accent-strong",
    warning: "border-amber-300 bg-amber-50 text-amber-900",
    danger: "border-danger/30 bg-danger-soft text-danger",
  };
  return <div className={`rounded-lg border px-4 py-3 text-sm ${styles[tone]}`}>{children}</div>;
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: (props: { id: string; "aria-invalid": boolean; "aria-describedby"?: string; className: string }) => React.ReactNode;
}) {
  const id = useId();
  const messageId = `${id}-message`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {children({
        id,
        "aria-invalid": Boolean(error),
        "aria-describedby": error || hint ? messageId : undefined,
        className: `min-h-11 w-full rounded-lg border bg-surface px-3 py-2 text-base ${error ? "border-danger" : "border-line"}`,
      })}
      {(error || hint) && (
        <p id={messageId} className={`mt-1 text-sm ${error ? "text-danger" : "text-muted"}`}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

/**
 * Confirmación de acciones irreversibles: explica la consecuencia y permite
 * cancelar sin efecto. Con `reasonLabel` exige un motivo.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger = false,
  busy = false,
  reasonLabel,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  reasonLabel?: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState("");
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setReason("");
      setMissing(false);
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const submit = () => {
    if (reasonLabel && !reason.trim()) {
      setMissing(true);
      return;
    }
    onConfirm(reason.trim());
  };

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-md rounded-xl bg-surface p-5 text-ink shadow-xl"
    >
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-2 text-muted">{body}</p>
      {reasonLabel && (
        <div className="mt-4">
          <Field label={reasonLabel} error={missing ? "Este dato es obligatorio." : undefined}>
            {(props) => <textarea {...props} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} />}
          </Field>
        </div>
      )}
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>
          Cancelar
        </Button>
        <Button variant={danger ? "danger" : "primary"} busy={busy} onClick={submit}>
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  );
}
