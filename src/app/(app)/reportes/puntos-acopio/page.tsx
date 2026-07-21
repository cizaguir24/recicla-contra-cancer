"use client";

import { useEffect, useMemo, useState } from "react";

type PuntoAcopio = { id: string; nombre: string; zona: string | null };

type FechaAcopio = {
  id: string;
  puntoAcopioId: string;
  puntoAcopio: PuntoAcopio;
  fecha: string;
  horaInicio: string | null;
  horaFin: string | null;
  estado: string;
  notas: string | null;
};

const ESTADOS = ["programada", "realizada", "cancelada"];

function exportarCSV(filas: FechaAcopio[]) {
  const encabezados = [
    "Punto de acopio",
    "Zona",
    "Fecha",
    "Hora inicio",
    "Hora fin",
    "Estado",
    "Notas",
  ];
  const lineas = filas.map((f) =>
    [
      f.puntoAcopio.nombre,
      f.puntoAcopio.zona ?? "",
      f.fecha.slice(0, 10),
      f.horaInicio ?? "",
      f.horaFin ?? "",
      f.estado,
      f.notas ?? "",
    ]
      .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [encabezados.join(","), ...lineas].join("\n");

  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `reporte-puntos-acopio-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportePuntosAcopioPage() {
  const [fechas, setFechas] = useState<FechaAcopio[]>([]);
  const [puntos, setPuntos] = useState<PuntoAcopio[]>([]);
  const [cargando, setCargando] = useState(true);

  const [filtroPunto, setFiltroPunto] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  useEffect(() => {
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
    cargar();
  }, []);

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
        <button
          onClick={() => exportarCSV(filtradas)}
          disabled={filtradas.length === 0}
          className="rounded-md border border-accent px-3 py-2 text-sm font-medium text-accent disabled:opacity-50"
        >
          Exportar CSV
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-lg border border-border p-4 sm:grid-cols-4">
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
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-foreground/5 text-left">
              <tr>
                <th className="px-3 py-2">Punto de acopio</th>
                <th className="px-3 py-2">Zona</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Horario</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Notas</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f) => (
                <tr key={f.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{f.puntoAcopio.nombre}</td>
                  <td className="px-3 py-2">{f.puntoAcopio.zona}</td>
                  <td className="px-3 py-2">{f.fecha.slice(0, 10)}</td>
                  <td className="px-3 py-2">
                    {f.horaInicio ?? "—"} - {f.horaFin ?? "—"}
                  </td>
                  <td className="px-3 py-2 capitalize">{f.estado}</td>
                  <td className="px-3 py-2">{f.notas}</td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-foreground/60">
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
