"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import {
  MapPin,
  User,
  Pencil,
  Trash2,
  PackageSearch,
  FileText,
  X,
  Map as MapIcon,
  Globe,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import { usePermisos } from "@/lib/role-context";
import SearchBar from "@/components/SearchBar";
import { coincideBusqueda } from "@/lib/texto";
import { limpiarDireccionDuplicada } from "@/lib/direccion";
import { componerDireccion, partesConsistentes } from "@/lib/direccion-compuesta";

const PuntosAcopioMap = dynamic(() => import("@/components/PuntosAcopioMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-xl border border-white/60 bg-white/20 text-sm text-[var(--muted)] sm:h-96">
      Cargando mapa…
    </div>
  ),
});

type PuntoAcopio = {
  id: string;
  nombre: string;
  direccion: string;
  calle: string | null;
  numeroExterior: string | null;
  numeroInterior: string | null;
  notionPageId: string | null;
  zona: string | null;
  estado: string | null;
  materiales: string;
  responsable: string | null;
  contacto: string | null;
  // "Pública"/"Privada" (de Notion); NULL se trata como pública.
  visibilidad: string | null;
  googleMapsUrl: string | null;
  activo: boolean;
  lat: number | null;
  lng: number | null;
};

const FORM_INICIAL = {
  nombre: "",
  direccion: "",
  calle: "",
  numeroExterior: "",
  numeroInterior: "",
  zona: "",
  estado: "",
  materiales: "",
  responsable: "",
  contacto: "",
  visibilidad: "Pública",
  googleMapsUrl: "",
  activo: true,
};

const MATERIALES_OPCIONES = ["Tapas", "PET", "Aluminio"];

function materialesDesdeString(materiales: string): string[] {
  const partes = materiales.split(",").map((s) => s.trim().toLowerCase());
  return MATERIALES_OPCIONES.filter((op) => partes.includes(op.toLowerCase()));
}

export default function PuntosAcopioPage() {
  const { puntosAcopio: esAdmin, esAdministrador } = usePermisos();
  const [puntos, setPuntos] = useState<PuntoAcopio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [guardando, setGuardando] = useState(false);
  // El punto en edición viene de Notion / sus partes de dirección se editan por separado.
  const [editaVinculado, setEditaVinculado] = useState(false);
  const [editaPorPartes, setEditaPorPartes] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [filtroVisibilidad, setFiltroVisibilidad] = useState<"todos" | "publicas" | "privadas">("todos");
  const [filtroActivo, setFiltroActivo] = useState<"activos" | "inactivos" | "todos">("activos");
  const [mostrarMapa, setMostrarMapa] = useState(true);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [ubicacionEditando, setUbicacionEditando] = useState<{
    lat: number | null;
    lng: number | null;
  } | null>(null);

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

  function copiarLinkPublico() {
    const url = `${window.location.origin}/publico/puntos-acopio`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopiado(true);
      setTimeout(() => setLinkCopiado(false), 2000);
    });
  }

  function abrirNuevo() {
    setEditId(null);
    setForm(FORM_INICIAL);
    setEditaVinculado(false);
    setEditaPorPartes(false);
    setUbicacionEditando(null);
    setMostrarForm(true);
  }

  function abrirEdicion(punto: PuntoAcopio) {
    setEditId(punto.id);
    setForm({
      nombre: punto.nombre,
      direccion: punto.direccion,
      calle: punto.calle ?? "",
      numeroExterior: punto.numeroExterior ?? "",
      numeroInterior: punto.numeroInterior ?? "",
      zona: punto.zona ?? "",
      estado: punto.estado ?? "",
      materiales: punto.materiales,
      responsable: punto.responsable ?? "",
      contacto: punto.contacto ?? "",
      visibilidad: punto.visibilidad ?? "Pública",
      googleMapsUrl: punto.googleMapsUrl ?? "",
      activo: punto.activo,
    });
    setEditaVinculado(!!punto.notionPageId);
    setEditaPorPartes(partesConsistentes(punto));
    setUbicacionEditando({ lat: punto.lat, lng: punto.lng });
    setMostrarForm(true);
  }

  function cerrarForm() {
    setMostrarForm(false);
    setEditId(null);
    setForm(FORM_INICIAL);
    setEditaVinculado(false);
    setEditaPorPartes(false);
    setUbicacionEditando(null);
  }

  function alternarMaterial(material: string) {
    const actuales = materialesDesdeString(form.materiales);
    const nuevos = actuales.includes(material)
      ? actuales.filter((m) => m !== material)
      : [...actuales, material];
    const ordenados = MATERIALES_OPCIONES.filter((op) => nuevos.includes(op));
    setForm({ ...form, materiales: ordenados.join(", ") });
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    if (materialesDesdeString(form.materiales).length === 0) {
      alert("Selecciona al menos un material aceptado.");
      return;
    }
    setGuardando(true);
    const url = editId ? `/api/puntos-acopio/${editId}` : "/api/puntos-acopio";
    const method = editId ? "PATCH" : "POST";
    // Con partes de dirección se mandan calle/números (el servidor arma
    // `direccion`); sin ellas se manda `direccion` como una sola cadena.
    const { calle, numeroExterior, numeroInterior, direccion, ...resto } = form;
    const payload =
      editId && editaPorPartes
        ? { ...resto, calle, numeroExterior, numeroInterior }
        : { ...resto, direccion };
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setGuardando(false);
    cerrarForm();
    await cargarPuntos();
    if (res.headers.get("X-Notion-Sync") === "error") {
      alert(
        "Se guardó en la app, pero no se pudo reflejar en Notion. El próximo \"Sincronizar con Notion\" podría revertir ese cambio.",
      );
    } else if (res.headers.get("X-Geocode") === "fallo") {
      alert(
        "Se guardó, pero no se pudo ubicar la nueva dirección en el mapa. Se conservó la ubicación anterior.",
      );
    }
  }

  async function eliminar(ev: React.MouseEvent, id: string) {
    ev.stopPropagation();
    if (!confirm("¿Eliminar este punto de acopio? También se eliminarán sus fechas asociadas."))
      return;
    await fetch(`/api/puntos-acopio/${id}`, { method: "DELETE" });
    await cargarPuntos();
  }

  // Mismos filtros que puntosFiltrados, salvo el de activo/inactivo: sirve
  // para que las tarjetas de conteo siempre muestren cuántos hay de cada
  // uno (no se vacían entre sí cuando una ya está seleccionada).
  const puntosSinFiltroActivo = useMemo(() => {
    return puntos.filter((p) => {
      if (busqueda && !coincideBusqueda(busqueda, p.nombre, p.zona, p.responsable)) return false;
      // Sin "Privada" explícito en Notion/el formulario, el punto sigue
      // siendo público — así no desaparece nada de lo que ya existía antes
      // de este campo.
      const esPrivada = p.visibilidad === "Privada";
      if (filtroVisibilidad === "publicas" && esPrivada) return false;
      if (filtroVisibilidad === "privadas" && !esPrivada) return false;
      return true;
    });
  }, [puntos, busqueda, filtroVisibilidad]);

  const totalActivos = useMemo(
    () => puntosSinFiltroActivo.filter((p) => p.activo).length,
    [puntosSinFiltroActivo],
  );
  const totalInactivos = useMemo(
    () => puntosSinFiltroActivo.filter((p) => !p.activo).length,
    [puntosSinFiltroActivo],
  );

  const puntosFiltrados = useMemo(() => {
    return puntosSinFiltroActivo.filter((p) => {
      if (filtroActivo === "activos" && !p.activo) return false;
      if (filtroActivo === "inactivos" && p.activo) return false;
      return true;
    });
  }, [puntosSinFiltroActivo, filtroActivo]);

  function alternarFiltroActivo(valor: "activos" | "inactivos") {
    setFiltroActivo((actual) => (actual === valor ? "todos" : valor));
  }

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMostrarMapa((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-[var(--brand-blue)] hover:bg-white/40"
          >
            <MapIcon className="h-4 w-4" /> {mostrarMapa ? "Ocultar mapa" : "Ver mapa"}
          </button>
          {esAdmin && (
            <button
              onClick={abrirNuevo}
              className="rounded-xl bg-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-[var(--accent-foreground)] shadow-sm"
            >
              + Nuevo punto
            </button>
          )}
        </div>
      </div>

      {mostrarMapa && <PuntosAcopioMap puntos={puntosFiltrados} />}

      <div className="grid grid-cols-2 gap-3 sm:max-w-md">
        <button
          type="button"
          onClick={() => alternarFiltroActivo("activos")}
          title={filtroActivo === "activos" ? "Quitar filtro" : "Ver solo activos"}
          className={`flex items-center gap-3 rounded-xl border p-4 text-left backdrop-blur-md transition-colors ${
            filtroActivo === "activos"
              ? "border-green-400 bg-green-50"
              : "border-white/50 bg-white/40 hover:bg-white/60"
          }`}
        >
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-green-500" />
          <span>
            <span className="block text-2xl font-semibold text-green-600">{totalActivos}</span>
            <span className="block text-sm text-foreground/60">Activos</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => alternarFiltroActivo("inactivos")}
          title={filtroActivo === "inactivos" ? "Quitar filtro" : "Ver solo inactivos"}
          className={`flex items-center gap-3 rounded-xl border p-4 text-left backdrop-blur-md transition-colors ${
            filtroActivo === "inactivos"
              ? "border-gray-400 bg-gray-100"
              : "border-white/50 bg-white/40 hover:bg-white/60"
          }`}
        >
          <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full bg-gray-400" />
          <span>
            <span className="block text-2xl font-semibold text-gray-600">{totalInactivos}</span>
            <span className="block text-sm text-foreground/60">Inactivos</span>
          </span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={busqueda} onChange={setBusqueda} className="sm:max-w-md" />
        <select
          value={filtroVisibilidad}
          onChange={(e) => setFiltroVisibilidad(e.target.value as typeof filtroVisibilidad)}
          className="input !w-auto"
        >
          <option value="todos">Públicas y privadas</option>
          <option value="publicas">Solo públicas</option>
          <option value="privadas">Solo privadas</option>
        </select>
        <Link
          href="/publico/puntos-acopio"
          target="_blank"
          className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-white/40"
        >
          <Globe className="h-3.5 w-3.5" /> Mapa público
        </Link>
        <button
          type="button"
          onClick={copiarLinkPublico}
          className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-white/40"
        >
          {linkCopiado ? (
            <Check className="h-3.5 w-3.5 text-green-600" />
          ) : (
            <Copy className="h-3.5 w-3.5" />
          )}
          {linkCopiado ? "Link copiado" : "Copiar link"}
        </button>
        <Link
          href="/puntos-acopio/privados"
          className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-white/40"
        >
          <EyeOff className="h-3.5 w-3.5" /> Mapa privados
        </Link>
      </div>

      {cargando ? (
        <p className="text-sm text-foreground/60">Cargando...</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {puntosFiltrados.map((p) => (
            <div key={p.id} className="glass-card p-4 backdrop-saturate-150">
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
                  {p.visibilidad === "Privada" && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      Privada
                    </span>
                  )}
                  {esAdmin && (
                    <button
                      onClick={() => abrirEdicion(p)}
                      title="Editar"
                      className="rounded p-1 text-[var(--muted)] hover:bg-white/60 hover:text-[var(--brand-blue)]"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {esAdministrador && (
                    <button
                      onClick={(ev) => eliminar(ev, p.id)}
                      title="Eliminar"
                      className="rounded p-1 text-[var(--muted)] hover:bg-red-50 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="mb-3">
                <p className="flex items-start gap-1 text-xs text-[var(--muted)]">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    {p.direccion ? limpiarDireccionDuplicada(p.direccion) : "Sin dirección"}
                    {p.zona ? `, ${p.zona}` : ""}
                    {p.estado ? `, ${p.estado}` : ""}
                  </span>
                </p>
                {p.googleMapsUrl && (
                  <a
                    href={p.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-[var(--brand-blue)] hover:underline"
                  >
                    <MapIcon className="h-3 w-3 shrink-0" /> Ver en Google Maps
                  </a>
                )}
              </div>

              <div className="glass-row mb-2 p-3 text-xs">
                <p className="text-[var(--text-secondary)]">Materiales</p>
                <p className="font-medium text-[var(--text-primary)]">{p.materiales}</p>
              </div>

              {(p.responsable || p.contacto) && (
                <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-[var(--muted)]">
                  {p.responsable && <span>{p.responsable}</span>}
                  {p.contacto && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3 shrink-0" /> {p.contacto}
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
                  : filtroActivo !== "todos"
                    ? `No hay puntos de acopio ${filtroActivo === "activos" ? "activos" : "inactivos"}.`
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
        <div className="fixed inset-0 z-[1100] flex items-start justify-center overflow-y-auto bg-black/20 px-4 py-8 backdrop-blur-sm">
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
              {editId && editaPorPartes ? (
                <>
                  <Campo label="Calle">
                    <input
                      value={form.calle}
                      onChange={(e) => setForm({ ...form, calle: e.target.value })}
                      className="input"
                    />
                  </Campo>
                  <div className="grid grid-cols-2 gap-3">
                    <Campo label="Número exterior">
                      <input
                        value={form.numeroExterior}
                        onChange={(e) => setForm({ ...form, numeroExterior: e.target.value })}
                        className="input"
                      />
                    </Campo>
                    <Campo label="Número interior">
                      <input
                        value={form.numeroInterior}
                        onChange={(e) => setForm({ ...form, numeroInterior: e.target.value })}
                        className="input"
                      />
                    </Campo>
                  </div>
                  <p className="text-[11px] text-[var(--muted)]">
                    Dirección: {componerDireccion(form) || "—"}
                  </p>
                </>
              ) : (
                <Campo label="Dirección">
                  <input
                    required
                    value={form.direccion}
                    onChange={(e) => setForm({ ...form, direccion: e.target.value })}
                    className="input"
                  />
                </Campo>
              )}
              {editId && (
                <PuntosAcopioMap
                  puntos={ubicacionEditando ? [{ id: editId, nombre: form.nombre, direccion: editaPorPartes ? componerDireccion(form) : form.direccion, zona: form.zona || null, ...ubicacionEditando }] : []}
                  className="h-40"
                  zoom={14}
                  scrollWheelZoom={false}
                  mensajeVacio="Este punto todavía no tiene ubicación geocodificada."
                />
              )}
              <Campo label="URL de Google Maps (opcional)">
                <input
                  type="url"
                  placeholder="https://maps.app.goo.gl/..."
                  value={form.googleMapsUrl}
                  onChange={(e) => setForm({ ...form, googleMapsUrl: e.target.value })}
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
              <div className="space-y-1 text-sm">
                <span className="font-medium">Materiales aceptados</span>
                <div className="flex flex-wrap gap-4 pt-1">
                  {MATERIALES_OPCIONES.map((material) => (
                    <label key={material} className="flex items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={materialesDesdeString(form.materiales).includes(material)}
                        onChange={() => alternarMaterial(material)}
                      />
                      {material}
                    </label>
                  ))}
                </div>
              </div>
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
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Visibilidad">
                  <select
                    value={form.visibilidad}
                    onChange={(e) => setForm({ ...form, visibilidad: e.target.value })}
                    className="input"
                  >
                    <option value="Pública">Pública</option>
                    <option value="Privada">Privada</option>
                  </select>
                </Campo>
                <label className="flex items-center gap-2 self-end pb-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.activo}
                    onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                  />
                  Activo
                </label>
              </div>
              {editId && editaPorPartes ? (
                <p className="text-[11px] text-[var(--muted)]">
                  Nombre, calle, números, municipio, estado, contacto, URL de Google Maps,
                  materiales y visibilidad también se actualizan en Notion. Si cambias la
                  dirección, el punto se vuelve a ubicar en el mapa.
                </p>
              ) : editId && editaVinculado ? (
                <p className="text-[11px] text-[var(--muted)]">
                  Nombre, municipio, estado, contacto, URL de Google Maps, materiales y
                  visibilidad también se actualizan en Notion. La dirección puede sobrescribirse
                  en la próxima sincronización con Notion.
                </p>
              ) : null}
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
