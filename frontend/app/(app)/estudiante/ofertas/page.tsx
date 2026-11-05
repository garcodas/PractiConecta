"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Button, Card, EmptyState, ErrorState, Field, Loading, OfferTags, PageHeader } from "@/components/ui";
import { CAREERS, MODALITIES, SCHEDULES } from "@/lib/catalogs";
import { formatDay } from "@/lib/format";
import type { OfferPage } from "@/lib/types";
import { useResource } from "@/lib/use-resource";

const FILTERS = [
  { key: "career", label: "Carrera", any: "Todas", options: CAREERS },
  { key: "modality", label: "Modalidad", any: "Todas", options: MODALITIES },
  { key: "schedule", label: "Jornada", any: "Todas", options: SCHEDULES },
] as const;

function OfferSearch() {
  const params = useSearchParams();
  const pathname = usePathname();
  const query = params.toString();
  const { data, error, loading, reload } = useResource<OfferPage>(`/offers${query ? `?${query}` : ""}`);

  const replaceUrl = (search: URLSearchParams) =>
    window.history.replaceState(null, "", search.size ? `${pathname}?${search}` : pathname);

  // Los filtros viven en la URL: sobreviven al ir al detalle y volver. Se lee y
  // escribe la URL de forma síncrona para no perder cambios hechos muy seguidos.
  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(window.location.search);
    if (!("page" in changes)) next.delete("page");
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    replaceUrl(next);
  };

  const clearFilters = () => replaceUrl(new URLSearchParams());

  const active = FILTERS.filter((filter) => params.get(filter.key));
  const pages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <>
      <PageHeader title="Ofertas de práctica" description="Encuentra la práctica que se ajusta a tu carrera y horario." />

      <section aria-label="Filtros" className="mb-4 grid gap-3 sm:grid-cols-3">
        {FILTERS.map((filter) => (
          <Field key={filter.key} label={filter.label}>
            {(props) => (
              <select {...props} value={params.get(filter.key) ?? ""} onChange={(event) => update({ [filter.key]: event.target.value })}>
                <option value="">{filter.any}</option>
                {Object.entries(filter.options).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            )}
          </Field>
        ))}
      </section>

      {active.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {active.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => update({ [filter.key]: "" })}
              aria-label={`Quitar filtro ${filter.label}`}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-accent-soft px-4 text-sm font-medium text-accent-strong"
            >
              {(filter.options as Record<string, string>)[params.get(filter.key)!] ?? params.get(filter.key)}
              <span aria-hidden>×</span>
            </button>
          ))}
          <button
            type="button"
            onClick={clearFilters}
            className="min-h-11 px-2 text-sm font-medium text-muted underline underline-offset-2"
          >
            Quitar filtros
          </button>
        </div>
      )}

      {loading && !data && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && !error && (
        <>
          <p className="mb-3 text-sm text-muted" aria-live="polite">
            {data.total === 1 ? "1 oferta encontrada" : `${data.total} ofertas encontradas`}
          </p>
          {data.items.length === 0 ? (
            <EmptyState
              title="No hay ofertas con estos filtros"
              description="Prueba quitando algún filtro para ver más resultados."
              action={<Button variant="secondary" onClick={clearFilters}>Quitar filtros</Button>}
            />
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {data.items.map((offer) => (
                <li key={offer.id}>
                  <Link href={`/estudiante/ofertas/${offer.id}${query ? `?${query}` : ""}`} className="block h-full">
                    <Card className="h-full transition-colors hover:border-accent/50">
                      <h2 className="font-semibold">{offer.title}</h2>
                      <p className="mt-0.5 text-sm text-muted">{offer.companyName}</p>
                      <div className="mt-3"><OfferTags offer={offer} /></div>
                      <p className="mt-3 text-sm text-muted">Fecha límite: {formatDay(offer.deadline)}</p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <Button variant="secondary" disabled={data.page <= 1} onClick={() => update({ page: String(data.page - 1) })}>Anterior</Button>
              <span className="text-sm text-muted">Página {data.page} de {pages}</span>
              <Button variant="secondary" disabled={data.page >= pages} onClick={() => update({ page: String(data.page + 1) })}>Siguiente</Button>
            </div>
          )}
        </>
      )}
    </>
  );
}

export default function OffersPage() {
  return (
    <Suspense fallback={<Loading />}>
      <OfferSearch />
    </Suspense>
  );
}
