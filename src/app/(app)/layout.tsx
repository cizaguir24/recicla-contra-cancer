import Link from "next/link";
import { auth, signOut } from "@/auth";

const NAV_LINKS = [
  { href: "/reportes/puntos-acopio", label: "Reporte" },
  { href: "/puntos-acopio", label: "Puntos de Acopio" },
  { href: "/fechas-acopio", label: "Fechas de Acopio" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-6">
            <span className="font-semibold text-accent">
              ♻️ Recicla Contra el Cáncer
            </span>
            <nav className="flex gap-4 text-sm">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-foreground/80 hover:text-accent"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-foreground/60">
              {session?.user?.name ?? session?.user?.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-border px-3 py-1.5 hover:bg-foreground/5"
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {children}
      </main>
    </div>
  );
}
