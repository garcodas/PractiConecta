import { NextResponse, type NextRequest } from "next/server";

const HOME: Record<string, string> = {
  STUDENT: "/estudiante/ofertas",
  COMPANY: "/empresa/ofertas",
  COORDINATOR: "/coordinador/aprobaciones",
};

const AREA: Record<string, string> = {
  "/estudiante": "STUDENT",
  "/empresa": "COMPANY",
  "/coordinador": "COORDINATOR",
};

/** Lee el rol de la sesión. Solo orienta la navegación: la seguridad real está en el backend. */
function sessionRole(request: NextRequest): string | null {
  const token = request.cookies.get("pc_session")?.value;
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp * 1000 > Date.now() ? payload.role : null;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const role = sessionRole(request);
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));

  if (pathname === "/login") return role ? to(HOME[role]) : NextResponse.next();
  if (!role) return to(pathname === "/" ? "/login" : `/login?next=${encodeURIComponent(pathname + search)}`);
  if (pathname === "/") return to(HOME[role]);

  const area = Object.keys(AREA).find((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
  if (area && AREA[area] !== role) return to(HOME[role]);
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
