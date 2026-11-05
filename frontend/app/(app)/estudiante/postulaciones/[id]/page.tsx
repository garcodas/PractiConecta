"use client";

import { useParams } from "next/navigation";
import { Card, ErrorState, Loading, PageHeader, StatusBadge } from "@/components/ui";
import { APPLICATION_STATUSES, APPLICATION_STEPS } from "@/lib/catalogs";
import { formatDateTime } from "@/lib/format";
import type { Application, StatusChange } from "@/lib/types";
import { useResource } from "@/lib/use-resource";

interface Detail {
  application: Application;
  history: StatusChange[];
}

const CRUMB = { label: "Mis postulaciones", href: "/estudiante/postulaciones" };

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, reload } = useResource<Detail>(`/me/applications/${id}`);

  if (loading && !data) return <Loading rows={2} />;
  if (error && !data) {
    return (
      <>
        <PageHeader title="Postulación" crumbs={[CRUMB, { label: "Postulación" }]} />
        <ErrorState error={error} onRetry={reload} />
      </>
    );
  }
  if (!data) return null;

  const { application, history } = data;
  const reached = new Map(history.map((change) => [change.toStatus, change.changedAt]));
  // Mientras el proceso sigue abierto, se muestran también los pasos por venir.
  const finished = application.status === "ACEPTADA" || application.status === "RECHAZADA";
  const pending = finished ? [] : APPLICATION_STEPS.filter((step) => !reached.has(step));

  return (
    <>
      <PageHeader
        title={application.offerTitle}
        description={application.companyName}
        crumbs={[CRUMB, { label: application.offerTitle }]}
        action={<StatusBadge kind="application" status={application.status} />}
      />
      <Card>
        <h2 className="font-semibold">Seguimiento</h2>
        <ol className="mt-4">
          {history.map((change, index) => {
            const current = index === history.length - 1;
            return (
              <li key={change.toStatus} className="relative flex gap-3 pb-6 last:pb-0">
                {(index < history.length - 1 || pending.length > 0) && (
                  <span aria-hidden className="absolute top-5 bottom-0 left-[7px] w-0.5 bg-accent/40" />
                )}
                <span aria-hidden className={`mt-1 size-4 shrink-0 rounded-full ${current ? "bg-accent ring-4 ring-accent-soft" : "bg-accent/50"}`} />
                <div>
                  <p className="font-medium">
                    {APPLICATION_STATUSES[change.toStatus]}
                    {current && <span className="sr-only"> (estado actual)</span>}
                  </p>
                  <p className="text-sm text-muted">{formatDateTime(change.changedAt)}</p>
                </div>
              </li>
            );
          })}
          {pending.map((step, index) => (
            <li key={step} className="relative flex gap-3 pb-6 last:pb-0">
              {index < pending.length - 1 && <span aria-hidden className="absolute top-5 bottom-0 left-[7px] w-0.5 bg-line" />}
              <span aria-hidden className="mt-1 size-4 shrink-0 rounded-full border-2 border-line bg-surface" />
              <p className="text-muted">{APPLICATION_STATUSES[step]}</p>
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}
