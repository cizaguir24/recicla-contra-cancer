"use client";

import { useEffect, useState } from "react";
import { usePermisos } from "@/lib/role-context";

type Usuario = {
  id: string;
  name: string;
  email: string;
  role: { id: string; nombre: string };
  activo: boolean;
};

type Role = { id: string; nombre: string };

const FORM_INICIAL = {
  name: "",
  email: "",
  password: "",
  roleId: "",
  activo: true,
};

export default function UsuariosPage() {
  const permisos = usePermisos();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [error, setError] = useState<string | null>(null);

  async function cargarUsuarios() {
    setCargando(true);
    const [resUsuarios, resRoles] = await Promise.all([
      fetch("/api/usuarios"),
      fetch("/api/roles"),
    ]);
    setUsuarios(await resUsuarios.json());
    setRoles(await resRoles.json());
    setCargando(false);
  }

  useEffect(() => {
    cargarUsuarios();
  }, []);

  if (!permisos.configuracion) {
    return <p className="text-sm text-foreground/60">No autorizado.</p>;
  }

  function abrirNuevo() {
    setEditId(null);
    setForm({ ...FORM_INICIAL, roleId: roles[0]?.id ?? "" });
    setError(null);
    setMostrarForm(true);
  }

  function abrirEdicion(usuario: Usuario) {
    setEditId(usuario.id);
    setForm({
      name: usuario.name,
      email: usuario.email,
      password: "",
      roleId: usuario.role.id,
      activo: usuario.activo,
    });
    setError(null);
    setMostrarForm(true);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const url = editId ? `/api/usuarios/${editId}` : "/api/usuarios";
    const method = editId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "No se pudo guardar el usuario");
      return;
    }
    setMostrarForm(false);
    await cargarUsuarios();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este usuario?")) return;
    const res = await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      alert(data?.error ?? "No se pudo eliminar el usuario");
      return;
    }
    await cargarUsuarios();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Usuarios y Roles</h1>
        <button
          onClick={abrirNuevo}
          className="rounded-xl bg-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-[var(--accent-foreground)] shadow-sm"
        >
          + Nuevo usuario
        </button>
      </div>

      {mostrarForm && (
        <form
          onSubmit={guardar}
          className="grid grid-cols-1 gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4 sm:grid-cols-2"
        >
          <Campo label="Nombre">
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
            />
          </Campo>
          <Campo label="Email / usuario">
            <input
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
            />
          </Campo>
          <Campo label={editId ? "Contraseña (dejar en blanco para no cambiar)" : "Contraseña"}>
            <input
              type="password"
              required={!editId}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input"
            />
          </Campo>
          <Campo label="Rol">
            <select
              required
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              className="input"
            >
              <option value="" disabled>
                Selecciona un rol
              </option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.nombre}
                </option>
              ))}
            </select>
          </Campo>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              checked={form.activo}
              onChange={(e) => setForm({ ...form, activo: e.target.checked })}
            />
            Activo
          </label>
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
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">Rol</th>
                <th className="px-3 py-2">Activo</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((usuario) => (
                <tr key={usuario.id} className="border-t border-white/50">
                  <td className="px-3 py-2 font-medium">{usuario.name}</td>
                  <td className="px-3 py-2">{usuario.email}</td>
                  <td className="px-3 py-2">{usuario.role.nombre}</td>
                  <td className="px-3 py-2">{usuario.activo ? "Sí" : "No"}</td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <button
                      onClick={() => abrirEdicion(usuario)}
                      className="mr-2 text-[var(--brand-blue)] hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => eliminar(usuario.id)}
                      className="text-red-500 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-foreground/60">
                    No hay usuarios registrados.
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
