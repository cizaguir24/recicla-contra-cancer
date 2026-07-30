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

    // La papelera de Manifiestos expone borradores eliminados: solo lectura o
    // escritura, siempre requiere el permiso, sin importar el método.
    if (
      isApiRoute &&
      pathname.startsWith("/api/manifiestos/") &&
      (pathname.startsWith("/api/manifiestos/papelera") || pathname.endsWith("/restaurar")) &&
      !permisos?.manifiestos
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (isApiRoute && isWrite) {
      const bloqueado =
        ((pathname.startsWith("/api/usuarios") ||
          pathname.startsWith("/api/roles") ||
          pathname.startsWith("/api/configuracion")) &&
          !permisos?.configuracion) ||
        (pathname.startsWith("/api/puntos-acopio") && !permisos?.puntosAcopio) ||
        (pathname.startsWith("/api/fechas-acopio") && !permisos?.fechasAcopio) ||
        (pathname.startsWith("/api/sync/notion-acopios") && !permisos?.sincronizarNotion) ||
        (pathname.startsWith("/api/manifiestos") && !permisos?.manifiestos);

      if (bloqueado) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
    }

    if (pathname.startsWith("/configuracion") && !permisos?.configuracion) {
      return NextResponse.redirect(new URL("/reportes/puntos-acopio", req.nextUrl));
    }

    if (pathname.startsWith("/manifiestos/papelera") && !permisos?.manifiestos) {
      return NextResponse.redirect(new URL("/manifiestos", req.nextUrl));
    }
  }
});

export const config = {
  matcher: [
    "/((?!api/auth|api/cron|_next/static|_next/image|robots\\.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
