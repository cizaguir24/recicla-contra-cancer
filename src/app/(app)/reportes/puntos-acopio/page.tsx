"use client";

import { useEffect, useMemo, useState } from "react";
import { usePermisos } from "@/lib/role-context";
import { ESTADO_BADGE, ESTADO_LABEL } from "@/lib/fechas-acopio";
import { descargarCSV } from "@/lib/csv";

type PuntoAcopio = { id: string; nombre: string; zona: string | null };

type FechaAcopio = {
  id: string;
  puntoAcopioId: string;
  puntoAcopio: PuntoAcopio;
  fecha: string;
  estado: string;
  notas: string | null;
  petKg: number | null;
  tapasKg: number | null;
  aluminioKg: number | null;
  tapasWinsKg: number | null;
};

const ESTADOS = ["programada", "realizada", "cancelada"];

function CeldaKg({ kg }: { kg: number | null }) {
  if (!kg) {
    return <span className="text-[var(--muted)]">—</span>;
  }
  return (
    <>
      <span className="font-medium text-[var(--foreground)]">{kg.toFixed(2)}</span>{" "}
      <span className="text-[var(--muted)]">kg</span>
    </>
  );
}

function exportarCSV(filas: FechaAcopio[]) {
  descargarCSV(
    `reporte-puntos-acopio-${new Date().toISOString().slice(0, 10)}.csv`,
    ["Punto de acopio", "Zona", "Fecha", "Estado", "Kgs Tapas", "Kgs PET", "Kgs Aluminio", "Kgs Tapas Wins", "Notas"],
    filas.map((f) => [
      f.puntoAcopio.nombre,
      f.puntoAcopio.zona ?? "",
      f.fecha.slice(0, 10),
      f.estado,
      f.tapasKg ?? "",
      f.petKg ?? "",
      f.aluminioKg ?? "",
      f.tapasWinsKg ?? "",
      f.notas ?? "",
    ]),
  );
}

export default function ReportePuntosAcopioPage() {
  const { sincronizarNotion: esAdmin } = usePermisos();
  const [fechas, setFechas] = useState<FechaAcopio[]>([]);
  const [puntos, setPuntos] = useState<PuntoAcopio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  const [resultadoSync, setResultadoSync] = useState<string | null>(null);

  const [filtroPunto, setFiltroPunto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  async function cargar() {
    setCargando(true);
    const [resFechas, resPuntos] = await Promise.all([
      fetch("/api/fechas-acopio"),
      fetch("/api/puntos-acopio"),
    ]);
    setFechas(await resFechas.json());
    setPuntos(await resPuntos.json());
    setCargando(false);
  }

  useEffect(() => {
    cargar();
  }, []);

  async function sincronizarConNotion() {
    setSincronizando(true);
    setResultadoSync(null);
    try {
      const res = await fetch("/api/sync/notion-acopios", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const { creados, actualizados, fusionados } = await res.json();
      setResultadoSync(
        `${creados} nuevos, ${actualizados} actualizados` +
          (fusionados ? `, ${fusionados} fusionados con fechas manuales` : ""),
      );
      await cargar();
    } catch {
      setResultadoSync("Error al sincronizar con Notion");
    } finally {
      setSincronizando(false);
    }
  }

  const filtradas = useMemo(() => {
    return fechas.filter((f) => {
      const fechaStr = f.fecha.slice(0, 10);
      if (filtroPunto && f.puntoAcopioId !== filtroPunto) return false;
      if (filtroEstado && f.estado !== filtroEstado) return false;
      if (filtroDesde && fechaStr < filtroDesde) return false;
      if (filtroHasta && fechaStr > filtroHasta) return false;
      return true;
    });
  }, [fechas, filtroPunto, filtroEstado, filtroDesde, filtroHasta]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Reporte de Puntos y Fechas de Acopio</h1>
        <div className="flex items-center gap-3">
          {resultadoSync && (
            <span className="text-sm text-foreground/60">{resultadoSync}</span>
          )}
          {esAdmin && (
            <button
              onClick={sincronizarConNotion}
              disabled={sincronizando}
              className="rounded-xl border border-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-[var(--brand-blue)] hover:bg-white/40 disabled:opacity-50"
            >
              {sincronizando ? "Sincronizando..." : "Sincronizar con Notion"}
            </button>
          )}
          <button
            onClick={() => exportarCSV(filtradas)}
            disabled={filtradas.length === 0}
            className="rounded-xl border border-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-[var(--brand-blue)] hover:bg-white/40 disabled:opacity-50"
          >
            Exportar CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4 sm:grid-cols-4">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Punto de acopio</span>
          <select
            value={filtroPunto}
            onChange={(e) => setFiltroPunto(e.target.value)}
            className="input"
          >
            <option value="">Todos</option>
            {puntos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Estado</span>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="input"
          >
            <option value="">Todos</option>
            {ESTADOS.map((estado) => (
              <option key={estado} value={estado}>
                {estado}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Desde</span>
          <input
            type="date"
            value={filtroDesde}
            onChange={(e) => setFiltroDesde(e.target.value)}
            className="input"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Hasta</span>
          <input
            type="date"
            value={filtroHasta}
            onChange={(e) => setFiltroHasta(e.target.value)}
            className="input"
          />
        </label>
      </div>

      {cargando ? (
        <p className="text-sm text-foreground/60">Cargando...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/50 bg-white/40 backdrop-blur-md">
          <table className="w-full text-sm">
            <thead className="bg-white/50 text-left">
              <tr>
                <th className="px-3 py-2">Punto de acopio</th>
                <th className="px-3 py-2">Zona</th>
                <th className="px-3 py-2 whitespace-nowrap">Fecha</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2 text-right">Kgs Tapas</th>
                <th className="px-3 py-2 text-right">Kgs PET</th>
                <th className="px-3 py-2 text-right">Kgs Aluminio</th>
                <th className="px-3 py-2">Notas</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f) => (
                <tr key={f.id} className="border-t border-white/50 even:bg-white/20">
                  <td className="px-3 py-2.5 font-medium">{f.puntoAcopio.nombre}</td>
                  <td className="px-3 py-2.5 text-[var(--muted)]">{f.puntoAcopio.zona}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{f.fecha.slice(0, 10)}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTADO_BADGE[f.estado] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {ESTADO_LABEL[f.estado] ?? f.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <CeldaKg kg={f.tapasKg} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <CeldaKg kg={f.petKg} />
                  </td>
                  <td className="px-3 py-2.5 text-right">
                    <CeldaKg kg={f.aluminioKg} />
                  </td>
                  <td className="px-3 py-2.5 text-[var(--muted)]">{f.notas}</td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-foreground/60">
                    No hay resultados con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-sm text-foreground/60">
        {filtradas.length} de {fechas.length} fechas mostradas.
      </p>
    </div>
  );
}
