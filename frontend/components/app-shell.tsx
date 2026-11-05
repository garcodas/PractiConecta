"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { Role, User } from "@/lib/types";

const NAV: Record<Role, { label: string; href: string }[]> = {
  STUDENT: [
    { label: "Ofertas", href: "/estudiante/ofertas" },
    { label: "Mis postulaciones", href: "/estudiante/postulaciones" },
  ],
  COMPANY: [
    { label: "Mis ofertas", href: "/empresa/ofertas" },
    { label: "Nueva oferta", href: "/empresa/ofertas/nueva" },
  ],
  COORDINATOR: [{ label: "Aprobaciones", href: "/coordinador/aprobaciones" }],
};

const POLL_MS = 10_000;

interface Session {
  user: User | null;
  refreshUnread: () => void;
}

const SessionContext = createContext<Session>({ user: null, refreshUnread: () => undefined });

export const useSession = () => useContext(SessionContext);

function isActive(pathname: string, href: string, siblings: string[]) {
  if (pathname === href) return true;
  const longerMatch = siblings.some((other) => other !== href && other.startsWith(href) && pathname.startsWith(other));
  return pathname.startsWith(`${href}/`) && !longerMatch;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(() => {
    api<{ count: number }>("/notifications/unread-count")
      .then(({ count }) => setUnread(count))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    api<User>("/auth/me").then(setUser).catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshUnread();
    const timer = setInterval(refreshUnread, POLL_MS);
    window.addEventListener("focus", refreshUnread);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", refreshUnread);
    };
  }, [refreshUnread]);

  const logout = async () => {
    await api("/auth/logout", { method: "POST" }).catch(() => undefined);
    window.location.assign("/login");
  };

  const links = user ? NAV[user.role] : [];
  const hrefs = links.map((link) => link.href);
  const linkClass = (active: boolean) =>
    `flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg px-1.5 text-[13px] font-semibold whitespace-nowrap sm:flex-none sm:px-3 sm:text-sm ${
      active ? "bg-accent-soft text-accent-strong" : "text-muted hover:text-ink"
    }`;

  return (
    <SessionContext.Provider value={{ user, refreshUnread }}>
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-1 px-4 py-2">
          <Link href="/" className="flex min-h-11 items-center text-lg font-bold tracking-tight text-accent-strong">
            PractiConecta
          </Link>
          <div className="order-2 ml-auto flex items-center gap-2 sm:order-3">
            <span className="hidden max-w-44 truncate text-sm text-muted md:inline">{user?.displayName}</span>
            <button type="button" onClick={logout} className="min-h-11 rounded-lg px-3 text-sm font-semibold text-muted hover:text-ink">
              Salir
            </button>
          </div>
          <nav aria-label="Principal" className="order-3 flex w-full gap-1 sm:order-2 sm:w-auto">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(pathname, link.href, hrefs) ? "page" : undefined}
                className={linkClass(isActive(pathname, link.href, hrefs))}
              >
                {link.label}
              </Link>
            ))}
            {user && (
              <Link
                href="/notificaciones"
                aria-current={pathname === "/notificaciones" ? "page" : undefined}
                className={linkClass(pathname === "/notificaciones")}
              >
                Notificaciones
                {unread > 0 && (
                  <span
                    aria-label={`${unread} sin leer`}
                    data-testid="unread-count"
                    className="grid min-w-5 place-items-center rounded-full bg-danger px-1.5 text-xs font-bold text-white"
                  >
                    {unread}
                  </span>
                )}
              </Link>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 sm:py-8">{children}</main>
    </SessionContext.Provider>
  );
}
