"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { MapPin, Phone, Pencil, Trash2, PackageSearch, FileText, X } from "lucide-react";
import { usePermisos } from "@/lib/role-context";
import SearchBar from "@/components/SearchBar";
import { coincideBusqueda } from "@/lib/texto";

type PuntoAcopio = {
  id: string;
  nombre: string;
  direccion: string;
  zona: string | null;
  estado: string | null;
  materiales: string;
  responsable: string | null;
  contacto: string | null;
  activo: boolean;
};

const FORM_INICIAL = {
  nombre: "",
  direccion: "",
  zona: "",
  estado: "",
  materiales: "",
  responsable: "",
  contacto: "",
  activo: true,
};

export default function PuntosAcopioPage() {
  const { puntosAcopio: esAdmin } = usePermisos();
  const [puntos, setPuntos] = useState<PuntoAcopio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const cargarPuntos = useCallback(async () => {
    setCargando(true);
    const res = await fetch("/api/puntos-acopio");
    const data = await res.json();
    setPuntos(data);
    setCargando(false);
  }, []);

  useEffect(() => {
    cargarPuntos();
  }, [cargarPuntos]);

  function abrirNuevo() {
    setEditId(null);
    setForm(FORM_INICIAL);
    setMostrarForm(true);
  }

  function abrirEdicion(punto: PuntoAcopio) {
    setEditId(punto.id);
    setForm({
      nombre: punto.nombre,
      direccion: punto.direccion,
      zona: punto.zona ?? "",
      estado: punto.estado ?? "",
      materiales: punto.materiales,
      responsable: punto.responsable ?? "",
      contacto: punto.contacto ?? "",
      activo: punto.activo,
    });
    setMostrarForm(true);
  }

  function cerrarForm() {
    setMostrarForm(false);
    setEditId(null);
    setForm(FORM_INICIAL);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    const url = editId ? `/api/puntos-acopio/${editId}` : "/api/puntos-acopio";
    const method = editId ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setGuardando(false);
    cerrarForm();
    await cargarPuntos();
  }

  async function eliminar(ev: React.MouseEvent, id: string) {
    ev.stopPropagation();
    if (!confirm("¿Eliminar este punto de acopio? También se eliminarán sus fechas asociadas."))
      return;
    await fetch(`/api/puntos-acopio/${id}`, { method: "DELETE" });
    await cargarPuntos();
  }

  const puntosFiltrados = useMemo(() => {
    if (!busqueda) return puntos;
    return puntos.filter((p) =>
      coincideBusqueda(busqueda, p.nombre, p.zona, p.responsable),
    );
  }, [puntos, busqueda]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Puntos de Acopio</h1>
          <p className="text-sm text-foreground/60">
            {puntosFiltrados.length} punto{puntosFiltrados.length === 1 ? "" : "s"} registrado
            {puntosFiltrados.length === 1 ? "" : "s"}
          </p>
        </div>
        {esAdmin && (
          <button
            onClick={abrirNuevo}
            className="rounded-xl bg-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-[var(--accent-foreground)] shadow-sm"
          >
            + Nuevo punto
          </button>
        )}
      </div>

      <SearchBar value={busqueda} onChange={setBusqueda} className="sm:max-w-md" />

      {cargando ? (
        <p className="text-sm text-foreground/60">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {puntosFiltrados.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-white/60 bg-white/40 p-4 shadow-lg shadow-black/5 backdrop-blur-md backdrop-saturate-150"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <h2 className="font-semibold text-[var(--foreground)]">{p.nombre}</h2>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      p.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                  {esAdmin && (
                    <>
                      <button
                        onClick={() => abrirEdicion(p)}
                        title="Editar"
                        className="rounded p-1 text-[var(--muted)] hover:bg-white/60 hover:text-[var(--brand-blue)]"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={(ev) => eliminar(ev, p.id)}
                        title="Eliminar"
                        className="rounded p-1 text-[var(--muted)] hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <p className="mb-3 flex items-start gap-1 text-xs text-[var(--muted)]">
                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                <span>
                  {p.direccion || "Sin dirección"}
                  {p.zona ? `, ${p.zona}` : ""}
                  {p.estado ? `, ${p.estado}` : ""}
                </span>
              </p>

              <div className="mb-2 rounded-lg bg-white/40 p-3 text-xs">
                <p className="text-[var(--muted)]">Materiales</p>
                <p className="font-medium text-[var(--foreground)]">{p.materiales}</p>
              </div>

              {(p.responsable || p.contacto) && (
                <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                  {p.responsable && <span>{p.responsable}</span>}
                  {p.contacto && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 shrink-0" /> {p.contacto}
                    </span>
                  )}
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-2 text-xs">
                <Link
                  href={`/manifiestos?puntoAcopioId=${p.id}`}
                  className="flex items-center gap-1 text-[var(--brand-blue)] hover:underline"
                >
                  <FileText className="h-3.5 w-3.5" /> Manifiestos
                </Link>
                {esAdmin && (
                  <Link
                    href={`/manifiestos/nuevo?puntoAcopioId=${p.id}`}
                    className="flex items-center gap-1 text-[var(--muted)] hover:text-[var(--brand-blue)]"
                  >
                    + Crear manifiesto
                  </Link>
                )}
              </div>
            </div>
          ))}
          {puntosFiltrados.length === 0 && (
            <div className="col-span-full flex min-h-[30vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/60 bg-white/20 text-center backdrop-blur-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-blue-light)]">
                <PackageSearch className="h-6 w-6 text-[var(--brand-blue-dark)]" />
              </div>
              <p className="text-sm text-[var(--muted)]">
                {busqueda
                  ? "No se encontraron puntos de acopio que coincidan con tu búsqueda."
                  : "No hay puntos de acopio registrados."}
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

      {mostrarForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/20 px-4 py-8 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-full overflow-y-auto rounded-2xl border border-white/50 bg-white/70 p-6 shadow-2xl backdrop-blur-xl backdrop-saturate-150">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editId ? "Editar punto de acopio" : "Nuevo punto de acopio"}
              </h2>
              <button onClick={cerrarForm}>
                <X className="h-5 w-5 text-[var(--muted)]" />
              </button>
            </div>
            <form onSubmit={guardar} className="space-y-3">
              <Campo label="Nombre">
                <input
                  required
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="input"
                />
              </Campo>
              <Campo label="Dirección">
                <input
                  required
                  value={form.direccion}
                  onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                  className="input"
                />
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Municipio">
                  <input
                    value={form.zona}
                    onChange={(e) => setForm({ ...form, zona: e.target.value })}
                    className="input"
                  />
                </Campo>
                <Campo label="Estado">
                  <input
                    value={form.estado}
                    onChange={(e) => setForm({ ...form, estado: e.target.value })}
                    className="input"
                  />
                </Campo>
              </div>
              <Campo label="Materiales aceptados">
                <input
                  required
                  placeholder="papel, cartón, plástico PET, aluminio"
                  value={form.materiales}
                  onChange={(e) => setForm({ ...form, materiales: e.target.value })}
                  className="input"
                />
              </Campo>
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Responsable">
                  <input
                    value={form.responsable}
                    onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                    className="input"
                  />
                </Campo>
                <Campo label="Contacto">
                  <input
                    value={form.contacto}
                    onChange={(e) => setForm({ ...form, contacto: e.target.value })}
                    className="input"
                  />
                </Campo>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.activo}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                />
                Activo
              </label>
              <p className="text-[11px] text-[var(--muted)]">
                Dirección, municipio y estado pueden sobrescribirse en la próxima sincronización
                con Notion.
              </p>
              <button
                type="submit"
                disabled={guardando}
                className="w-full rounded-xl bg-[var(--brand-blue)] py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {guardando ? "Guardando…" : "Guardar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
