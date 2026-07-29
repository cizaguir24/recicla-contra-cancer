import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isLoginPage = pathname.startsWith("/login");
  const isApiRoute = pathname.startsWith("/api");

  if (!isLoggedIn && isApiRoute) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!isLoggedIn && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (isLoggedIn) {
    const permisos = req.auth?.user?.permisos;
    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

    if (isApiRoute && isWrite) {
      const bloqueado =
        ((pathname.startsWith("/api/usuarios") || pathname.startsWith("/api/roles")) &&
          !permisos?.configuracion) ||
        (pathname.startsWith("/api/puntos-acopio") && !permisos?.puntosAcopio) ||
        (pathname.startsWith("/api/fechas-acopio") && !permisos?.fechasAcopio) ||
        (pathname.startsWith("/api/sync/notion-acopios") && !permisos?.sincronizarNotion);

      if (bloqueado) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
    }

    if (pathname.startsWith("/configuracion") && !permisos?.configuracion) {
      return NextResponse.redirect(new URL("/reportes/puntos-acopio", req.nextUrl));
    }
  }
});

export const config = {
  matcher: [
    "/((?!api/auth|api/cron|_next/static|_next/image|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
