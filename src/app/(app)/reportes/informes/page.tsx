"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { descargarCSV } from "@/lib/csv";
import { MATERIALES, MESES_LABEL, type FilaCentroInforme, type InformesResponse, type PeriodoTipo } from "@/lib/informes";

type PuntoAcopioOpcion = {
  id: string;
  nombre: string;
  zona: string | null;
  estado: string | null;
  tipoContenedor: string | null;
};

type FiltrosInforme = {
  periodo: PeriodoTipo;
  anio: number;
  mes: number;
  desde: string;
  hasta: string;
  puntoAcopioId: string;
  zona: string;
  estado: string;
  tipoContenedor: string;
  activo: string; // "" | "true" | "false"
  material: string; // "" | MaterialKey
  conReporte: string; // "" | "con" | "sin"
};

const anioActual = new Date().getFullYear();

const FILTROS_INICIALES: FiltrosInforme = {
  periodo: "anio",
  anio: anioActual,
  mes: new Date().getMonth() + 1,
  desde: "",
  hasta: "",
  puntoAcopioId: "",
  zona: "",
  estado: "",
  tipoContenedor: "",
  activo: "",
  material: "",
  conReporte: "",
};

type ColumnaOrden =
  | "ranking"
  | "nombre"
  | "municipio"
  | "estado"
  | "totalKg"
  | "numeroReportes"
  | "promedioMensualKg"
  | "ultimaFecha"
  | "porcentajeParticipacion";

function fmtKg(n: number) {
  return `${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;
}

function fmtFecha(iso: string | null) {
  return iso ? iso.slice(0, 10) : "—";
}

function IndicadorCard({ label, valor, detalle }: { label: string; valor: string; detalle?: string }) {
  return (
    <div className="rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4">
      <p className="text-sm text-foreground/60">{label}</p>
      <p className="mt-1 text-xl font-semibold text-[var(--foreground)]">{valor}</p>
      {detalle && <p className="mt-0.5 text-xs text-[var(--muted)]">{detalle}</p>}
    </div>
  );
}

export default function InformesPage() {
  const [filtros, setFiltros] = useState<FiltrosInforme>(FILTROS_INICIALES);
  const [datos, setDatos] = useState<InformesResponse | null>(null);
  const [puntos, setPuntos] = useState<PuntoAcopioOpcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [orden, setOrden] = useState<{ campo: ColumnaOrden; dir: "asc" | "desc" }>({
    campo: "ranking",
    dir: "asc",
  });

  useEffect(() => {
    fetch("/api/puntos-acopio")
      .then((r) => r.json())
      .then(setPuntos);
  }, []);

  const cargar = useCallback(async () => {
    if (filtros.periodo === "rango" && (!filtros.desde || !filtros.hasta)) return;
    setCargando(true);
    const params = new URLSearchParams();
    params.set("periodo", filtros.periodo);
    params.set("anio", String(filtros.anio));
    if (filtros.periodo === "mes") params.set("mes", String(filtros.mes));
    if (filtros.periodo === "rango") {
      params.set("desde", filtros.desde);
      params.set("hasta", filtros.hasta);
    }
    if (filtros.puntoAcopioId) params.set("puntoAcopioId", filtros.puntoAcopioId);
    if (filtros.zona) params.set("zona", filtros.zona);
    if (filtros.estado) params.set("estado", filtros.estado);
    if (filtros.tipoContenedor) params.set("tipoContenedor", filtros.tipoContenedor);
    if (filtros.activo) params.set("activo", filtros.activo);
    if (filtros.material) params.set("material", filtros.material);
    if (filtros.conReporte) params.set("conReporte", filtros.conReporte);
    const res = await fetch(`/api/reportes/informes?${params}`);
    setDatos(await res.json());
    setCargando(false);
  }, [filtros]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const zonas = useMemo(
    () => Array.from(new Set(puntos.map((p) => p.zona).filter((z): z is string => !!z))).sort(),
    [puntos],
  );
  const estados = useMemo(
    () => Array.from(new Set(puntos.map((p) => p.estado).filter((e): e is string => !!e))).sort(),
    [puntos],
  );
  const tiposContenedor = useMemo(
    () => Array.from(new Set(puntos.map((p) => p.tipoContenedor).filter((t): t is string => !!t))).sort(),
    [puntos],
  );
  const aniosDisponibles = useMemo(() => Array.from({ length: 6 }, (_, i) => anioActual + 1 - i), []);

  function ordenarPor(campo: ColumnaOrden) {
    setOrden((o) => (o.campo === campo ? { campo, dir: o.dir === "asc" ? "desc" : "asc" } : { campo, dir: "asc" }));
  }

  const centrosOrdenados = useMemo(() => {
    if (!datos) return [];
    const copia = [...datos.centros];
    const dir = orden.dir === "asc" ? 1 : -1;
    copia.sort((a, b) => {
      const va = a[orden.campo];
      const vb = b[orden.campo];
      if (va === null) return 1;
      if (vb === null) return -1;
      if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb) * dir;
      return ((va as number) - (vb as number)) * dir;
    });
    return copia;
  }, [datos, orden]);

  const datosGrafica = useMemo(() => {
    if (!datos) return [];
    return datos.graficoMensual.puntos.map((p) => ({
      ...p,
      etiqueta:
        datos.graficoMensual.modo === "anioFijo"
          ? MESES_LABEL[p.mes - 1].slice(0, 3)
          : `${MESES_LABEL[p.mes - 1].slice(0, 3)} ${p.anio}`,
    }));
  }, [datos]);

  function exportarCSV() {
    if (!datos) return;
    descargarCSV(
      `informe-${datos.periodo.tipo}-${datos.periodo.anio}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        "#",
        "Centro",
        "Municipio",
        "Estado",
        "Total Kg",
        "PET Kg",
        "Tapas Kg",
        "Aluminio Kg",
        "Tapas Wins Kg",
        "Reportes",
        "Promedio mensual Kg",
        "Última fecha",
        "% Participación",
      ],
      centrosOrdenados.map((c: FilaCentroInforme) => [
        c.ranking,
        c.nombre,
        c.municipio ?? "",
        c.estado ?? "",
        c.totalKg.toFixed(2),
        c.kgPorMaterial.petKg.toFixed(2),
        c.kgPorMaterial.tapasKg.toFixed(2),
        c.kgPorMaterial.aluminioKg.toFixed(2),
        c.kgPorMaterial.tapasWinsKg.toFixed(2),
        c.numeroReportes,
        c.promedioMensualKg.toFixed(2),
        c.ultimaFecha ? c.ultimaFecha.slice(0, 10) : "",
        c.porcentajeParticipacion.toFixed(1),
      ]),
    );
  }

  const indicadores = datos?.indicadores ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Informes</h1>
          <p className="text-sm text-foreground/60">
            Tablero ejecutivo de recolección por periodo, material y centro de acopio.
          </p>
        </div>
        <button
          onClick={exportarCSV}
          disabled={!datos || datos.centros.length === 0}
          className="rounded-xl border border-[var(--brand-blue)] px-3 py-2 text-sm font-medium text-[var(--brand-blue)] hover:bg-white/40 disabled:opacity-50"
        >
          Exportar CSV
        </button>
      </div>

      <div className="space-y-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Periodo</span>
            <select
              value={filtros.periodo}
              onChange={(e) => setFiltros({ ...filtros, periodo: e.target.value as PeriodoTipo })}
              className="input"
            >
              <option value="mes">Mes</option>
              <option value="semestre1">Primer semestre (ene-jun)</option>
              <option value="semestre2">Segundo semestre (jul-dic)</option>
              <option value="anio">Año completo</option>
              <option value="rango">Rango personalizado</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Año</span>
            <select
              value={filtros.anio}
              onChange={(e) => setFiltros({ ...filtros, anio: Number(e.target.value) })}
              className="input"
            >
              {aniosDisponibles.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
          {filtros.periodo === "mes" && (
            <label className="space-y-1 text-sm">
              <span className="font-medium">Mes</span>
              <select
                value={filtros.mes}
                onChange={(e) => setFiltros({ ...filtros, mes: Number(e.target.value) })}
                className="input"
              >
                {MESES_LABEL.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          )}
          {filtros.periodo === "rango" && (
            <>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Desde</span>
                <input
                  type="date"
                  value={filtros.desde}
                  onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })}
                  className="input"
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="font-medium">Hasta</span>
                <input
                  type="date"
                  value={filtros.hasta}
                  onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })}
                  className="input"
                />
              </label>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Centro de acopio</span>
            <select
              value={filtros.puntoAcopioId}
              onChange={(e) => setFiltros({ ...filtros, puntoAcopioId: e.target.value })}
              className="input"
            >
              <option value="">Todos</option>
              {puntos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Municipio</span>
            <select
              value={filtros.zona}
              onChange={(e) => setFiltros({ ...filtros, zona: e.target.value })}
              className="input"
            >
              <option value="">Todos</option>
              {zonas.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Estado</span>
            <select
              value={filtros.estado}
              onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
              className="input"
            >
              <option value="">Todos</option>
              {estados.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Tipo de contenedor</span>
            <select
              value={filtros.tipoContenedor}
              onChange={(e) => setFiltros({ ...filtros, tipoContenedor: e.target.value })}
              className="input"
            >
              <option value="">Todos</option>
              {tiposContenedor.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Estatus del centro</span>
            <select
              value={filtros.activo}
              onChange={(e) => setFiltros({ ...filtros, activo: e.target.value })}
              className="input"
            >
              <option value="">Todos</option>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Material</span>
            <select
              value={filtros.material}
              onChange={(e) => setFiltros({ ...filtros, material: e.target.value })}
              className="input"
            >
              <option value="">Todos</option>
              {MATERIALES.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Reportes</span>
            <select
              value={filtros.conReporte}
              onChange={(e) => setFiltros({ ...filtros, conReporte: e.target.value })}
              className="input"
            >
              <option value="">Todos los centros</option>
              <option value="con">Con reporte</option>
              <option value="sin">Sin reporte</option>
            </select>
          </label>
        </div>
      </div>

      {cargando && !datos ? (
        <p className="text-sm text-foreground/60">Cargando...</p>
      ) : datos ? (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <IndicadorCard label="Total general recolectado" valor={fmtKg(indicadores!.totalKg)} />
            <IndicadorCard
              label="Centros que reportaron"
              valor={String(indicadores!.totalCentrosReportaron)}
            />
            <IndicadorCard label="Total de reportes" valor={String(indicadores!.totalReportes)} />
            <IndicadorCard
              label="Promedio por centro"
              valor={fmtKg(indicadores!.promedioPorCentroKg)}
            />
            <IndicadorCard
              label="Material con mayor volumen"
              valor={indicadores!.materialMayorVolumen?.nombre ?? "Sin datos"}
              detalle={indicadores!.materialMayorVolumen ? fmtKg(indicadores!.materialMayorVolumen.kg) : undefined}
            />
            <IndicadorCard
              label="Centro con mayor desempeño"
              valor={indicadores!.centroMayorDesempeno?.nombre ?? "Sin datos"}
              detalle={indicadores!.centroMayorDesempeno ? fmtKg(indicadores!.centroMayorDesempeno.kg) : undefined}
            />
            <IndicadorCard
              label="Mes con mayor recolección"
              valor={
                indicadores!.mesMayorRecoleccion
                  ? `${MESES_LABEL[indicadores!.mesMayorRecoleccion.mes - 1]} ${indicadores!.mesMayorRecoleccion.anio}`
                  : "Sin datos"
              }
              detalle={indicadores!.mesMayorRecoleccion ? fmtKg(indicadores!.mesMayorRecoleccion.kg) : undefined}
            />
          </div>

          <div className="rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4">
            <h2 className="mb-3 text-sm font-semibold">
              Recolección mensual {datos.graficoMensual.modo === "anioFijo" ? `(${filtros.anio})` : ""}
            </h2>
            {datosGrafica.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">No hay datos para mostrar en la gráfica.</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={datosGrafica} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e9ed" />
                  <XAxis dataKey="etiqueta" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => [`${Number(value ?? 0).toFixed(2)} kg`, "Total"]}
                  />
                  <Bar dataKey="kg" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold">Total por tipo de material</h2>
            {datos.materiales.length === 0 || datos.materiales.every((m) => m.kg === 0) ? (
              <p className="rounded-xl border border-dashed border-white/60 bg-white/20 p-4 text-center text-sm text-[var(--muted)]">
                No hay materiales recolectados en este periodo.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {datos.materiales.map((m) => (
                  <div
                    key={m.key}
                    className="rounded-xl border border-white/60 bg-white/40 p-4 shadow-lg shadow-black/5 backdrop-blur-md backdrop-saturate-150"
                  >
                    <p className="font-semibold text-[var(--foreground)]">{m.nombre}</p>
                    <p className="mt-1 text-xl font-semibold text-[var(--brand-blue)]">{fmtKg(m.kg)}</p>
                    <p className="mt-1 text-xs text-[var(--muted)]">{m.porcentaje.toFixed(1)}% del total</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(datos.advertencias.sinReporte.length > 0 || datos.advertencias.incompletos.length > 0) && (
            <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                <AlertTriangle className="h-4 w-4" /> Advertencias
              </p>
              {datos.advertencias.sinReporte.length > 0 && (
                <p className="text-xs text-amber-800">
                  {datos.advertencias.sinReporte.length} centro(s) sin reporte en el periodo:{" "}
                  {datos.advertencias.sinReporte.map((c) => c.nombre).join(", ")}
                </p>
              )}
              {datos.advertencias.incompletos.length > 0 && (
                <p className="text-xs text-amber-800">
                  {datos.advertencias.incompletos.length} reporte(s) marcados como realizados sin ningún
                  material capturado.
                </p>
              )}
            </div>
          )}

          <div>
            <h2 className="mb-3 text-sm font-semibold">Desempeño por centro de acopio</h2>
            <div className="overflow-x-auto rounded-xl border border-white/50 bg-white/40 backdrop-blur-md">
              <table className="w-full text-sm">
                <thead className="bg-white/50 text-left">
                  <tr>
                    <th className="cursor-pointer px-3 py-2 whitespace-nowrap" onClick={() => ordenarPor("ranking")}>
                      # {orden.campo === "ranking" && (orden.dir === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="cursor-pointer px-3 py-2" onClick={() => ordenarPor("nombre")}>
                      Centro {orden.campo === "nombre" && (orden.dir === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="cursor-pointer px-3 py-2" onClick={() => ordenarPor("municipio")}>
                      Municipio {orden.campo === "municipio" && (orden.dir === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="cursor-pointer px-3 py-2" onClick={() => ordenarPor("estado")}>
                      Estado {orden.campo === "estado" && (orden.dir === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      className="cursor-pointer px-3 py-2 text-right whitespace-nowrap"
                      onClick={() => ordenarPor("totalKg")}
                    >
                      Total {orden.campo === "totalKg" && (orden.dir === "asc" ? "▲" : "▼")}
                    </th>
                    <th className="px-3 py-2 text-right">PET</th>
                    <th className="px-3 py-2 text-right">Tapas</th>
                    <th className="px-3 py-2 text-right">Aluminio</th>
                    <th className="px-3 py-2 text-right whitespace-nowrap">Tapas Wins</th>
                    <th
                      className="cursor-pointer px-3 py-2 text-right whitespace-nowrap"
                      onClick={() => ordenarPor("numeroReportes")}
                    >
                      Reportes {orden.campo === "numeroReportes" && (orden.dir === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      className="cursor-pointer px-3 py-2 text-right whitespace-nowrap"
                      onClick={() => ordenarPor("promedioMensualKg")}
                    >
                      Prom. mensual {orden.campo === "promedioMensualKg" && (orden.dir === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      className="cursor-pointer px-3 py-2 whitespace-nowrap"
                      onClick={() => ordenarPor("ultimaFecha")}
                    >
                      Última fecha {orden.campo === "ultimaFecha" && (orden.dir === "asc" ? "▲" : "▼")}
                    </th>
                    <th
                      className="cursor-pointer px-3 py-2 text-right whitespace-nowrap"
                      onClick={() => ordenarPor("porcentajeParticipacion")}
                    >
                      % Participación{" "}
                      {orden.campo === "porcentajeParticipacion" && (orden.dir === "asc" ? "▲" : "▼")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {centrosOrdenados.map((c) => (
                    <tr key={c.id} className="border-t border-white/50 even:bg-white/20">
                      <td className="px-3 py-2.5 font-medium">{c.ranking}</td>
                      <td className="px-3 py-2.5 font-medium">{c.nombre}</td>
                      <td className="px-3 py-2.5 text-[var(--muted)]">{c.municipio ?? "—"}</td>
                      <td className="px-3 py-2.5 text-[var(--muted)]">{c.estado ?? "—"}</td>
                      <td className="px-3 py-2.5 text-right font-medium">{fmtKg(c.totalKg)}</td>
                      <td className="px-3 py-2.5 text-right">{c.kgPorMaterial.petKg.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right">{c.kgPorMaterial.tapasKg.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right">{c.kgPorMaterial.aluminioKg.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right">{c.kgPorMaterial.tapasWinsKg.toFixed(2)}</td>
                      <td className="px-3 py-2.5 text-right">{c.numeroReportes}</td>
                      <td className="px-3 py-2.5 text-right">{fmtKg(c.promedioMensualKg)}</td>
                      <td className="px-3 py-2.5 whitespace-nowrap">{fmtFecha(c.ultimaFecha)}</td>
                      <td className="px-3 py-2.5 text-right">{c.porcentajeParticipacion.toFixed(1)}%</td>
                    </tr>
                  ))}
                  {centrosOrdenados.length === 0 && (
                    <tr>
                      <td colSpan={12} className="px-3 py-6 text-center text-foreground/60">
                        No hay centros con estos filtros.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
