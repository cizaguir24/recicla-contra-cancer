"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, FileText, Eye, Download, Pencil, Copy, XCircle, PackageSearch } from "lucide-react";
import { usePermisos } from "@/lib/role-context";
import { ESTATUS_LABEL } from "@/lib/manifiestos";

type PuntoAcopioMini = { id: string; nombre: string; zona: string | null };

type ManifiestoItem = {
  id: string;
  puntoAcopioId: string;
  fechaManifiesto: string;
  fechaInicioPeriodo: string;
  fechaFinPeriodo: string;
  titulo: string;
  nombreFirmante: string;
  puesto: string;
  totalKg: number | null;
  estatus: "borrador" | "generado" | "cancelado";
  generadoAt: string | null;
  createdAt: string;
  puntoAcopio: PuntoAcopioMini;
};

const ESTATUS_BADGE: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-600",
  generado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-600",
};

function fmt(d: string) {
  return d.slice(0, 10);
}

export default function ManifiestosPage() {
  const { manifiestos: esAdmin } = usePermisos();
  const searchParams = useSearchParams();
  const puntoAcopioIdInicial = searchParams.get("puntoAcopioId") ?? "";

  const [items, setItems] = useState<ManifiestoItem[]>([]);
  const [puntos, setPuntos] = useState<PuntoAcopioMini[]>([]);
  const [cargando, setCargando] = useState(true);
  const [q, setQ] = useState("");
  const [filtroPunto, setFiltroPunto] = useState(puntoAcopioIdInicial);
  const [filtroEstatus, setFiltroEstatus] = useState("");

  const cargar = useCallback(async () => {
    setCargando(true);
    const [resItems, resPuntos] = await Promise.all([
      fetch("/api/manifiestos"),
      fetch("/api/puntos-acopio"),
    ]);
    setItems(await resItems.json());
    setPuntos(await resPuntos.json());
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const filtrados = useMemo(() => {
    const qNorm = q.trim().toLowerCase();
    return items.filter((m) => {
      if (filtroPunto && m.puntoAcopioId !== filtroPunto) return false;
      if (filtroEstatus && m.estatus !== filtroEstatus) return false;
      if (qNorm) {
        const texto = `${m.puntoAcopio.nombre} ${m.titulo} ${m.nombreFirmante}`.toLowerCase();
        if (!texto.includes(qNorm)) return false;
      }
      return true;
    });
  }, [items, q, filtroPunto, filtroEstatus]);

  async function cancelarOEliminar(m: ManifiestoItem) {
    const mensaje =
      m.estatus === "generado"
        ? "¿Cancelar este manifiesto? El PDF generado se conserva para trazabilidad."
        : "¿Eliminar este borrador de manifiesto?";
    if (!confirm(mensaje)) return;
    await fetch(`/api/manifiestos/${m.id}`, { method: "DELETE" });
    await cargar();
  }

  async function duplicar(id: string) {
    await fetch(`/api/manifiestos/${id}/duplicar`, { method: "POST" });
    await cargar();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Manifiestos</h1>
          <p className="text-sm text-foreground/60">
            {filtrados.length} manifiesto{filtrados.length === 1 ? "" : "s"}
          </p>
        </div>
        {esAdmin && (
          <Link
            href="/manifiestos/nuevo"
            className="rounded-xl bg-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-[var(--accent-foreground)] shadow-sm"
          >
            + Crear manifiesto
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4 sm:grid-cols-4">
        <label className="space-y-1 text-sm sm:col-span-2">
          <span className="font-medium">Buscar</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Benefactor, título, firmante..."
              className="input pl-8"
            />
          </div>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Punto de acopio</span>
          <select value={filtroPunto} onChange={(e) => setFiltroPunto(e.target.value)} className="input">
            <option value="">Todos</option>
            {puntos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Estatus</span>
          <select
            value={filtroEstatus}
            onChange={(e) => setFiltroEstatus(e.target.value)}
            className="input"
          >
            <option value="">Todos</option>
            <option value="borrador">Borrador</option>
            <option value="generado">Generado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </label>
      </div>

      {cargando ? (
        <p className="text-sm text-foreground/60">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtrados.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-white/60 bg-white/40 p-4 shadow-lg shadow-black/5 backdrop-blur-md backdrop-saturate-150"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <h2 className="font-semibold text-[var(--foreground)]">{m.puntoAcopio.nombre}</h2>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${ESTATUS_BADGE[m.estatus]}`}
                >
                  {ESTATUS_LABEL[m.estatus]}
                </span>
              </div>
              <p className="mb-3 text-xs text-[var(--muted)]">{m.titulo}</p>

              <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg bg-white/40 p-3 text-xs">
                <div className="col-span-2">
                  <p className="text-[var(--muted)]">Periodo</p>
                  <p className="font-medium text-[var(--foreground)]">
                    {fmt(m.fechaInicioPeriodo)} – {fmt(m.fechaFinPeriodo)}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">Emisión</p>
                  <p className="font-medium text-[var(--foreground)]">{fmt(m.fechaManifiesto)}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">Total Kg</p>
                  <p className="font-medium text-[var(--foreground)]">
                    {m.totalKg != null ? `${m.totalKg.toFixed(2)} kg` : "—"}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-[var(--muted)]">Firmante</p>
                  <p className="font-medium text-[var(--foreground)]">
                    {m.nombreFirmante || "—"} {m.puesto ? `· ${m.puesto}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-2 text-xs">
                {m.estatus === "generado" && (
                  <>
                    <a
                      href={`/api/manifiestos/${m.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[var(--brand-blue)] hover:underline"
                    >
                      <Eye className="h-3.5 w-3.5" /> Ver PDF
                    </a>
                    <a
                      href={`/api/manifiestos/${m.id}/pdf?download=1`}
                      className="flex items-center gap-1 text-[var(--brand-blue)] hover:underline"
                    >
                      <Download className="h-3.5 w-3.5" /> Descargar
                    </a>
                  </>
                )}
                {esAdmin && m.estatus === "borrador" && (
                  <Link
                    href={`/manifiestos/${m.id}`}
                    className="flex items-center gap-1 text-[var(--brand-blue)] hover:underline"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Link>
                )}
                {esAdmin && (
                  <button
                    onClick={() => duplicar(m.id)}
                    className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--brand-blue)]"
                  >
                    <Copy className="h-3.5 w-3.5" /> Duplicar
                  </button>
                )}
                {esAdmin && m.estatus !== "cancelado" && (
                  <button
                    onClick={() => cancelarOEliminar(m)}
                    className="flex items-center gap-1 text-[var(--muted)] hover:text-red-500"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {m.estatus === "generado" ? "Cancelar" : "Eliminar"}
                  </button>
                )}
              </div>
            </div>
          ))}
          {filtrados.length === 0 && (
            <div className="col-span-full flex min-h-[30vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/60 bg-white/20 text-center backdrop-blur-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-blue-light)]">
                {items.length === 0 ? (
                  <FileText className="h-6 w-6 text-[var(--brand-blue-dark)]" />
                ) : (
                  <PackageSearch className="h-6 w-6 text-[var(--brand-blue-dark)]" />
                )}
              </div>
              <p className="text-sm text-[var(--muted)]">
                {items.length === 0
                  ? "Aún no hay manifiestos creados."
                  : "Ningún manifiesto coincide con estos filtros."}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
