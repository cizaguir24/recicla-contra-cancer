import { prisma } from "@/lib/prisma";
import { hoyMexico, sumarMeses, sumarDias, diferenciaDias } from "@/lib/fecha-calendario";

// Indicador anual de Desempeño por Punto de Acopio (ver "Métricas RCC" —
// instrucciones funcionales de Cómplices AC). Evalúa frecuencia de
// recolección con una ventana móvil de los últimos 12 meses calendario,
// meta de 6 recolecciones anuales; los kilogramos se muestran aparte y
// nunca alimentan el semáforo.
export const META_ANUAL = 6;

export type EstadoDesempeno = "VERDE" | "AMARILLO" | "ROJO" | "EN_SEGUIMIENTO_INICIAL" | "DATOS_INCOMPLETOS";

export type ColorEstado = "green" | "amber" | "red" | "sky" | "gray";

export const ESTADO_INFO: Record<EstadoDesempeno, { etiqueta: string; color: ColorEstado }> = {
  VERDE: { etiqueta: "Verde", color: "green" },
  AMARILLO: { etiqueta: "Amarillo", color: "amber" },
  ROJO: { etiqueta: "Rojo", color: "red" },
  EN_SEGUIMIENTO_INICIAL: { etiqueta: "En seguimiento inicial", color: "sky" },
  DATOS_INCOMPLETOS: { etiqueta: "Datos incompletos", color: "gray" },
};

export type EventoAcopio = { fecha: Date; estado: string; tapasKg: number | null };

export type CalculoDesempeno = {
  periodoInicio: Date | null;
  periodoFin: Date | null;
  totalRecolecciones: number;
  metaAnual: number;
  estado: EstadoDesempeno;
  cumplimientoAnual: number | null;
  fechaAlta: Date | null;
  mesesActivos: number | null;
  ultimaRecoleccion: Date | null;
  diasSinRecoleccion: number | null;
  alertaContacto: boolean;
  kgTapasPeriodo: number | null;
};

export type FilaDesempeno = CalculoDesempeno & {
  id: string;
  nombre: string;
  municipio: string | null;
  responsable: string | null;
  tipoContenedor: string | null;
  decisionReubicacion: string | null;
  numeroCelular: string | null;
  correoElectronico: string | null;
};

function mesesEnteros(desde: Date, hasta: Date): number {
  let meses = (hasta.getUTCFullYear() - desde.getUTCFullYear()) * 12 + (hasta.getUTCMonth() - desde.getUTCMonth());
  if (hasta.getUTCDate() < desde.getUTCDate()) meses--;
  return Math.max(0, meses);
}

// Núcleo puro del indicador — sin Prisma, para poder probar a fondo los
// casos límite del aniversario, fin de mes y año bisiesto con fechas
// sintéticas (ver scripts/_test-desempeno-temp.ts). `eventos` son TODAS las
// fechas de acopio del punto (cualquier estado), ya ordenadas por fecha.
export function calcularDesempenoPunto(eventos: EventoAcopio[], hoy: Date): CalculoDesempeno {
  const realizadas = eventos.filter((e) => e.estado === "realizada");

  // Fecha de alta: la "Fecha de Acopio" más antigua registrada para el
  // punto (Registro Acopios 2026 en Notion), sin importar su estado —
  // aprobado como proxy de antigüedad real ante la falta de una "Fecha de
  // alta" propia en el modelo de datos. Sin ninguna fecha, no hay forma
  // confiable de saber la antigüedad.
  const fechaAlta = eventos.length > 0 ? eventos[0].fecha : null;

  const inicioPeriodo = sumarMeses(hoy, -12);
  const finPeriodo = sumarDias(hoy, 1); // exclusivo: hoy cuenta, mañana no

  const eventosPeriodo = realizadas.filter((e) => e.fecha >= inicioPeriodo && e.fecha < finPeriodo);
  const totalRecolecciones = eventosPeriodo.length;

  const ultimaRecoleccion = realizadas.length > 0 ? realizadas[realizadas.length - 1].fecha : null;

  let estado: EstadoDesempeno;
  let cumplimientoAnual: number | null = null;
  let mesesActivos: number | null = null;

  if (!fechaAlta || fechaAlta > hoy) {
    estado = "DATOS_INCOMPLETOS";
  } else {
    mesesActivos = mesesEnteros(fechaAlta, hoy);
    if (hoy < sumarMeses(fechaAlta, 12)) {
      estado = "EN_SEGUIMIENTO_INICIAL";
    } else if (totalRecolecciones >= META_ANUAL) {
      estado = "VERDE";
      cumplimientoAnual = (totalRecolecciones / META_ANUAL) * 100;
    } else if (totalRecolecciones >= 4) {
      estado = "AMARILLO";
      cumplimientoAnual = (totalRecolecciones / META_ANUAL) * 100;
    } else {
      estado = "ROJO";
      cumplimientoAnual = (totalRecolecciones / META_ANUAL) * 100;
    }
  }

  // Alerta de inactividad: independiente del semáforo anual, basada en el
  // historial COMPLETO (no el periodo de 12 meses) — puede coexistir con
  // cualquier estado, incluido Verde.
  const baseAlerta = ultimaRecoleccion ?? fechaAlta;
  const alertaContacto = baseAlerta ? hoy > sumarMeses(baseAlerta, 2) : false;

  const hayDatoKgConfiable = eventosPeriodo.some((e) => e.tapasKg != null);
  const kgTapasPeriodo = hayDatoKgConfiable
    ? eventosPeriodo.reduce((suma, e) => suma + (e.tapasKg ?? 0), 0)
    : null;

  return {
    periodoInicio: fechaAlta ? inicioPeriodo : null,
    periodoFin: fechaAlta ? finPeriodo : null,
    totalRecolecciones,
    metaAnual: META_ANUAL,
    estado,
    cumplimientoAnual,
    fechaAlta,
    mesesActivos,
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
      // Se necesita TODO el historial (no solo el periodo de 12 meses) para
      // fecha de alta, última recolección y la alerta de inactividad.
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
      municipio: punto.zona,
      responsable: punto.responsable,
      tipoContenedor: punto.tipoContenedor,
      decisionReubicacion: punto.decisionReubicacion,
      numeroCelular: punto.numeroCelular,
      correoElectronico: punto.correoElectronico,
      ...calculo,
    };
  });

  const ordenEstado: Record<EstadoDesempeno, number> = {
    ROJO: 0,
    AMARILLO: 1,
    DATOS_INCOMPLETOS: 2,
    EN_SEGUIMIENTO_INICIAL: 3,
    VERDE: 4,
  };
  filas.sort((a, b) => ordenEstado[a.estado] - ordenEstado[b.estado]);

  return filas;
}
