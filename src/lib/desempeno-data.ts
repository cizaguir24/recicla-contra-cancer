import { prisma } from "@/lib/prisma";
import { hoyMexico, sumarMeses, sumarDias, diferenciaDias } from "@/lib/fecha-calendario";

// Indicador de Desempeño por Punto de Acopio — año en curso (1 de enero al
// día de hoy), meta prorrateada según el mes actual (~1 recolección cada 2
// meses: mes 10 -> meta de 5). Se evalúa así, y no con una ventana móvil de
// 12 meses contra la fecha de alta del punto, porque la única fecha
// disponible para aproximar "antigüedad" (la Fecha de Acopio más antigua en
// Notion) solo existe desde que se empezó a registrar este año — usarla
// como antigüedad real hacía que CUALQUIER punto pareciera "nuevo" y nunca
// recibiera semáforo. Con año en curso + meta pareja para todos, cada punto
// siempre tiene un color.
export const META_ANUAL = 6;

export type EstadoDesempeno = "VERDE" | "AMARILLO" | "ROJO";

export type ColorEstado = "green" | "amber" | "red";

export const ESTADO_INFO: Record<EstadoDesempeno, { etiqueta: string; color: ColorEstado }> = {
  VERDE: { etiqueta: "Verde", color: "green" },
  AMARILLO: { etiqueta: "Amarillo", color: "amber" },
  ROJO: { etiqueta: "Rojo", color: "red" },
};

export type EventoAcopio = { fecha: Date; estado: string; tapasKg: number | null };

export type CalculoDesempeno = {
  periodoInicio: Date;
  periodoFin: Date;
  totalRecolecciones: number;
  metaAnual: number;
  metaPeriodo: number;
  estado: EstadoDesempeno;
  cumplimientoPeriodo: number | null;
  primeraRecoleccionRegistrada: Date | null;
  ultimaRecoleccion: Date | null;
  diasSinRecoleccion: number | null;
  alertaContacto: boolean;
  kgTapasPeriodo: number | null;
};

export type FilaDesempeno = CalculoDesempeno & {
  id: string;
  nombre: string;
  activo: boolean;
  municipio: string | null;
  responsable: string | null;
  tipoContenedor: string | null;
  decisionReubicacion: string | null;
  numeroCelular: string | null;
  correoElectronico: string | null;
};

// Meta prorrateada: ~1 recolección cada 2 meses del año. Enero/febrero dan
// meta 0/1 (apenas empieza el año, nadie puede estar "atrasado" todavía);
// diciembre da meta 6, igual que la meta anual completa.
function metaDelPeriodo(mesActual: number): number {
  return Math.floor(mesActual / 2);
}

// Núcleo puro del indicador — sin Prisma, para poder probar a fondo los
// casos límite con fechas sintéticas (ver scripts/_test-desempeno-temp.ts).
// `eventos` son TODAS las fechas de acopio del punto (cualquier estado), ya
// ordenadas por fecha.
export function calcularDesempenoPunto(eventos: EventoAcopio[], hoy: Date): CalculoDesempeno {
  const realizadas = eventos.filter((e) => e.estado === "realizada");

  const inicioPeriodo = new Date(Date.UTC(hoy.getUTCFullYear(), 0, 1)); // 1 de enero del año en curso
  const finPeriodo = sumarDias(hoy, 1); // exclusivo: hoy cuenta, mañana no

  const eventosPeriodo = realizadas.filter((e) => e.fecha >= inicioPeriodo && e.fecha < finPeriodo);
  const totalRecolecciones = eventosPeriodo.length;

  const meta = metaDelPeriodo(hoy.getUTCMonth() + 1);

  let estado: EstadoDesempeno;
  if (totalRecolecciones >= meta) {
    estado = "VERDE";
  } else if (totalRecolecciones >= meta - 2) {
    estado = "AMARILLO";
  } else {
    estado = "ROJO";
  }
  const cumplimientoPeriodo = meta > 0 ? (totalRecolecciones / meta) * 100 : null;

  const ultimaRecoleccion = realizadas.length > 0 ? realizadas[realizadas.length - 1].fecha : null;
  // Primera fecha registrada para el punto (cualquier estado) — informativa,
  // y respaldo de la alerta de inactividad si nunca tuvo una recolección
  // realizada. No determina el estado anual (ver nota arriba).
  const primeraRecoleccionRegistrada = eventos.length > 0 ? eventos[0].fecha : null;

  // Alerta de inactividad: independiente del semáforo, basada en el
  // historial COMPLETO (no solo el año en curso) — puede coexistir con
  // cualquier estado, incluido Verde.
  const baseAlerta = ultimaRecoleccion ?? primeraRecoleccionRegistrada;
  const alertaContacto = baseAlerta ? hoy > sumarMeses(baseAlerta, 2) : false;

  const hayDatoKgConfiable = eventosPeriodo.some((e) => e.tapasKg != null);
  const kgTapasPeriodo = hayDatoKgConfiable
    ? eventosPeriodo.reduce((suma, e) => suma + (e.tapasKg ?? 0), 0)
    : null;

  return {
    periodoInicio: inicioPeriodo,
    periodoFin: finPeriodo,
    totalRecolecciones,
    metaAnual: META_ANUAL,
    metaPeriodo: meta,
    estado,
    cumplimientoPeriodo,
    primeraRecoleccionRegistrada,
    ultimaRecoleccion,
    diasSinRecoleccion: ultimaRecoleccion ? diferenciaDias(hoy, ultimaRecoleccion) : null,
    alertaContacto,
    kgTapasPeriodo,
  };
}

export async function obtenerDesempeno(): Promise<FilaDesempeno[]> {
  const hoy = hoyMexico();

  const puntos = await prisma.puntoAcopio.findMany({
    include: {
      // Se necesita TODO el historial (no solo el año en curso) para la
      // última recolección y la alerta de inactividad.
      fechas: { orderBy: { fecha: "asc" } },
    },
    orderBy: { nombre: "asc" },
  });

  const filas = puntos.map((punto): FilaDesempeno => {
    const calculo = calcularDesempenoPunto(
      punto.fechas.map((f) => ({ fecha: f.fecha, estado: f.estado, tapasKg: f.tapasKg })),
      hoy,
    );

    return {
      id: punto.id,
      nombre: punto.nombre,
      activo: punto.activo,
      municipio: punto.zona,
      responsable: punto.responsable,
      tipoContenedor: punto.tipoContenedor,
      decisionReubicacion: punto.decisionReubicacion,
      numeroCelular: punto.numeroCelular,
      correoElectronico: punto.correoElectronico,
      ...calculo,
    };
  });

  const ordenEstado: Record<EstadoDesempeno, number> = { ROJO: 0, AMARILLO: 1, VERDE: 2 };
  filas.sort((a, b) => ordenEstado[a.estado] - ordenEstado[b.estado]);

  return filas;
}
