"use client";

import { useState } from "react";
import { useSession } from "@/components/app-shell";
import { useToast } from "@/components/toast";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  LinkButton,
  Loading,
  Notice,
  OfferTags,
  PageHeader,
  StatusBadge,
} from "@/components/ui";
import { api, asApiError } from "@/lib/api";
import { formatDay } from "@/lib/format";
import type { Offer } from "@/lib/types";
import { useResource } from "@/lib/use-resource";

const COMPANY_NOTICE: Record<string, { tone: "warning" | "danger"; text: string }> = {
  PENDIENTE: { tone: "warning", text: "Tu empresa está pendiente de aprobación. Podrás publicar ofertas cuando la coordinación la apruebe." },
  RECHAZADA: { tone: "danger", text: "Tu empresa fue rechazada por la coordinación y no puede publicar ofertas." },
};

export default function CompanyOffersPage() {
  const { data, error, loading, reload } = useResource<{ items: Offer[] }>("/company/offers");
  const { user } = useSession();
  const toast = useToast();
  const [closing, setClosing] = useState<Offer | null>(null);
  const [busy, setBusy] = useState(false);

  const close = async () => {
    if (!closing) return;
    setBusy(true);
    try {
      await api(`/company/offers/${closing.id}/close`, { method: "POST" });
      toast("La oferta quedó cerrada.");
      await reload();
    } catch (reason) {
      toast(asApiError(reason).message, "error");
    } finally {
      setBusy(false);
      setClosing(null);
    }
  };

  const notice = user ? COMPANY_NOTICE[user.companyStatus] : undefined;

  return (
    <>
      <PageHeader
        title="Mis ofertas"
        description="Publica prácticas y revisa a quienes se postulan."
        action={user?.companyStatus === "APROBADA" ? <LinkButton href="/empresa/ofertas/nueva">Nueva oferta</LinkButton> : undefined}
      />
      {notice && <div className="mb-4"><Notice tone={notice.tone}>{notice.text}</Notice></div>}
      {loading && !data && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data?.items.length === 0 && (
        <EmptyState
          title="Todavía no tienes ofertas"
          description="Crea tu primera oferta; la coordinación la revisará antes de publicarla."
          action={user?.companyStatus === "APROBADA" ? <LinkButton href="/empresa/ofertas/nueva">Nueva oferta</LinkButton> : undefined}
        />
      )}
      {data && data.items.length > 0 && (
        <ul className="space-y-3">
          {data.items.map((offer) => (
            <li key={offer.id}>
              <Card>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="font-semibold">{offer.title}</h2>
                    <p className="text-sm text-muted">Fecha límite: {formatDay(offer.deadline)}</p>
                  </div>
                  <StatusBadge kind="offer" status={offer.status} />
                </div>
                <div className="mt-3"><OfferTags offer={offer} /></div>
                {offer.rejectionReason && (
                  <div className="mt-3"><Notice tone="danger">Motivo del rechazo: {offer.rejectionReason}</Notice></div>
                )}
                {(offer.status === "APROBADA" || offer.status === "CERRADA") && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <LinkButton href={`/empresa/ofertas/${offer.id}/postulantes`} variant="secondary" className="grow sm:grow-0">
                      Ver postulantes ({offer.applicationCount ?? 0})
                    </LinkButton>
                    {offer.status === "APROBADA" && (
                      <Button variant="danger" className="grow sm:grow-0" onClick={() => setClosing(offer)}>
                        Cerrar oferta
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            </li>
          ))}
        </ul>
      )}
      <ConfirmDialog
        open={closing !== null}
        title="¿Cerrar esta oferta?"
        body={`"${closing?.title}" dejará de recibir postulaciones y no se podrá reabrir. Podrás seguir gestionando las postulaciones recibidas.`}
        confirmLabel="Cerrar oferta"
        danger
        busy={busy}
        onConfirm={close}
        onCancel={() => setClosing(null)}
      />
    </>
  );
}
