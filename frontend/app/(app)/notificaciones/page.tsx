"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "@/components/app-shell";
import { useToast } from "@/components/toast";
import { Button, EmptyState, ErrorState, Loading, PageHeader } from "@/components/ui";
import { api, asApiError } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import type { Notification } from "@/lib/types";
import { useResource } from "@/lib/use-resource";

interface Page {
  items: Notification[];
  total: number;
  page: number;
  pageSize: number;
}

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useResource<Page>(`/notifications?page=${page}`);
  const { refreshUnread } = useSession();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const markAll = async () => {
    setBusy(true);
    try {
      await api("/notifications/read-all", { method: "POST" });
      await reload();
      refreshUnread();
      toast("Todas las notificaciones quedaron leídas.");
    } catch (reason) {
      toast(asApiError(reason).message, "error");
    } finally {
      setBusy(false);
    }
  };

  const markRead = (notification: Notification) => {
    if (notification.readAt) return;
    void api(`/notifications/${notification.id}/read`, { method: "POST" }).then(refreshUnread).catch(() => undefined);
  };

  const hasUnread = data?.items.some((item) => !item.readAt);
  const pages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <>
      <PageHeader
        title="Notificaciones"
        action={hasUnread ? <Button variant="secondary" busy={busy} onClick={markAll}>Marcar todas como leídas</Button> : undefined}
      />
      {loading && !data && <Loading />}
      {error && <ErrorState error={error} onRetry={reload} />}
      {data?.items.length === 0 && (
        <EmptyState title="Sin notificaciones" description="Aquí verás los avisos sobre tus ofertas y postulaciones." />
      )}
      {data && data.items.length > 0 && (
        <ul className="space-y-2">
          {data.items.map((notification) => (
            <li key={notification.id}>
              <Link
                href={notification.link}
                onClick={() => markRead(notification)}
                className={`block rounded-xl border p-4 hover:border-accent/50 ${
                  notification.readAt ? "border-line bg-surface" : "border-accent/30 bg-accent-soft"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">
                    {!notification.readAt && <span className="sr-only">Sin leer: </span>}
                    {notification.title}
                  </p>
                  <time className="shrink-0 text-xs text-muted">{formatDateTime(notification.createdAt)}</time>
                </div>
                <p className="mt-1 text-sm text-muted">{notification.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
          <span className="text-sm text-muted">Página {page} de {pages}</span>
          <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Siguiente</Button>
        </div>
      )}
    </>
  );
}
