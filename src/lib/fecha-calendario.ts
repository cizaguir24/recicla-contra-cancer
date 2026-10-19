// Utilidades de fecha para los indicadores de Desempeño — todo en términos
// de "fecha calendario" (año/mes/día), sin hora, representada como un Date
// a medianoche UTC. Así se puede comparar directo contra FechaAcopio.fecha,
// que viene de Notion como fecha simple ("2026-03-15") y Prisma la guarda
// igual, a medianoche UTC.
const ZONA = "America/Mexico_City";

// La fecha de "hoy" según el calendario de México, sin importar en qué huso
// horario corra el servidor. No se puede usar simplemente `new Date()` y
// leer getUTCFullYear/etc: eso da la fecha en UTC, que ya cambió de día
// varias horas antes de medianoche en México.
export function hoyMexico(): Date {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const anio = Number(partes.find((p) => p.type === "year")!.value);
  const mes = Number(partes.find((p) => p.type === "month")!.value);
  const dia = Number(partes.find((p) => p.type === "day")!.value);
  return new Date(Date.UTC(anio, mes - 1, dia));
}

// Suma (o resta, con meses negativo) meses calendario completos. Si el día
// de origen no existe en el mes destino (31 de enero + 1 mes), se ajusta al
// último día válido de ese mes (28/29 de febrero) — nunca se "desborda" al
// mes siguiente.
export function sumarMeses(fecha: Date, meses: number): Date {
  const anio = fecha.getUTCFullYear();
  const mes = fecha.getUTCMonth();
  const dia = fecha.getUTCDate();
  const primerDiaDestino = new Date(Date.UTC(anio, mes + meses, 1));
  const ultimoDiaDelMesDestino = new Date(
    Date.UTC(primerDiaDestino.getUTCFullYear(), primerDiaDestino.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(primerDiaDestino.getUTCFullYear(), primerDiaDestino.getUTCMonth(), Math.min(dia, ultimoDiaDelMesDestino)),
  );
}

export function sumarDias(fecha: Date, dias: number): Date {
  return new Date(fecha.getTime() + dias * 24 * 60 * 60 * 1000);
}

export function diferenciaDias(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));
}
