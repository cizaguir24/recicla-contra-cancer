"use client";

import { useEffect, useMemo, useState } from "react";

type ColorSemaforo = "pink" | "amber" | "green";

type FilaDesempeno = {
  id: string;
  nombre: string;
  municipio: string | null;
  tipoContenedor: string | null;
  decisionReubicacion: string | null;
  numeroCelular: string | null;
  correoElectronico: string | null;
  totalRecolecciones: number;
  ultimaRecoleccion: string | null;
  kgsTapasTotal: number;
  frecuencia: string;
  semaforo: { color: ColorSemaforo; label: string };
  conteoVentanaMovil: number;
};

type Totales = { rosa: number; amarillo: number; verde: number };

const SIN_CONTENEDOR = "__sin_contenedor__";

const DOT_CLASES: Record<ColorSemaforo, string> = {
  pink: "bg-pink-500",
  amber: "bg-amber-500",
  green: "bg-green-500",
};

function Punto({ color }: { color: ColorSemaforo }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT_CLASES[color]}`} />;
}

function exportarCSV(filas: FilaDesempeno[]) {
  const encabezados = [
    "Punto de acopio",
    "Municipio",
    "Tipo de contenedor",
    "Total recolecciones",
    "Última recolección",
    "Kgs Tapas total",
    "Frecuencia",
    "Recolecciones últimos 6 meses",
    "Semáforo",
    "Decisión de Reubicación (Notion)",
    "Número Celular",
    "Correo electrónico",
  ];
  const lineas = filas.map((f) =>
    [
      f.nombre,
      f.municipio ?? "",
      f.tipoContenedor ?? "",
      f.totalRecolecciones,
      f.ultimaRecoleccion ? f.ultimaRecoleccion.slice(0, 10) : "",
      f.kgsTapasTotal,
      f.frecuencia,
      f.conteoVentanaMovil,
      f.semaforo.label,
      f.decisionReubicacion ?? "",
      f.numeroCelular ?? "",
      f.correoElectronico ?? "",
    ]
      .map((valor) => `"${String(valor).replace(/"/g, '""')}"`)
      .join(","),
  );
  const csv = [encabezados.join(","), ...lineas].join("\n");

  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `desempeno-puntos-acopio-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function DesempenoPage() {
  const [filas, setFilas] = useState<FilaDesempeno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroContenedor, setFiltroContenedor] = useState("");

  useEffect(() => {
    async function cargar() {
      setCargando(true);
      const res = await fetch("/api/reportes/desempeno");
      const data = await res.json();
      setFilas(data.filas);
      setCargando(false);
    }
    cargar();
  }, []);

  const contenedores = useMemo(() => {
    const nombres = new Set(filas.map((f) => f.tipoContenedor).filter((c): c is string => !!c));
    return Array.from(nombres).sort();
  }, [filas]);

  const hayFilasSinContenedor = useMemo(() => filas.some((f) => !f.tipoContenedor), [filas]);

  const filtradas = useMemo(() => {
    if (!filtroContenedor) return filas;
    if (filtroContenedor === SIN_CONTENEDOR) return filas.filter((f) => !f.tipoContenedor);
    return filas.filter((f) => f.tipoContenedor === filtroContenedor);
  }, [filas, filtroContenedor]);

  const totales = useMemo<Totales>(
    () => ({
      rosa: filtradas.filter((f) => f.semaforo.label === "Rosa").length,
      amarillo: filtradas.filter((f) => f.semaforo.label === "Amarillo").length,
      verde: filtradas.filter((f) => f.semaforo.label === "Verde").length,
    }),
    [filtradas],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Desempeño por Punto de Acopio</h1>
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-foreground/60">
            Semáforo según recolecciones en los últimos 6 meses (ventana móvil):
            <Punto color="pink" /> 2 o menos,
            <Punto color="amber" /> exactamente 3,
            <Punto color="green" /> 4 o más.
          </p>
        </div>
        <button
          onClick={() => exportarCSV(filtradas)}
          disabled={filtradas.length === 0}
          className="rounded-xl border border-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-[var(--brand-blue)] hover:bg-white/40 disabled:opacity-50"
        >
          Exportar CSV
        </button>
      </div>

      <div className="rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4 sm:max-w-xs">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Contenedor</span>
          <select
            value={filtroContenedor}
            onChange={(e) => setFiltroContenedor(e.target.value)}
            className="input"
          >
            <option value="">Todos</option>
            {contenedores.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {hayFilasSinContenedor && <option value={SIN_CONTENEDOR}>Sin contenedor</option>}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4">
          <Punto color="pink" />
          <div>
            <p className="text-2xl font-semibold text-pink-600">{totales.rosa}</p>
            <p className="text-sm text-foreground/60">Puntos en rosa</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4">
          <Punto color="amber" />
          <div>
            <p className="text-2xl font-semibold text-amber-600">{totales.amarillo}</p>
            <p className="text-sm text-foreground/60">Puntos en amarillo</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4">
          <Punto color="green" />
          <div>
            <p className="text-2xl font-semibold text-green-600">{totales.verde}</p>
            <p className="text-sm text-foreground/60">Puntos en verde</p>
          </div>
        </div>
      </div>

      {cargando ? (
        <p className="text-sm text-foreground/60">Cargando...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/50 bg-white/40 backdrop-blur-md">
          <table className="w-full text-sm">
            <thead className="bg-white/50 text-left">
              <tr>
                <th className="px-3 py-2">Punto de acopio</th>
                <th className="px-3 py-2">Municipio</th>
                <th className="px-3 py-2">Contenedor</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Última recolección</th>
                <th className="px-3 py-2">Kgs Tapas</th>
                <th className="px-3 py-2">Frecuencia</th>
                <th className="px-3 py-2">Últimos 6 meses</th>
                <th className="px-3 py-2">Semáforo</th>
                <th className="px-3 py-2">Decisión Reubicación (Notion)</th>
                <th className="px-3 py-2">Número Celular</th>
                <th className="px-3 py-2">Correo electrónico</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f) => (
                <tr key={f.id} className="border-t border-white/50">
                  <td className="px-3 py-2 font-medium">{f.nombre}</td>
                  <td className="px-3 py-2">{f.municipio ?? "—"}</td>
                  <td className="px-3 py-2">{f.tipoContenedor ?? "—"}</td>
                  <td className="px-3 py-2">{f.totalRecolecciones}</td>
                  <td className="px-3 py-2">
                    {f.ultimaRecoleccion ? f.ultimaRecoleccion.slice(0, 10) : "—"}
                  </td>
                  <td className="px-3 py-2">{f.kgsTapasTotal.toFixed(2)}</td>
                  <td className="px-3 py-2">{f.frecuencia}</td>
                  <td className="px-3 py-2">{f.conteoVentanaMovil}</td>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      <Punto color={f.semaforo.color} /> {f.semaforo.label}
                    </span>
                  </td>
                  <td className="px-3 py-2">{f.decisionReubicacion ?? "—"}</td>
                  <td className="px-3 py-2">{f.numeroCelular ?? "—"}</td>
                  <td className="px-3 py-2">{f.correoElectronico ?? "—"}</td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={12} className="px-3 py-6 text-center text-foreground/60">
                    No hay puntos de acopio con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
