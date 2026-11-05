"use client";

import Link from "next/link";
import { Card, EmptyState, ErrorState, LinkButton, Loading, PageHeader, StatusBadge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import type { Application } from "@/lib/types";
import { useResource } from "@/lib/use-resource";

export default function ApplicationsPage() {
  const { data, error, loading, reload } = useResource<{ items: Application[] }>("/me/applications");

  return (
    <>
      <PageHeader title="Mis postulaciones" description="Revisa en qué estado va cada proceso." />
      {loading && !data && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data?.items.length === 0 && (
        <EmptyState
          title="Aún no te has postulado"
          description="Cuando te postules a una oferta, aquí verás su avance."
          action={<LinkButton href="/estudiante/ofertas">Buscar ofertas</LinkButton>}
        />
      )}
      {data && data.items.length > 0 && (
        <ul className="space-y-3">
          {data.items.map((application) => (
            <li key={application.id}>
              <Link href={`/estudiante/postulaciones/${application.id}`} className="block">
                <Card className="flex flex-wrap items-center justify-between gap-3 transition-colors hover:border-accent/50">
                  <div className="min-w-0">
                    <h2 className="font-semibold">{application.offerTitle}</h2>
                    <p className="text-sm text-muted">{application.companyName}</p>
                    <p className="mt-1 text-sm text-muted">Último cambio: {formatDate(application.updatedAt)}</p>
                  </div>
                  <StatusBadge kind="application" status={application.status} />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
