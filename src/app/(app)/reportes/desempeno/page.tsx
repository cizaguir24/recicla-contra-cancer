"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Phone, Mail, PackageSearch, Pencil, X } from "lucide-react";
import { usePermisos } from "@/lib/role-context";
import SearchBar from "@/components/SearchBar";
import { coincideBusqueda } from "@/lib/texto";

type ColorSemaforo = "pink" | "amber" | "green";

const OPCIONES_TIPO_CONTENEDOR = [
  "Centro de Acopio",
  "Corazón Alen",
  "TapaBox",
  "Corazón Tlajomulco",
  "PET",
  "Contenedor Propio",
];

const OPCIONES_DECISION_REUBICACION = ["Sin revisar", "Mantener", "Dar seguimiento", "Reubicar"];

type FilaDesempeno = {
  id: string;
  nombre: string;
  municipio: string | null;
  responsable: string | null;
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

const FORM_EDICION_VACIO = {
  nombre: "",
  zona: "",
  tipoContenedor: "",
  decisionReubicacion: "",
  numeroCelular: "",
  correoElectronico: "",
};

export default function DesempenoPage() {
  const { puntosAcopio: esAdmin } = usePermisos();
  const [filas, setFilas] = useState<FilaDesempeno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroContenedor, setFiltroContenedor] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_EDICION_VACIO);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch("/api/reportes/desempeno");
    const data = await res.json();
    setFilas(data.filas);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  function abrirEdicion(f: FilaDesempeno) {
    setEditandoId(f.id);
    setForm({
      nombre: f.nombre,
      zona: f.municipio ?? "",
      tipoContenedor: f.tipoContenedor ?? "",
      decisionReubicacion: f.decisionReubicacion ?? "",
      numeroCelular: f.numeroCelular ?? "",
      correoElectronico: f.correoElectronico ?? "",
    });
  }

  function cerrarEdicion() {
    setEditandoId(null);
    setForm(FORM_EDICION_VACIO);
  }

  async function guardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editandoId) return;
    setGuardando(true);
    await fetch(`/api/puntos-acopio/${editandoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setGuardando(false);
    cerrarEdicion();
    await cargar();
  }

  const contenedores = useMemo(() => {
    const nombres = new Set(filas.map((f) => f.tipoContenedor).filter((c): c is string => !!c));
    return Array.from(nombres).sort();
  }, [filas]);

  const hayFilasSinContenedor = useMemo(() => filas.some((f) => !f.tipoContenedor), [filas]);

  const filtradas = useMemo(() => {
    let resultado = filas;
    if (filtroContenedor === SIN_CONTENEDOR) {
      resultado = resultado.filter((f) => !f.tipoContenedor);
    } else if (filtroContenedor) {
      resultado = resultado.filter((f) => f.tipoContenedor === filtroContenedor);
    }
    if (busqueda) {
      resultado = resultado.filter((f) =>
        coincideBusqueda(busqueda, f.nombre, f.municipio, f.responsable),
      );
    }
    return resultado;
  }, [filas, filtroContenedor, busqueda]);

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

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4 sm:grid-cols-[1fr_auto] sm:items-end">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Buscar</span>
          <SearchBar value={busqueda} onChange={setBusqueda} />
        </label>
        <label className="space-y-1 text-sm sm:w-56">
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
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${BADGE_CLASES[f.semaforo.color]}`}
                  >
                    <Punto color={f.semaforo.color} /> {f.semaforo.label}
                  </span>
                  {esAdmin && (
                    <button
                      onClick={() => abrirEdicion(f)}
                      title="Editar"
                      className="rounded p-1 text-[var(--muted)] hover:bg-white/60 hover:text-[var(--brand-blue)]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
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
              <p className="text-sm text-[var(--muted)]">
                {busqueda
                  ? "No se encontraron puntos de acopio que coincidan con tu búsqueda."
                  : "No hay puntos de acopio con estos filtros."}
              </p>
              {busqueda && (
                <button
                  onClick={() => setBusqueda("")}
                  className="text-sm font-medium text-[var(--brand-blue)] hover:underline"
                >
                  Limpiar búsqueda
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {editandoId && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/20 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-full overflow-y-auto rounded-2xl border border-white/50 bg-white/70 p-6 shadow-2xl backdrop-blur-xl backdrop-saturate-150">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Editar punto de acopio</h2>
              <button onClick={cerrarEdicion}>
                <X className="h-5 w-5 text-[var(--muted)]" />
              </button>
            </div>
            <form onSubmit={guardarEdicion} className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Nombre</span>
                <input
                  required
                  value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                  className="input"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Municipio</span>
                <input
                  value={form.zona}
                  onChange={(e) => setForm((f) => ({ ...f, zona: e.target.value }))}
                  className="input"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Tipo de contenedor</span>
                <select
                  value={form.tipoContenedor}
                  onChange={(e) => setForm((f) => ({ ...f, tipoContenedor: e.target.value }))}
                  className="input"
                >
                  <option value="">Sin especificar</option>
                  {OPCIONES_TIPO_CONTENEDOR.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Decisión de Reubicación</span>
                <select
                  value={form.decisionReubicacion}
                  onChange={(e) => setForm((f) => ({ ...f, decisionReubicacion: e.target.value }))}
                  className="input"
                >
                  <option value="">Sin especificar</option>
                  {OPCIONES_DECISION_REUBICACION.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Número Celular</span>
                <input
                  value={form.numeroCelular}
                  onChange={(e) => setForm((f) => ({ ...f, numeroCelular: e.target.value }))}
                  className="input"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Correo electrónico</span>
                <input
                  type="email"
                  value={form.correoElectronico}
                  onChange={(e) => setForm((f) => ({ ...f, correoElectronico: e.target.value }))}
                  className="input"
                />
              </label>
              <p className="text-[11px] text-[var(--muted)]">
                Si este punto se sincroniza con Notion, estos campos pueden sobrescribirse en la
                próxima sincronización.
              </p>
              <button
                type="submit"
                disabled={guardando}
                className="w-full rounded-xl bg-[var(--brand-blue)] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {guardando ? "Guardando…" : "Guardar cambios"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
