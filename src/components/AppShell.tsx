"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Gauge,
  MapPin,
  CalendarDays,
  Settings,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  LogOut,
} from "lucide-react";
import { PermisosProvider } from "@/lib/role-context";
import type { Permisos } from "@/lib/roles";

const NAV = [
  { href: "/reportes/puntos-acopio", label: "Reporte", icon: ClipboardList },
  { href: "/reportes/desempeno", label: "Desempeño", icon: Gauge },
  { href: "/puntos-acopio", label: "Puntos de Acopio", icon: MapPin },
  { href: "/fechas-acopio", label: "Fechas de Acopio", icon: CalendarDays },
];

const NAV_ADMIN = [{ href: "/configuracion", label: "Configuración", icon: Settings }];

const COLLAPSE_KEY = "recicla-sidebar-colapsado";

export default function AppShell({
  userLabel,
  permisos,
  signOutAction,
  children,
}: {
  userLabel: string;
  permisos: Permisos;
  signOutAction: () => Promise<void>;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const nav = permisos.configuracion ? [...NAV, ...NAV_ADMIN] : NAV;

  useEffect(() => {
    const saved = localStorage.getItem(COLLAPSE_KEY);
    if (saved === "1") setCollapsed(true);
    setLoaded(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <PermisosProvider permisos={permisos}>
    <div className="min-h-screen flex flex-col">
      <div className="w-full shrink-0 overflow-hidden">
        <Image
          src="/portada-recicla-vs-cancer.png"
          alt="Recicla vs Cáncer — un proyecto original de Cómplices AC"
          width={2172}
          height={724}
          priority
          className="block h-auto w-full"
        />
      </div>
      <div className="flex flex-1 bg-gradient-to-br from-blue-100 via-white to-purple-100">
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-4 right-4 z-30 flex items-center gap-2 rounded-full bg-[var(--brand-blue)] text-white px-4 py-3 shadow-lg"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Sidebar - desktop */}
      <aside
        className={`hidden lg:flex lg:flex-col shrink-0 sticky top-0 h-screen overflow-y-auto border-r border-white/50 bg-white/40 backdrop-blur-md backdrop-saturate-150 py-5 transition-[width] duration-150 ${
          loaded ? "" : "invisible"
        } ${collapsed ? "w-[68px] px-2" : "w-64 px-3"}`}
      >
        <div className={`mb-4 flex items-center gap-2 px-2 ${collapsed ? "justify-center" : ""}`}>
          <span className="text-xl">♻️</span>
          {!collapsed && (
            <span className="text-sm font-semibold text-[var(--brand-blue-dark)]">
              Recicla Contra el Cáncer
            </span>
          )}
        </div>
        <button
          onClick={toggleCollapsed}
          title={collapsed ? "Expandir menú" : "Ocultar menú"}
          className={`flex items-center gap-2 rounded-lg px-3 py-2 mb-2 text-xs font-medium text-[var(--muted)] hover:bg-white/40 ${
            collapsed ? "justify-center" : ""
          }`}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4 shrink-0" />
          ) : (
            <PanelLeftClose className="h-4 w-4 shrink-0" />
          )}
          {!collapsed && "Ocultar menú"}
        </button>
        <SidebarContent pathname={pathname} collapsed={collapsed} nav={nav} />
        <div className="mt-auto pt-3">
          <UserFooter userLabel={userLabel} signOutAction={signOutAction} collapsed={collapsed} />
        </div>
      </aside>

      {/* Sidebar - mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <aside className="relative z-50 w-72 border-r border-white/50 bg-white/70 backdrop-blur-xl backdrop-saturate-150 px-3 py-5 shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-2 mb-3">
              <span className="text-sm font-semibold text-[var(--brand-blue-dark)]">
                ♻️ Recicla Contra el Cáncer
              </span>
              <button onClick={() => setOpen(false)}>
                <X className="h-5 w-5 text-[var(--muted)]" />
              </button>
            </div>
            <SidebarContent pathname={pathname} onNavigate={() => setOpen(false)} nav={nav} />
            <div className="mt-auto pt-3">
              <UserFooter userLabel={userLabel} signOutAction={signOutAction} />
            </div>
          </aside>
        </div>
      )}

      <main className="flex-1 min-w-0 px-4 sm:px-8 py-6">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
      </div>
    </div>
    </PermisosProvider>
  );
}

function SidebarContent({
  pathname,
  onNavigate,
  collapsed = false,
  nav,
}: {
  pathname: string;
  onNavigate?: () => void;
  collapsed?: boolean;
  nav: typeof NAV;
}) {
  return (
    <nav className="flex flex-col gap-0.5">
      {nav.map((item) => {
        const active = pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              collapsed ? "justify-center" : ""
            } ${
              active
                ? "bg-white/60 text-[var(--brand-blue-dark)] shadow-sm"
                : "text-[var(--foreground)] hover:bg-white/30"
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${active ? "text-[var(--brand-blue)]" : "text-[var(--muted)]"}`}
            />
            {!collapsed && item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserFooter({
  userLabel,
  signOutAction,
  collapsed = false,
}: {
  userLabel: string;
  signOutAction: () => Promise<void>;
  collapsed?: boolean;
}) {
  const inicial = userLabel.trim().charAt(0).toUpperCase() || "?";

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 border-t border-white/50 pt-3">
        <div
          title={userLabel}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-blue)] text-xs font-semibold text-white"
        >
          {inicial}
        </div>
        <form action={signOutAction}>
          <button
            type="submit"
            title="Cerrar sesión"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] hover:bg-white/40 hover:text-red-500"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/50 bg-white/40 p-3 space-y-2.5">
      <div className="flex items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-blue)] text-xs font-semibold text-white">
          {inicial}
        </div>
        <p className="truncate text-xs font-medium text-[var(--foreground)]">{userLabel}</p>
      </div>
      <form action={signOutAction}>
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:bg-white/60"
        >
          <LogOut className="h-3.5 w-3.5" /> Salir
        </button>
      </form>
    </div>
  );
}
