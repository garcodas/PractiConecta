"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useToast } from "@/components/toast";
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorState,
  LinkButton,
  Loading,
  Notice,
  OfferTags,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { api, type ApiError, asApiError } from "@/lib/api";
import { formatDate, formatDay } from "@/lib/format";
import type { Application, Offer } from "@/lib/types";
import { useResource } from "@/lib/use-resource";

interface Detail {
  offer: Offer;
  application: Application | null;
}

function OfferDetail() {
  const { id } = useParams<{ id: string }>();
  const query = useSearchParams().toString();
  const listHref = `/estudiante/ofertas${query ? `?${query}` : ""}`;
  const { data, error, loading, reload } = useResource<Detail>(`/offers/${id}`);
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ApiError | null>(null);

  const apply = async () => {
    setBusy(true);
    setFailure(null);
    try {
      await api(`/offers/${id}/applications`, { method: "POST" });
      toast("Tu postulación quedó registrada.");
      await reload();
    } catch (reason) {
      const apiError = asApiError(reason);
      setFailure(apiError);
      if (apiError.code === "ALREADY_APPLIED") await reload();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (loading && !data) return <Loading rows={2} />;

  if (error && !data) {
    return (
      <>
        <PageHeader title="Oferta no disponible" crumbs={[{ label: "Ofertas", href: listHref }, { label: "Oferta" }]} />
        {error.status === 404 ? (
          <Notice tone="warning">
            Esta oferta ya no está disponible. <Link href={listHref} className="font-semibold underline">Buscar otras ofertas</Link>
          </Notice>
        ) : (
          <ErrorState error={error} onRetry={reload} />
        )}
      </>
    );
  }
  if (!data) return null;

  const { offer, application } = data;
  const closedOut = failure?.code === "OFFER_EXPIRED" || failure?.code === "OFFER_CLOSED";

  return (
    <>
      <PageHeader
        title={offer.title}
        description={offer.companyName}
        crumbs={[{ label: "Ofertas", href: listHref }, { label: offer.title }]}
      />
      <div className="grid gap-4 md:grid-cols-[1fr_18rem]">
        <Card>
          <OfferTags offer={offer} />
          <h2 className="mt-5 font-semibold">Sobre la práctica</h2>
          <p className="mt-1 whitespace-pre-line text-muted">{offer.description}</p>
        </Card>
        <Card className="h-fit space-y-3 md:sticky md:top-4">
          <div>
            <p className="text-sm text-muted">Fecha límite</p>
            <p className="font-semibold">{formatDay(offer.deadline)}</p>
          </div>
          {failure && (
            <div className="space-y-2">
              <Notice tone="danger">{failure.message}</Notice>
              {closedOut && <LinkButton href={listHref} variant="secondary" className="w-full">Buscar otras ofertas</LinkButton>}
            </div>
          )}
          {application ? (
            <div className="space-y-3 border-t border-line pt-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted">Te postulaste el {formatDate(application.createdAt)}</p>
                <StatusBadge kind="application" status={application.status} />
              </div>
              <LinkButton href={`/estudiante/postulaciones/${application.id}`} variant="secondary" className="w-full">
                Ver seguimiento
              </LinkButton>
            </div>
          ) : (
            !closedOut && (
              <Button className="w-full" busy={busy} onClick={() => setConfirming(true)}>
                {failure?.retryable ? "Reintentar postulación" : "Postularme"}
              </Button>
            )
          )}
        </Card>
      </div>
      <ConfirmDialog
        open={confirming}
        title="¿Confirmas tu postulación?"
        body={`${offer.companyName} podrá ver tu perfil, tus habilidades y tu CV. Solo puedes postularte una vez a esta oferta.`}
        confirmLabel="Postularme"
        busy={busy}
        onConfirm={apply}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

export default function OfferDetailPage() {
  return (
    <Suspense fallback={<Loading rows={2} />}>
      <OfferDetail />
    </Suspense>
  );
}
