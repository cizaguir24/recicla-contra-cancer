"use client";

import { useEffect, useMemo, useState } from "react";
import { MapPin, Phone, Mail, PackageSearch } from "lucide-react";

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

const BADGE_CLASES: Record<ColorSemaforo, string> = {
  pink: "bg-pink-100 text-pink-700",
  amber: "bg-amber-100 text-amber-700",
  green: "bg-green-100 text-green-700",
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtradas.map((f) => (
            <div
              key={f.id}
              className="rounded-xl border border-white/60 bg-white/40 p-4 shadow-lg shadow-black/5 backdrop-blur-md backdrop-saturate-150"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <h2 className="font-semibold text-[var(--foreground)]">{f.nombre}</h2>
                <span
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${BADGE_CLASES[f.semaforo.color]}`}
                >
                  <Punto color={f.semaforo.color} /> {f.semaforo.label}
                </span>
              </div>

              <p className="mb-3 flex items-center gap-1 text-xs text-[var(--muted)]">
                <MapPin className="h-3 w-3 shrink-0" />
                {f.municipio ?? "Sin municipio"}
                {f.tipoContenedor ? ` · ${f.tipoContenedor}` : ""}
              </p>

              <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg bg-white/40 p-3 text-xs">
                <div>
                  <p className="text-[var(--muted)]">Recolecciones</p>
                  <p className="font-medium text-[var(--foreground)]">{f.totalRecolecciones}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">Últimos 6 meses</p>
                  <p className="font-medium text-[var(--foreground)]">{f.conteoVentanaMovil}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">Kgs Tapas</p>
                  <p className="font-medium text-[var(--foreground)]">{f.kgsTapasTotal.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">Frecuencia</p>
                  <p className="font-medium text-[var(--foreground)]">{f.frecuencia}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[var(--muted)]">Última recolección</p>
                  <p className="font-medium text-[var(--foreground)]">
                    {f.ultimaRecoleccion ? f.ultimaRecoleccion.slice(0, 10) : "—"}
                  </p>
                </div>
              </div>

              {f.decisionReubicacion && (
                <p className="mb-2 flex items-center gap-1 text-xs text-[var(--muted)]">
                  <PackageSearch className="h-3 w-3 shrink-0" />
                  Reubicación (Notion): <span className="font-medium text-[var(--foreground)]">{f.decisionReubicacion}</span>
                </p>
              )}

              {(f.numeroCelular || f.correoElectronico) && (
                <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-2 text-xs text-[var(--muted)]">
                  {f.numeroCelular && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" /> {f.numeroCelular}
                    </span>
                  )}
                  {f.correoElectronico && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3 shrink-0" /> {f.correoElectronico}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
          {filtradas.length === 0 && (
            <div className="col-span-full flex min-h-[30vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/60 bg-white/20 text-center backdrop-blur-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-blue-light)]">
                <PackageSearch className="h-6 w-6 text-[var(--brand-blue-dark)]" />
              </div>
              <p className="text-sm text-[var(--muted)]">No hay puntos de acopio con estos filtros.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
