"use client";

import { useEffect, useMemo, useState } from "react";
import { usePermisos } from "@/lib/role-context";
import { ESTADO_BADGE, ESTADO_LABEL } from "@/lib/fechas-acopio";

type PuntoAcopio = { id: string; nombre: string };

type FechaAcopio = {
  id: string;
  puntoAcopioId: string;
  puntoAcopio: PuntoAcopio;
  fecha: string;
  estado: string;
  notas: string | null;
};

const FORM_INICIAL = {
  puntoAcopioId: "",
  fecha: "",
  estado: "programada",
  notas: "",
};

const ESTADOS = ["programada", "realizada", "cancelada"];

export default function FechasAcopioPage() {
  const { fechasAcopio: esAdmin } = usePermisos();
  const [fechas, setFechas] = useState<FechaAcopio[]>([]);
  const [puntos, setPuntos] = useState<PuntoAcopio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);

  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  async function cargarDatos() {
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
    cargarDatos();
  }, []);

  function abrirNuevo() {
    setEditId(null);
    setForm({ ...FORM_INICIAL, puntoAcopioId: puntos[0]?.id ?? "" });
    setMostrarForm(true);
  }

  function abrirEdicion(f: FechaAcopio) {
    setEditId(f.id);
    setForm({
      puntoAcopioId: f.puntoAcopioId,
      fecha: f.fecha.slice(0, 10),
      estado: f.estado,
      notas: f.notas ?? "",
    });
    setMostrarForm(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const url = editId ? `/api/fechas-acopio/${editId}` : "/api/fechas-acopio";
    const method = editId ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setMostrarForm(false);
    await cargarDatos();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar esta fecha de acopio?")) return;
    await fetch(`/api/fechas-acopio/${id}`, { method: "DELETE" });
    await cargarDatos();
  }

  const filtradas = useMemo(() => {
    return fechas.filter((f) => {
      const fechaStr = f.fecha.slice(0, 10);
      if (filtroEstado && f.estado !== filtroEstado) return false;
      if (filtroDesde && fechaStr < filtroDesde) return false;
      if (filtroHasta && fechaStr > filtroHasta) return false;
      return true;
    });
  }, [fechas, filtroEstado, filtroDesde, filtroHasta]);

  const resumen = useMemo(() => {
    const porEstado: Record<string, number> = {};
    for (const f of filtradas) {
      porEstado[f.estado] = (porEstado[f.estado] ?? 0) + 1;
    }
    return { total: filtradas.length, porEstado };
  }, [filtradas]);

  const hayFiltrosActivos = Boolean(filtroEstado || filtroDesde || filtroHasta);

  const pdfHref = useMemo(() => {
    const params = new URLSearchParams();
    if (filtroEstado) params.set("estado", filtroEstado);
    if (filtroDesde) params.set("desde", filtroDesde);
    if (filtroHasta) params.set("hasta", filtroHasta);
    return `/api/fechas-acopio/pdf?${params}`;
  }, [filtroEstado, filtroDesde, filtroHasta]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Fechas de Acopio</h1>
        <div className="flex items-center gap-3">
          {filtradas.length > 0 ? (
            <a
              href={pdfHref}
              className="rounded-xl border border-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-[var(--brand-blue)] hover:bg-white/40"
            >
              Descargar PDF
            </a>
          ) : (
            <span className="cursor-not-allowed rounded-xl border border-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-[var(--brand-blue)] opacity-50">
              Descargar PDF
            </span>
          )}
          {esAdmin && (
            <button
              onClick={abrirNuevo}
              disabled={puntos.length === 0}
              className="rounded-xl bg-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-[var(--accent-foreground)] shadow-sm disabled:opacity-50"
            >
              + Nueva fecha
            </button>
          )}
        </div>
      </div>

      {puntos.length === 0 && !cargando && (
        <p className="text-sm text-foreground/60">
          Primero registra un punto de acopio para poder agendar fechas.
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4 sm:grid-cols-3">
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
                {ESTADO_LABEL[estado] ?? estado}
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

      {!cargando && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md px-4 py-3 text-sm">
          <span className="font-medium">
            {resumen.total} {resumen.total === 1 ? "fecha" : "fechas"}
            {hayFiltrosActivos ? " con estos filtros" : " en total"}
          </span>
          {ESTADOS.map((estado) => (
            <span
              key={estado}
              className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTADO_BADGE[estado] ?? "bg-gray-100 text-gray-600"}`}
            >
              {resumen.porEstado[estado] ?? 0} {ESTADO_LABEL[estado] ?? estado}
            </span>
          ))}
        </div>
      )}

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="grid grid-cols-1 gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4 sm:grid-cols-2"
        >
          <label className="space-y-1 text-sm">
            <span className="font-medium">Punto de acopio</span>
            <select
              required
              value={form.puntoAcopioId}
              onChange={(e) => setForm({ ...form, puntoAcopioId: e.target.value })}
              className="input"
            >
              {puntos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Fecha</span>
            <input
              type="date"
              required
              value={form.fecha}
              onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              className="input"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Estado</span>
            <select
              value={form.estado}
              onChange={(e) => setForm({ ...form, estado: e.target.value })}
              className="input"
            >
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Notas</span>
            <input
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              className="input"
            />
          </label>
          <div className="flex gap-2 sm:col-span-2">
            <button
              type="submit"
              className="rounded-xl bg-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-[var(--accent-foreground)] shadow-sm"
            >
              Guardar
            </button>
            <button
              type="button"
              onClick={() => setMostrarForm(false)}
              className="rounded-xl border border-white/50 bg-white/40 backdrop-blur-md px-3 py-2 text-sm hover:bg-white/40"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {cargando ? (
        <p className="text-sm text-foreground/60">Cargando...</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/50 bg-white/40 backdrop-blur-md">
          <table className="w-full text-sm">
            <thead className="bg-white/50 text-left">
              <tr>
                <th className="px-3 py-2">Punto de acopio</th>
                <th className="px-3 py-2 whitespace-nowrap">Fecha</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Notas</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((f) => (
                <tr key={f.id} className="border-t border-white/50 even:bg-white/20">
                  <td className="px-3 py-2.5 font-medium">{f.puntoAcopio.nombre}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">{f.fecha.slice(0, 10)}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTADO_BADGE[f.estado] ?? "bg-gray-100 text-gray-600"}`}
                    >
                      {ESTADO_LABEL[f.estado] ?? f.estado}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[var(--muted)]">{f.notas}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {esAdmin && (
                      <>
                        <button
                          onClick={() => abrirEdicion(f)}
                          className="mr-2 text-[var(--brand-blue)] hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminar(f.id)}
                          className="text-red-500 hover:underline"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {filtradas.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-foreground/60">
                    {fechas.length === 0
                      ? "No hay fechas de acopio registradas."
                      : "No hay resultados con estos filtros."}
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
