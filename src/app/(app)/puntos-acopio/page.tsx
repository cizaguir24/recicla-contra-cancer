"use client";

import { useEffect, useState } from "react";
import { usePermisos } from "@/lib/role-context";

type PuntoAcopio = {
  id: string;
  nombre: string;
  direccion: string;
  zona: string | null;
  materiales: string;
  responsable: string | null;
  contacto: string | null;
  activo: boolean;
};

const FORM_INICIAL = {
  nombre: "",
  direccion: "",
  zona: "",
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

  async function cargarPuntos() {
    setCargando(true);
    const res = await fetch("/api/puntos-acopio");
    const data = await res.json();
    setPuntos(data);
    setCargando(false);
  }

  useEffect(() => {
    cargarPuntos();
  }, []);

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
      materiales: punto.materiales,
      responsable: punto.responsable ?? "",
      contacto: punto.contacto ?? "",
      activo: punto.activo,
    });
    setMostrarForm(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    const url = editId ? `/api/puntos-acopio/${editId}` : "/api/puntos-acopio";
    const method = editId ? "PATCH" : "POST";
    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setMostrarForm(false);
    await cargarPuntos();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este punto de acopio? También se eliminarán sus fechas asociadas."))
      return;
    await fetch(`/api/puntos-acopio/${id}`, { method: "DELETE" });
    await cargarPuntos();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Puntos de Acopio</h1>
        {esAdmin && (
          <button
            onClick={abrirNuevo}
            className="rounded-xl bg-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-[var(--accent-foreground)] shadow-sm"
          >
            + Nuevo punto
          </button>
        )}
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="grid grid-cols-1 gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4 sm:grid-cols-2"
        >
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
          <Campo label="Zona">
            <input
              value={form.zona}
              onChange={(e) => setForm({ ...form, zona: e.target.value })}
              className="input"
            />
          </Campo>
          <Campo label="Materiales aceptados">
            <input
              required
              placeholder="papel, cartón, plástico PET, aluminio"
              value={form.materiales}
              onChange={(e) => setForm({ ...form, materiales: e.target.value })}
              className="input"
            />
          </Campo>
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
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Activo
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
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Dirección</th>
                <th className="px-3 py-2">Zona</th>
                <th className="px-3 py-2">Materiales</th>
                <th className="px-3 py-2">Activo</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {puntos.map((punto) => (
                <tr key={punto.id} className="border-t border-white/50">
                  <td className="px-3 py-2 font-medium">{punto.nombre}</td>
                  <td className="px-3 py-2">{punto.direccion}</td>
                  <td className="px-3 py-2">{punto.zona}</td>
                  <td className="px-3 py-2">{punto.materiales}</td>
                  <td className="px-3 py-2">{punto.activo ? "Sí" : "No"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {esAdmin && (
                      <>
                        <button
                          onClick={() => abrirEdicion(punto)}
                          className="mr-2 text-[var(--brand-blue)] hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminar(punto.id)}
                          className="text-red-500 hover:underline"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {puntos.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-foreground/60">
                    No hay puntos de acopio registrados.
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

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}
