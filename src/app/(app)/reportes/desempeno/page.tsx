"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Phone, Mail, PackageSearch, Pencil, X, Search, AlertTriangle } from "lucide-react";
import { usePermisos } from "@/lib/role-context";
import SearchBar from "@/components/SearchBar";
import { coincideBusqueda } from "@/lib/texto";
import { descargarCSV } from "@/lib/csv";

type EstadoDesempeno = "VERDE" | "AMARILLO" | "ROJO";
type ColorEstado = "green" | "amber" | "red";

const OPCIONES_TIPO_CONTENEDOR = [
  "Centro de Acopio",
  "Corazón Alen",
  "TapaBox",
  "Corazón Tlajomulco",
  "PET",
  "Contenedor Propio",
];

const OPCIONES_DECISION_REUBICACION = ["Sin revisar", "Mantener", "Dar seguimiento", "Reubicar"];

// Meta anual de referencia (6 recolecciones) — el estado real se evalúa
// contra una meta prorrateada por mes del año en curso, no este valor fijo
// (ver src/lib/desempeno-data.ts, misma lógica en el servidor).
const META_ANUAL = 6;

const ESTADO_INFO: Record<EstadoDesempeno, { etiqueta: string; color: ColorEstado }> = {
  VERDE: { etiqueta: "Verde", color: "green" },
  AMARILLO: { etiqueta: "Amarillo", color: "amber" },
  ROJO: { etiqueta: "Rojo", color: "red" },
};

type FilaDesempeno = {
  id: string;
  nombre: string;
  activo: boolean;
  municipio: string | null;
  responsable: string | null;
  tipoContenedor: string | null;
  decisionReubicacion: string | null;
  numeroCelular: string | null;
  correoElectronico: string | null;

  periodoInicio: string;
  periodoFin: string;
  totalRecolecciones: number;
  metaAnual: number;
  metaPeriodo: number;
  estado: EstadoDesempeno;
  cumplimientoPeriodo: number | null;

  primeraRecoleccionRegistrada: string | null;

  ultimaRecoleccion: string | null;
  diasSinRecoleccion: number | null;
  alertaContacto: boolean;

  kgTapasPeriodo: number | null;
};

type Totales = Record<EstadoDesempeno, number> & { requierenContacto: number };

const SIN_CONTENEDOR = "__sin_contenedor__";

const DOT_CLASES: Record<ColorEstado, string> = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
};

const BADGE_CLASES: Record<ColorEstado, string> = {
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
};

const TEXTO_CLASES: Record<ColorEstado, string> = {
  green: "text-green-600",
  amber: "text-amber-600",
  red: "text-red-600",
};

function Punto({ color }: { color: ColorEstado }) {
  return <span className={`inline-block h-2.5 w-2.5 rounded-full ${DOT_CLASES[color]}`} />;
}

function fmtFecha(iso: string | null) {
  return iso ? iso.slice(0, 10) : "—";
}

function fmtKg(kg: number | null) {
  return kg === null ? "Sin datos" : `${kg.toFixed(2)} kg`;
}

function exportarCSV(filas: FilaDesempeno[]) {
  descargarCSV(
    `desempeno-puntos-acopio-${new Date().toISOString().slice(0, 10)}.csv`,
    [
      "Punto de acopio",
      "Activo",
      "Municipio",
      "Tipo de contenedor",
      "Estado",
      "Recolecciones (año en curso)",
      "Meta a la fecha",
      "Meta anual",
      "Cumplimiento",
      "Primera recolección registrada",
      "Última recolección",
      "Días sin recolección",
      "Requiere contacto",
      "Kgs Tapas (periodo)",
      "Decisión de Reubicación (Notion)",
      "Número Celular",
      "Correo electrónico",
    ],
    filas.map((f) => [
      f.nombre,
      f.activo ? "Sí" : "No",
      f.municipio ?? "",
      f.tipoContenedor ?? "",
      ESTADO_INFO[f.estado].etiqueta,
      f.totalRecolecciones,
      f.metaPeriodo,
      f.metaAnual,
      f.cumplimientoPeriodo !== null ? `${f.cumplimientoPeriodo.toFixed(0)}%` : "",
      fmtFecha(f.primeraRecoleccionRegistrada),
      fmtFecha(f.ultimaRecoleccion),
      f.diasSinRecoleccion ?? "",
      f.alertaContacto ? "Sí" : "No",
      f.kgTapasPeriodo !== null ? f.kgTapasPeriodo.toFixed(2) : "",
      f.decisionReubicacion ?? "",
      f.numeroCelular ?? "",
      f.correoElectronico ?? "",
    ]),
  );
}

const FORM_EDICION_VACIO = {
  nombre: "",
  zona: "",
  tipoContenedor: "",
  decisionReubicacion: "",
  numeroCelular: "",
  correoElectronico: "",
};

type PuntoResumen = {
  id: string;
  nombre: string;
  direccion: string;
  responsable: string | null;
  tipoContenedor: string | null;
  activo: boolean;
};

type MovimientoHistorial = {
  id: string;
  puntoOrigen: { nombre: string };
  puntoDestino: { nombre: string };
  tipoContenedor: string;
  motivo: string | null;
  usuario: { name: string };
  createdAt: string;
};

export default function DesempenoPage() {
  const { puntosAcopio: esAdmin } = usePermisos();
  const [filas, setFilas] = useState<FilaDesempeno[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroContenedor, setFiltroContenedor] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"" | EstadoDesempeno>("");
  const [filtroActivo, setFiltroActivo] = useState<"" | "activo" | "inactivo">("");
  const [soloConAlerta, setSoloConAlerta] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_EDICION_VACIO);
  const [guardando, setGuardando] = useState(false);

  const [puntosActivos, setPuntosActivos] = useState<PuntoResumen[] | null>(null);
  const [destinoId, setDestinoId] = useState<string | null>(null);
  const [busquedaDestino, setBusquedaDestino] = useState("");
  const [mostrarListaDestino, setMostrarListaDestino] = useState(false);
  const [motivoReubicacion, setMotivoReubicacion] = useState("");
  const [errorReubicacion, setErrorReubicacion] = useState<string | null>(null);
  const [historial, setHistorial] = useState<MovimientoHistorial[] | null>(null);

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
    setDestinoId(null);
    setBusquedaDestino("");
    setMostrarListaDestino(false);
    setMotivoReubicacion("");
    setErrorReubicacion(null);
    setPuntosActivos(null);
    setHistorial(null);
    fetch(`/api/puntos-acopio/${f.id}/reubicar`)
      .then((r) => r.json())
      .then(setHistorial)
      .catch(() => setHistorial([]));
  }

  function cerrarEdicion() {
    setEditandoId(null);
    setForm(FORM_EDICION_VACIO);
    setDestinoId(null);
    setBusquedaDestino("");
    setMostrarListaDestino(false);
    setMotivoReubicacion("");
    setErrorReubicacion(null);
    setPuntosActivos(null);
    setHistorial(null);
  }

  function cambiarDecisionReubicacion(valor: string) {
    setForm((f) => ({ ...f, decisionReubicacion: valor }));
    setErrorReubicacion(null);
    if (valor !== "Reubicar") {
      setDestinoId(null);
      setBusquedaDestino("");
      setMostrarListaDestino(false);
      return;
    }
    if (puntosActivos === null) {
      fetch("/api/puntos-acopio")
        .then((r) => r.json())
        .then(setPuntosActivos);
    }
  }

  async function guardarEdicion(e: React.FormEvent) {
    e.preventDefault();
    if (!editandoId) return;

    if (form.decisionReubicacion === "Reubicar") {
      await confirmarYReubicar();
      return;
    }

    setGuardando(true);
    const res = await fetch(`/api/puntos-acopio/${editandoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setGuardando(false);
    cerrarEdicion();
    await cargar();
    if (res.headers.get("X-Notion-Sync") === "error") {
      alert(
        "Se guardó en la app, pero no se pudo reflejar en Notion. El próximo \"Sincronizar con Notion\" podría revertir ese cambio.",
      );
    }
  }

  async function confirmarYReubicar() {
    if (!editandoId) return;
    setErrorReubicacion(null);

    if (!destinoId) {
      setErrorReubicacion("Selecciona el nuevo punto de acopio destino.");
      return;
    }

    const origenActual = filas.find((f) => f.id === editandoId);
    if (!origenActual?.tipoContenedor) {
      setErrorReubicacion("Este punto no tiene un contenedor asignado para reubicar.");
      return;
    }

    const destinoNombre = puntosActivos?.find((p) => p.id === destinoId)?.nombre ?? "";
    const confirmado = confirm(
      `El contenedor se reubicará de "${origenActual.nombre}" a "${destinoNombre}". La ubicación anterior quedará inactiva o sin contenedor asignado. ¿Deseas continuar?`,
    );
    if (!confirmado) return;

    setGuardando(true);
    try {
      const res = await fetch(`/api/puntos-acopio/${editandoId}/reubicar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puntoDestinoId: destinoId, motivo: motivoReubicacion || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErrorReubicacion(data.error || "No se pudo reubicar el contenedor.");
        return;
      }
      cerrarEdicion();
      await cargar();
      alert(
        "Contenedor reubicado correctamente. La ubicación anterior quedó sin contenedor y la nueva ubicación fue actualizada.",
      );
    } finally {
      setGuardando(false);
    }
  }

  const opcionesDestino = useMemo(() => {
    if (!puntosActivos) return [];
    return puntosActivos.filter(
      (p) =>
        p.activo &&
        p.id !== editandoId &&
        (!busquedaDestino || coincideBusqueda(busquedaDestino, p.nombre, p.direccion, p.responsable)),
    );
  }, [puntosActivos, editandoId, busquedaDestino]);

  const destinoSeleccionado = useMemo(
    () => puntosActivos?.find((p) => p.id === destinoId) ?? null,
    [puntosActivos, destinoId],
  );

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
    if (filtroEstado) {
      resultado = resultado.filter((f) => f.estado === filtroEstado);
    }
    if (filtroActivo) {
      resultado = resultado.filter((f) => (filtroActivo === "activo" ? f.activo : !f.activo));
    }
    if (soloConAlerta) {
      resultado = resultado.filter((f) => f.alertaContacto);
    }
    if (busqueda) {
      resultado = resultado.filter((f) =>
        coincideBusqueda(busqueda, f.nombre, f.municipio, f.responsable),
      );
    }
    return resultado;
  }, [filas, filtroContenedor, filtroEstado, filtroActivo, soloConAlerta, busqueda]);

  // La meta a la fecha es la misma para todos los puntos (depende del mes
  // actual, no de cada punto) — se toma de cualquier fila ya cargada; antes
  // de cargar, se estima con el mes del navegador solo para no mostrar un
  // 0 en el instante inicial.
  const metaPeriodoActual = filas[0]?.metaPeriodo ?? Math.floor((new Date().getMonth() + 1) / 2);

  const totales = useMemo<Totales>(
    () => ({
      VERDE: filtradas.filter((f) => f.estado === "VERDE").length,
      AMARILLO: filtradas.filter((f) => f.estado === "AMARILLO").length,
      ROJO: filtradas.filter((f) => f.estado === "ROJO").length,
      requierenContacto: filtradas.filter((f) => f.alertaContacto).length,
    }),
    [filtradas],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Desempeño por Punto de Acopio</h1>
          <p className="flex flex-wrap items-center gap-1.5 text-sm text-foreground/60">
            Recolecciones realizadas en lo que va del año (meta anual: {META_ANUAL}, ~1 cada 2 meses). Hoy
            la meta a la fecha es {metaPeriodoActual}:
            <Punto color="red" /> {Math.max(0, metaPeriodoActual - 3)} o menos,
            <Punto color="amber" /> {Math.max(0, metaPeriodoActual - 2)} a {Math.max(0, metaPeriodoActual - 1)},
            <Punto color="green" /> {metaPeriodoActual} o más.
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

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
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
        <label className="space-y-1 text-sm sm:w-56">
          <span className="font-medium">Estado</span>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value as "" | EstadoDesempeno)}
            className="input"
          >
            <option value="">General (todos)</option>
            {(Object.keys(ESTADO_INFO) as EstadoDesempeno[]).map((e) => (
              <option key={e} value={e}>
                {ESTADO_INFO[e].etiqueta}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm sm:w-40">
          <span className="font-medium">Activo</span>
          <select
            value={filtroActivo}
            onChange={(e) => setFiltroActivo(e.target.value as "" | "activo" | "inactivo")}
            className="input"
          >
            <option value="">Todos</option>
            <option value="activo">Activos</option>
            <option value="inactivo">Inactivos</option>
          </select>
        </label>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            checked={soloConAlerta}
            onChange={(e) => setSoloConAlerta(e.target.checked)}
          />
          Solo con alerta de contacto
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(ESTADO_INFO) as EstadoDesempeno[]).map((e) => (
          <div
            key={e}
            className="flex items-center gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4"
          >
            <Punto color={ESTADO_INFO[e].color} />
            <div>
              <p className={`text-2xl font-semibold ${TEXTO_CLASES[ESTADO_INFO[e].color]}`}>{totales[e]}</p>
              <p className="text-sm text-foreground/60">{ESTADO_INFO[e].etiqueta}</p>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4">
          <AlertTriangle className="h-4 w-4 shrink-0 text-orange-500" />
          <div>
            <p className="text-2xl font-semibold text-orange-600">{totales.requierenContacto}</p>
            <p className="text-sm text-foreground/60">Requieren contacto</p>
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
                <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
                  <span
                    className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium ${BADGE_CLASES[ESTADO_INFO[f.estado].color]}`}
                  >
                    <Punto color={ESTADO_INFO[f.estado].color} /> {ESTADO_INFO[f.estado].etiqueta}
                  </span>
                  {!f.activo && (
                    <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                      Inactivo
                    </span>
                  )}
                  {f.alertaContacto && (
                    <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-medium text-orange-700">
                      <AlertTriangle className="h-2.5 w-2.5" /> Requiere contacto
                    </span>
                  )}
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
                  <p className="text-[var(--muted)]">Recolecciones (año en curso)</p>
                  <p className="font-medium text-[var(--foreground)]">
                    {f.totalRecolecciones} / {f.metaPeriodo} meta a la fecha
                  </p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">Cumplimiento a la fecha</p>
                  <p className="font-medium text-[var(--foreground)]">
                    {f.cumplimientoPeriodo !== null ? `${f.cumplimientoPeriodo.toFixed(0)}%` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">Primera recolección registrada</p>
                  <p className="font-medium text-[var(--foreground)]">{fmtFecha(f.primeraRecoleccionRegistrada)}</p>
                </div>
                <div>
                  <p className="text-[var(--muted)]">Kgs Tapas (periodo)</p>
                  <p className="font-medium text-[var(--foreground)]">{fmtKg(f.kgTapasPeriodo)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[var(--muted)]">Última recolección</p>
                  <p className="font-medium text-[var(--foreground)]">
                    {f.ultimaRecoleccion
                      ? `${fmtFecha(f.ultimaRecoleccion)} · hace ${f.diasSinRecoleccion} día${f.diasSinRecoleccion === 1 ? "" : "s"}`
                      : "Sin recolecciones"}
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
                  onChange={(e) => cambiarDecisionReubicacion(e.target.value)}
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

              {form.decisionReubicacion === "Reubicar" && (
                <div className="space-y-2 rounded-xl border border-[var(--brand-blue)]/40 bg-[var(--brand-blue-light)]/40 p-3">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">
                      Nuevo punto de acopio <span className="text-red-500">*</span>
                    </span>
                    {destinoSeleccionado ? (
                      <div className="flex items-start justify-between gap-2 rounded-lg border border-white/60 bg-white/70 p-2 text-xs">
                        <div>
                          <p className="font-medium text-[var(--foreground)]">{destinoSeleccionado.nombre}</p>
                          <p className="text-[var(--muted)]">{destinoSeleccionado.direccion}</p>
                          {destinoSeleccionado.responsable && (
                            <p className="text-[var(--muted)]">Responsable: {destinoSeleccionado.responsable}</p>
                          )}
                          <p className="text-[var(--muted)]">
                            {destinoSeleccionado.tipoContenedor
                              ? `Ya tiene contenedor: ${destinoSeleccionado.tipoContenedor}`
                              : "Sin contenedor asignado"}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setDestinoId(null);
                            setMostrarListaDestino(true);
                          }}
                          className="shrink-0 text-[var(--brand-blue)] hover:underline"
                        >
                          Cambiar
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                          <input
                            value={busquedaDestino}
                            onChange={(e) => {
                              setBusquedaDestino(e.target.value);
                              setMostrarListaDestino(true);
                            }}
                            onFocus={() => setMostrarListaDestino(true)}
                            placeholder="Buscar punto de acopio destino…"
                            className="input w-full pl-9"
                          />
                        </div>
                        {mostrarListaDestino && (
                          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-white/60 bg-white shadow-lg">
                            {puntosActivos === null ? (
                              <p className="p-2 text-xs text-[var(--muted)]">Cargando puntos de acopio…</p>
                            ) : opcionesDestino.length === 0 ? (
                              <p className="p-2 text-xs text-[var(--muted)]">Sin resultados.</p>
                            ) : (
                              opcionesDestino.map((p) => (
                                <button
                                  type="button"
                                  key={p.id}
                                  onClick={() => {
                                    setDestinoId(p.id);
                                    setMostrarListaDestino(false);
                                    setErrorReubicacion(null);
                                  }}
                                  className="block w-full border-b border-[var(--border)] p-2 text-left text-xs last:border-b-0 hover:bg-[var(--brand-blue-light)]"
                                >
                                  <p className="font-medium text-[var(--foreground)]">{p.nombre}</p>
                                  <p className="text-[var(--muted)]">{p.direccion}</p>
                                  {p.responsable && <p className="text-[var(--muted)]">Responsable: {p.responsable}</p>}
                                  <p className="text-[var(--muted)]">
                                    {p.tipoContenedor ? `Ya tiene contenedor: ${p.tipoContenedor}` : "Sin contenedor asignado"} · Activo
                                  </p>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium">Motivo de la reubicación (opcional)</span>
                    <input
                      value={motivoReubicacion}
                      onChange={(e) => setMotivoReubicacion(e.target.value)}
                      className="input"
                    />
                  </label>
                </div>
              )}

              {errorReubicacion && <p className="text-xs text-red-600">{errorReubicacion}</p>}

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
                {guardando
                  ? form.decisionReubicacion === "Reubicar"
                    ? "Reubicando…"
                    : "Guardando…"
                  : form.decisionReubicacion === "Reubicar"
                    ? "Confirmar reubicación"
                    : "Guardar cambios"}
              </button>
              {historial && historial.length > 0 && (
                <div className="border-t border-[var(--border)] pt-3">
                  <p className="mb-1.5 text-xs font-medium text-[var(--muted)]">
                    Historial de reubicaciones
                  </p>
                  <div className="max-h-32 space-y-1.5 overflow-y-auto text-[11px] text-[var(--muted)]">
                    {historial.map((m) => (
                      <p key={m.id}>
                        {new Date(m.createdAt).toLocaleDateString("es-MX")} — {m.puntoOrigen.nombre} →{" "}
                        {m.puntoDestino.nombre} ({m.tipoContenedor}) por {m.usuario.name}
                        {m.motivo ? ` — ${m.motivo}` : ""}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
