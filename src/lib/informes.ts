// Helpers puros (sin Prisma) para el módulo de Informes: resolución de periodos,
// bucketing mensual y los tipos compartidos entre la ruta API y la página.

export type PeriodoTipo = "mes" | "semestre1" | "semestre2" | "anio" | "rango";

export const MATERIALES = [
  { key: "petKg", label: "PET" },
  { key: "tapasKg", label: "Tapas plásticas" },
  { key: "aluminioKg", label: "Aluminio" },
  { key: "tapasWinsKg", label: "Tapas Wins" },
] as const;

export type MaterialKey = (typeof MATERIALES)[number]["key"];

export function materialLabel(key: MaterialKey): string {
  return MATERIALES.find((m) => m.key === key)?.label ?? key;
}

export const MESES_LABEL = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export type RangoFecha = { desde: Date; hasta: Date };

// Día 0 del mes siguiente = último día del mes actual (a las 23:59:59.999 locales).
function finDeMes(anio: number, mesIndex0: number): Date {
  return new Date(anio, mesIndex0 + 1, 0, 23, 59, 59, 999);
}

// Un año puede resolver a más de un rango disjunto cuando se seleccionan varios
// años a la vez (ej. 2025 y 2026 marcados): cada año aporta su propio rango, y se
// combinan con OR en la consulta — así no se cuela el año de en medio si no fue
// marcado (ej. 2024 y 2026 sin el 2025).
export function resolverRangosPeriodo(params: {
  periodo: PeriodoTipo;
  anios: number[]; // uno o más años marcados, ignorado en periodo="rango" salvo como fallback
  mes?: number; // 1-12, solo para periodo="mes"
  desde?: string; // "YYYY-MM-DD", solo para periodo="rango"
  hasta?: string;
}): RangoFecha[] {
  const { periodo, anios, mes, desde, hasta } = params;
  if (periodo === "rango") {
    if (desde && hasta) {
      return [{ desde: new Date(`${desde}T00:00:00`), hasta: new Date(`${hasta}T23:59:59.999`) }];
    }
    // Sin rango completo capturado todavía: cae de vuelta al año completo del primer año marcado.
    const anio = anios[0] ?? new Date().getFullYear();
    return [{ desde: new Date(anio, 0, 1, 0, 0, 0, 0), hasta: finDeMes(anio, 11) }];
  }
  return anios
    .map((anio) => {
      switch (periodo) {
        case "mes": {
          const m = mes && mes >= 1 && mes <= 12 ? mes : new Date().getMonth() + 1;
          return { desde: new Date(anio, m - 1, 1, 0, 0, 0, 0), hasta: finDeMes(anio, m - 1) };
        }
        case "semestre1":
          return { desde: new Date(anio, 0, 1, 0, 0, 0, 0), hasta: finDeMes(anio, 5) };
        case "semestre2":
          return { desde: new Date(anio, 6, 1, 0, 0, 0, 0), hasta: finDeMes(anio, 11) };
        case "anio":
        default:
          return { desde: new Date(anio, 0, 1, 0, 0, 0, 0), hasta: finDeMes(anio, 11) };
      }
    })
    .sort((a, b) => a.desde.getTime() - b.desde.getTime());
}

// La gráfica mensual siempre da contexto de año completo (enero-diciembre) de cada
// año marcado, salvo en un rango personalizado, donde no hay años a los que anclarse.
export function resolverRangosGrafico(
  rangosPrincipales: RangoFecha[],
  periodo: PeriodoTipo,
  anios: number[],
): { rangos: RangoFecha[]; modo: "anioFijo" | "multiAnio" | "rango" } {
  if (periodo === "rango") {
    return { rangos: rangosPrincipales, modo: "rango" };
  }
  const rangos = anios
    .map((anio) => ({ desde: new Date(anio, 0, 1, 0, 0, 0, 0), hasta: finDeMes(anio, 11) }))
    .sort((a, b) => a.desde.getTime() - b.desde.getTime());
  return { rangos, modo: anios.length === 1 ? "anioFijo" : "multiAnio" };
}

// Años marcados, formateados para mostrarse junto a un encabezado (ej. "2025, 2026").
export function formatAnios(anios: number[]): string {
  return [...anios].sort((a, b) => a - b).join(", ");
}

export type PuntoMensual = { anio: number; mes: number; clave: string; kg: number };

function claveMes(fecha: Date): string {
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
}

// Pre-siembra cada mes de cada rango con kg:0 para que la gráfica no tenga huecos
// (varios rangos disjuntos = varios años marcados; no se rellenan los años de en
// medio que no fueron marcados).
export function agruparPorMes(filas: { fecha: Date; kg: number }[], rangos: RangoFecha[]): PuntoMensual[] {
  const puntos: PuntoMensual[] = [];
  for (const { desde, hasta } of rangos) {
    const cursor = new Date(desde.getFullYear(), desde.getMonth(), 1);
    const fin = new Date(hasta.getFullYear(), hasta.getMonth(), 1);
    while (cursor <= fin) {
      puntos.push({ anio: cursor.getFullYear(), mes: cursor.getMonth() + 1, clave: claveMes(cursor), kg: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }
  puntos.sort((a, b) => a.clave.localeCompare(b.clave));
  const porClave = new Map(puntos.map((p) => [p.clave, p]));
  for (const f of filas) {
    const punto = porClave.get(claveMes(f.fecha));
    if (punto) punto.kg += f.kg;
  }
  return puntos;
}

// Kg de una fila de FechaAcopio: si hay un material filtrado, solo ese; si no, la
// suma de los 4. Todos están en la misma unidad (kg), así que sumarlos es válido.
export function kgDeFila(
  fila: Record<MaterialKey, number | null>,
  materialFiltro?: MaterialKey | null,
): number {
  if (materialFiltro) return fila[materialFiltro] ?? 0;
  return MATERIALES.reduce((suma, m) => suma + (fila[m.key] ?? 0), 0);
}

export function sumarMateriales(filas: Record<MaterialKey, number | null>[]): Record<MaterialKey, number> {
  const totales = { petKg: 0, tapasKg: 0, aluminioKg: 0, tapasWinsKg: 0 } as Record<MaterialKey, number>;
  for (const f of filas) {
    for (const m of MATERIALES) {
      totales[m.key] += f[m.key] ?? 0;
    }
  }
  return totales;
}

// Meses calendario tocados por el rango (inclusive, mínimo 1) — usado para el
// promedio mensual, incluso en rangos personalizados que no alinean con un mes.
export function mesesEnRango(desde: Date, hasta: Date): number {
  const meses = (hasta.getFullYear() - desde.getFullYear()) * 12 + (hasta.getMonth() - desde.getMonth()) + 1;
  return Math.max(meses, 1);
}

// Suma de meses de varios rangos disjuntos (uno por año marcado).
export function mesesEnRangos(rangos: RangoFecha[]): number {
  return rangos.reduce((suma, r) => suma + mesesEnRango(r.desde, r.hasta), 0);
}

export function porcentaje(parte: number, total: number): number {
  return total > 0 ? (parte / total) * 100 : 0;
}

// ---- Tipos de la respuesta compartidos entre la ruta API y la página ----

export type FilaCentroInforme = {
  id: string;
  nombre: string;
  municipio: string | null;
  estado: string | null;
  tipoContenedor: string | null;
  activo: boolean;
  totalKg: number;
  kgPorMaterial: Record<MaterialKey, number>;
  numeroReportes: number;
  promedioMensualKg: number;
  ultimaFecha: string | null;
  porcentajeParticipacion: number;
  ranking: number;
};

export type InformesResponse = {
  periodo: { tipo: PeriodoTipo; anios: number[]; mes: number | null; desde: string; hasta: string };
  indicadores: {
    totalKg: number;
    totalCentrosReportaron: number;
    totalReportes: number;
    promedioPorCentroKg: number;
    materialMayorVolumen: { key: MaterialKey; nombre: string; kg: number } | null;
    centroMayorDesempeno: { id: string; nombre: string; kg: number } | null;
    mesMayorRecoleccion: { anio: number; mes: number; kg: number } | null;
  };
  graficoMensual: { modo: "anioFijo" | "multiAnio" | "rango"; puntos: PuntoMensual[] };
  materiales: { key: MaterialKey; nombre: string; kg: number; porcentaje: number }[];
  centros: FilaCentroInforme[];
  manifiestosDirigidos: { nombre: string; puesto: string }[];
  advertencias: {
    sinReporte: { id: string; nombre: string }[];
    incompletos: { id: string; puntoAcopioId: string; nombre: string; fecha: string }[];
  };
};
