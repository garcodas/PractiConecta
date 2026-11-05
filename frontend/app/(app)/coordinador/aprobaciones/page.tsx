"use client";

import { useState } from "react";
import { useToast } from "@/components/toast";
import { Button, Card, ConfirmDialog, EmptyState, ErrorState, Loading, OfferTags, PageHeader } from "@/components/ui";
import { api, asApiError } from "@/lib/api";
import { formatDay } from "@/lib/format";
import type { Company, Offer } from "@/lib/types";
import { useResource } from "@/lib/use-resource";

type Tab = "offers" | "companies";

interface Rejection {
  kind: Tab;
  id: string;
  name: string;
}

const decisionPath = (kind: Tab, id: string) => `/admin/${kind}/${id}/decision`;

export default function ApprovalsPage() {
  const [tab, setTab] = useState<Tab>("offers");
  const offers = useResource<{ items: Offer[] }>("/admin/offers/pending");
  const companies = useResource<{ items: Company[] }>("/admin/companies/pending");
  const toast = useToast();
  const [rejecting, setRejecting] = useState<Rejection | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const reloadAll = () => Promise.all([offers.reload(), companies.reload()]);

  const decide = async (kind: Tab, id: string, approve: boolean, reason = "") => {
    setBusy(`${id}:${approve}`);
    const noun = kind === "offers" ? "Oferta" : "Empresa";
    try {
      await api(decisionPath(kind, id), { method: "POST", body: { approve, reason } });
      toast(`${noun} ${approve ? "aprobada" : "rechazada"}.`);
    } catch (reason) {
      toast(asApiError(reason).message, "error");
    } finally {
      await reloadAll();
      setBusy(null);
      setRejecting(null);
    }
  };

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "offers", label: "Ofertas", count: offers.data?.items.length },
    { key: "companies", label: "Empresas", count: companies.data?.items.length },
  ];
  const current = tab === "offers" ? offers : companies;

  const actions = (kind: Tab, id: string, name: string) => (
    <div className="mt-4 flex flex-wrap gap-2">
      <Button className="grow sm:grow-0" busy={busy === `${id}:true`} disabled={busy !== null} onClick={() => decide(kind, id, true)}>
        Aprobar
      </Button>
      <Button variant="danger" className="grow sm:grow-0" disabled={busy !== null} onClick={() => setRejecting({ kind, id, name })}>
        Rechazar
      </Button>
    </div>
  );

  return (
    <>
      <PageHeader title="Aprobaciones" description="Solo lo que apruebes llegará a los estudiantes." />
      <div role="tablist" aria-label="Tipo de aprobación" className="mb-4 flex gap-1 border-b border-line">
        {tabs.map(({ key, label, count }) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`min-h-11 flex-1 border-b-2 px-4 text-sm font-semibold sm:flex-none ${
              tab === key ? "border-accent text-accent-strong" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {label}{count !== undefined ? ` (${count})` : ""}
          </button>
        ))}
      </div>

      <section role="tabpanel">
        {current.loading && !current.data && <Loading />}
        {current.error && <ErrorState error={current.error} onRetry={current.reload} />}
        {current.data?.items.length === 0 && (
          <EmptyState title="Nada pendiente" description="Cuando llegue una solicitud, la verás aquí y recibirás una notificación." />
        )}
        {tab === "offers" && offers.data && offers.data.items.length > 0 && (
          <ul className="space-y-3">
            {offers.data.items.map((offer) => (
              <li key={offer.id}>
                <Card>
                  <h2 className="font-semibold">{offer.title}</h2>
                  <p className="text-sm text-muted">{offer.companyName} · Fecha límite: {formatDay(offer.deadline)}</p>
                  <div className="mt-3"><OfferTags offer={offer} /></div>
                  <p className="mt-3 whitespace-pre-line text-sm text-muted">{offer.description}</p>
                  {actions("offers", offer.id, offer.title)}
                </Card>
              </li>
            ))}
          </ul>
        )}
        {tab === "companies" && companies.data && companies.data.items.length > 0 && (
          <ul className="space-y-3">
            {companies.data.items.map((company) => (
              <li key={company.id}>
                <Card>
                  <h2 className="font-semibold">{company.name}</h2>
                  <p className="text-sm text-muted">{company.contactEmail} · {company.contactPhone}</p>
                  {actions("companies", company.id, company.name)}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={rejecting !== null}
        title={`¿Rechazar ${rejecting?.kind === "offers" ? "la oferta" : "la empresa"}?`}
        body={`"${rejecting?.name}" recibirá una notificación con el motivo. Esta decisión no se puede deshacer.`}
        confirmLabel="Rechazar"
        reasonLabel="Motivo del rechazo"
        danger
        busy={busy !== null}
        onConfirm={(reason) => rejecting && decide(rejecting.kind, rejecting.id, false, reason)}
        onCancel={() => setRejecting(null)}
      />
    </>
  );
}
