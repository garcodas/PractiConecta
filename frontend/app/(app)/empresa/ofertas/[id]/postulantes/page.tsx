"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/toast";
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, Loading, PageHeader, StatusBadge, Tag } from "@/components/ui";
import { api, asApiError } from "@/lib/api";
import { APPLICATION_STATUSES, CAREERS, TRANSITION_LABELS } from "@/lib/catalogs";
import { formatDate } from "@/lib/format";
import type { Applicant, Offer } from "@/lib/types";
import { useResource } from "@/lib/use-resource";

interface Data {
  offer: Offer;
  items: Applicant[];
}

interface Pending {
  applicant: Applicant;
  status: string;
}

const NEEDS_CONFIRMATION = new Set(["ACEPTADA", "RECHAZADA"]);
const CRUMB = { label: "Mis ofertas", href: "/empresa/ofertas" };

export default function ApplicantsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, reload } = useResource<Data>(`/company/offers/${id}/applications`);
  const toast = useToast();
  const [pending, setPending] = useState<Pending | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const change = async ({ applicant, status }: Pending) => {
    setBusyId(`${applicant.id}:${status}`);
    try {
      await api(`/company/applications/${applicant.id}/status`, { method: "PATCH", body: { status } });
      toast(`Postulación actualizada a ${APPLICATION_STATUSES[status]}.`);
    } catch (reason) {
      toast(asApiError(reason).message, "error");
    } finally {
      await reload();
      setBusyId(null);
      setPending(null);
    }
  };

  const request = (applicant: Applicant, status: string) => {
    if (NEEDS_CONFIRMATION.has(status)) setPending({ applicant, status });
    else void change({ applicant, status });
  };

  if (loading && !data) return <Loading />;
  if (error && !data) {
    return (
      <>
        <PageHeader title="Postulantes" crumbs={[CRUMB, { label: "Postulantes" }]} />
        <ErrorState error={error} onRetry={reload} />
      </>
    );
  }
  if (!data) return null;

  const { offer, items } = data;
  const name = pending?.applicant.student?.fullName ?? "esta persona";
  const accepting = pending?.status === "ACEPTADA";

  return (
    <>
      <PageHeader
        title={offer.title}
        description={items.length === 1 ? "1 postulante" : `${items.length} postulantes`}
        crumbs={[CRUMB, { label: "Postulantes" }]}
        action={<StatusBadge kind="offer" status={offer.status} />}
      />
      {items.length === 0 ? (
        <EmptyState title="Aún no hay postulantes" description="Cuando alguien se postule, recibirás una notificación y aparecerá aquí." />
      ) : (
        <ul className="space-y-3">
          {items.map((applicant) => (
            <li key={applicant.id}>
              <Card className="grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold">{applicant.student?.fullName ?? "Estudiante"}</h2>
                    <StatusBadge kind="application" status={applicant.status} />
                  </div>
                  {applicant.student && (
                    <p className="mt-0.5 text-sm text-muted">
                      {CAREERS[applicant.student.careerCode]} · Semestre {applicant.student.semester} ·{" "}
                      {applicant.student.hasCv ? "CV registrado" : "Sin CV registrado"}
                    </p>
                  )}
                  <p className="text-sm text-muted">Se postuló el {formatDate(applicant.createdAt)}</p>
                  {applicant.student && applicant.student.skills.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {applicant.student.skills.map((skill) => <Tag key={skill}>{skill}</Tag>)}
                    </div>
                  )}
                </div>
                {applicant.allowedTransitions.length > 0 && (
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    {applicant.allowedTransitions.map((status) => (
                      <Button
                        key={status}
                        variant={status === "RECHAZADA" ? "danger" : "primary"}
                        className="grow md:grow-0"
                        busy={busyId === `${applicant.id}:${status}`}
                        disabled={busyId !== null}
                        onClick={() => request(applicant, status)}
                      >
                        {TRANSITION_LABELS[status]}
                      </Button>
                    ))}
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={pending !== null}
        title={accepting ? `¿Aceptar a ${name}?` : `¿Rechazar a ${name}?`}
        body={`Esta decisión es definitiva: el proceso termina y el estudiante recibirá una notificación.`}
        confirmLabel={accepting ? "Aceptar" : "Rechazar"}
        danger={!accepting}
        busy={busyId !== null}
        onConfirm={() => pending && change(pending)}
        onCancel={() => setPending(null)}
      />
    </>
  );
}
