"use client";

import { useEffect, useState } from "react";
import { PERMISOS_KEYS, PERMISOS_LABELS } from "@/lib/roles";
import { usePermisos } from "@/lib/role-context";

type Role = {
  id: string;
  nombre: string;
  esSistema: boolean;
  puntosAcopio: boolean;
  fechasAcopio: boolean;
  sincronizarNotion: boolean;
  configuracion: boolean;
  _count: { usuarios: number };
};

const FORM_INICIAL = {
  nombre: "",
  puntosAcopio: false,
  fechasAcopio: false,
  sincronizarNotion: false,
  configuracion: false,
};

export default function RolesPage() {
  const permisos = usePermisos();
  const [roles, setRoles] = useState<Role[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState<string | null>(null);

  async function cargarRoles() {
    setCargando(true);
    const res = await fetch("/api/roles");
    const data = await res.json();
    setRoles(data);
    setCargando(false);
  }

  useEffect(() => {
    cargarRoles();
  }, []);

  if (!permisos.configuracion) {
    return <p className="text-sm text-foreground/60">No autorizado.</p>;
  }

  function abrirNuevo() {
    setEditId(null);
    setForm(FORM_INICIAL);
    setError(null);
    setMostrarForm(true);
  }

  function abrirEdicion(role: Role) {
    setEditId(role.id);
    setForm({
      nombre: role.nombre,
      puntosAcopio: role.puntosAcopio,
      fechasAcopio: role.fechasAcopio,
      sincronizarNotion: role.sincronizarNotion,
      configuracion: role.configuracion,
    });
    setError(null);
    setMostrarForm(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const url = editId ? `/api/roles/${editId}` : "/api/roles";
    const method = editId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "No se pudo guardar el rol");
      return;
    }
    setMostrarForm(false);
    await cargarRoles();
  }

  async function eliminar(role: Role) {
    if (!confirm(`¿Eliminar el rol "${role.nombre}"?`)) return;
    const res = await fetch(`/api/roles/${role.id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "No se pudo eliminar el rol");
      return;
    }
    await cargarRoles();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Roles</h1>
        <button
          onClick={abrirNuevo}
          className="rounded-xl bg-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-[var(--accent-foreground)] shadow-sm"
        >
          + Nuevo rol
        </button>
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="grid grid-cols-1 gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4 sm:grid-cols-2"
        >
          <label className="space-y-1 text-sm sm:col-span-2">
            <span className="font-medium">Nombre</span>
            <input
              required
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="input"
            />
          </label>
          <div className="grid grid-cols-1 gap-2 sm:col-span-2 sm:grid-cols-2">
            {PERMISOS_KEYS.map((key) => (
              <label key={key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                />
                {PERMISOS_LABELS[key]}
              </label>
            ))}
          </div>
          {error && <p className="text-sm text-red-500 sm:col-span-2">{error}</p>}
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
              className="rounded-xl border border-white/50 bg-white/40 backdrop-blur-md px-3 py-2 text-sm hover:bg-white/60"
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
                {PERMISOS_KEYS.map((key) => (
                  <th key={key} className="px-3 py-2">
                    {PERMISOS_LABELS[key]}
                  </th>
                ))}
                <th className="px-3 py-2">Usuarios</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <tr key={role.id} className="border-t border-white/50">
                  <td className="px-3 py-2 font-medium">
                    {role.nombre}
                    {role.esSistema && (
                      <span className="ml-2 text-xs font-normal text-foreground/60">
                        (Rol del sistema)
                      </span>
                    )}
                  </td>
                  {PERMISOS_KEYS.map((key) => (
                    <td key={key} className="px-3 py-2">
                      {role[key] ? "Sí" : "No"}
                    </td>
                  ))}
                  <td className="px-3 py-2">{role._count.usuarios}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {!role.esSistema && (
                      <>
                        <button
                          onClick={() => abrirEdicion(role)}
                          className="mr-2 text-[var(--brand-blue)] hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => eliminar(role)}
                          className="text-red-500 hover:underline"
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
              {roles.length === 0 && (
                <tr>
                  <td colSpan={PERMISOS_KEYS.length + 3} className="px-3 py-6 text-center text-foreground/60">
                    No hay roles registrados.
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
