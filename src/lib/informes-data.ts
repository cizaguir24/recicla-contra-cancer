// Agregación de datos del módulo de Informes (con Prisma) — compartida entre
// la ruta JSON (/api/reportes/informes) y la ruta PDF (/api/reportes/informes/pdf)
// para no duplicar la lógica de consulta/cálculo.
import { prisma } from "@/lib/prisma";
import {
  MATERIALES,
  agruparPorMes,
  kgDeFila,
  sumarMateriales,
  mesesEnRango,
  porcentaje,
  resolverRangoPeriodo,
  resolverRangoGrafico,
  type MaterialKey,
  type PeriodoTipo,
  type PuntoMensual,
  type FilaCentroInforme,
  type InformesResponse,
} from "@/lib/informes";

export async function obtenerInformes(searchParams: URLSearchParams): Promise<InformesResponse> {
  const hoy = new Date();

  const periodo = (searchParams.get("periodo") as PeriodoTipo) || "anio";
  const anio = Number(searchParams.get("anio")) || hoy.getFullYear();
  const mesParam = searchParams.get("mes");
  const mes = mesParam ? Number(mesParam) : undefined;
  const desdeParam = searchParams.get("desde") || undefined;
  const hastaParam = searchParams.get("hasta") || undefined;

  const puntoAcopioId = searchParams.get("puntoAcopioId") || undefined;
  const zona = searchParams.get("zona") || undefined;
  const estadoPunto = searchParams.get("estado") || undefined;
  const tipoContenedor = searchParams.get("tipoContenedor") || undefined;
  const activoParam = searchParams.get("activo");
  const activo = activoParam === "true" ? true : activoParam === "false" ? false : undefined;
  const materialParam = searchParams.get("material") as MaterialKey | null;
  const materialFiltro: MaterialKey | null =
    materialParam && MATERIALES.some((m) => m.key === materialParam) ? materialParam : null;
  const conReporte = searchParams.get("conReporte") as "con" | "sin" | null;

  const rangoPrincipal = resolverRangoPeriodo({ periodo, anio, mes, desde: desdeParam, hasta: hastaParam });
  const rangoGrafico = resolverRangoGrafico(rangoPrincipal, periodo, anio);

  // 1. Centros candidatos según los filtros no temporales.
  const centros = await prisma.puntoAcopio.findMany({
    where: {
      ...(puntoAcopioId && { id: puntoAcopioId }),
      ...(zona && { zona }),
      ...(estadoPunto && { estado: estadoPunto }),
      ...(tipoContenedor && { tipoContenedor }),
      ...(activo !== undefined && { activo }),
    },
    select: { id: true, nombre: true, zona: true, estado: true, tipoContenedor: true, activo: true },
    orderBy: { nombre: "asc" },
  });
  const centroPorId = new Map(centros.map((c) => [c.id, c]));

  // 2. Un solo fetch de fechas "realizada" para el rango más amplio (el de la
  //    gráfica, que siempre contiene o iguala al del periodo principal).
  const fechas = await prisma.fechaAcopio.findMany({
    where: {
      estado: "realizada",
      puntoAcopioId: { in: centros.map((c) => c.id) },
      fecha: { gte: rangoGrafico.desde, lte: rangoGrafico.hasta },
    },
    select: {
      id: true,
      puntoAcopioId: true,
      fecha: true,
      petKg: true,
      tapasKg: true,
      aluminioKg: true,
      tapasWinsKg: true,
    },
    orderBy: { fecha: "asc" },
  });

  const fechasPeriodoPrincipal = fechas.filter(
    (f) => f.fecha >= rangoPrincipal.desde && f.fecha <= rangoPrincipal.hasta,
  );

  // ---- Gráfica mensual ----
  const puntosMensuales: PuntoMensual[] = agruparPorMes(
    fechas.map((f) => ({ fecha: f.fecha, kg: kgDeFila(f, materialFiltro) })),
    rangoGrafico.desde,
    rangoGrafico.hasta,
  );

  // ---- Agregación por centro (periodo principal) ----
  const fechasPorCentro = new Map<string, typeof fechasPeriodoPrincipal>();
  for (const f of fechasPeriodoPrincipal) {
    const lista = fechasPorCentro.get(f.puntoAcopioId) ?? [];
    lista.push(f);
    fechasPorCentro.set(f.puntoAcopioId, lista);
  }

  const totalGeneralKg = fechasPeriodoPrincipal.reduce((suma, f) => suma + kgDeFila(f, materialFiltro), 0);
  const mesesDelPeriodo = mesesEnRango(rangoPrincipal.desde, rangoPrincipal.hasta);

  const filasCentro: FilaCentroInforme[] = centros.map((c) => {
    const fechasCentro = fechasPorCentro.get(c.id) ?? [];
    const kgPorMaterial = sumarMateriales(fechasCentro);
    const totalKg = kgDeFila(kgPorMaterial, materialFiltro);
    const ultimaFecha = fechasCentro.length > 0 ? fechasCentro[fechasCentro.length - 1].fecha : null;
    return {
      id: c.id,
      nombre: c.nombre,
      municipio: c.zona,
      estado: c.estado,
      tipoContenedor: c.tipoContenedor,
      activo: c.activo,
      totalKg,
      kgPorMaterial,
      numeroReportes: fechasCentro.length,
      promedioMensualKg: totalKg / mesesDelPeriodo,
      ultimaFecha: ultimaFecha ? ultimaFecha.toISOString() : null,
      porcentajeParticipacion: porcentaje(totalKg, totalGeneralKg),
      ranking: 0,
    };
  });

  // Ranking sobre el conjunto completo (antes de aplicar conReporte), para que la
  // posición de un centro no cambie según qué filtro de "con/sin reporte" se vea.
  filasCentro.sort((a, b) => b.totalKg - a.totalKg || a.nombre.localeCompare(b.nombre));
  filasCentro.forEach((f, i) => (f.ranking = i + 1));

  // Advertencia "sin reporte": sobre el conjunto completo, no sobre el ya filtrado
  // por conReporte (para que siempre se vea la lista real, sin importar el filtro).
  const sinReporte = filasCentro
    .filter((f) => f.numeroReportes === 0)
    .map((f) => ({ id: f.id, nombre: f.nombre }));

  const centrosMostrados =
    conReporte === "con"
      ? filasCentro.filter((f) => f.numeroReportes > 0)
      : conReporte === "sin"
        ? filasCentro.filter((f) => f.numeroReportes === 0)
        : filasCentro;

  // ---- Indicadores (derivados de lo que efectivamente se muestra) ----
  const totalCentrosReportaron = centrosMostrados.filter((f) => f.numeroReportes > 0).length;
  const totalReportes = centrosMostrados.reduce((suma, f) => suma + f.numeroReportes, 0);
  const totalKgMostrado = centrosMostrados.reduce((suma, f) => suma + f.totalKg, 0);
  const promedioPorCentroKg = totalCentrosReportaron > 0 ? totalKgMostrado / totalCentrosReportaron : 0;

  const centroMayorDesempeno =
    centrosMostrados.length > 0 && centrosMostrados[0].totalKg > 0
      ? { id: centrosMostrados[0].id, nombre: centrosMostrados[0].nombre, kg: centrosMostrados[0].totalKg }
      : null;

  // Material con mayor volumen: si hay un material filtrado, la lista de
  // "materiales" solo trae ese, así que naturalmente sale como el único.
  const materialesRelevantes = materialFiltro ? MATERIALES.filter((m) => m.key === materialFiltro) : MATERIALES;
  const sumasMateriales = sumarMateriales(fechasPeriodoPrincipal);
  let sumaMaterialesRelevantes = 0;
  for (const m of materialesRelevantes) sumaMaterialesRelevantes += sumasMateriales[m.key];
  const materialesResp = materialesRelevantes.map((m) => ({
    key: m.key,
    nombre: m.label,
    kg: sumasMateriales[m.key],
    porcentaje: porcentaje(sumasMateriales[m.key], sumaMaterialesRelevantes),
  }));
  const materialMayorVolumenRaw = materialesResp.reduce<(typeof materialesResp)[number] | null>(
    (max, m) => (max === null || m.kg > max.kg ? m : max),
    null,
  );
  const materialMayorVolumen =
    materialMayorVolumenRaw && materialMayorVolumenRaw.kg > 0
      ? { key: materialMayorVolumenRaw.key, nombre: materialMayorVolumenRaw.nombre, kg: materialMayorVolumenRaw.kg }
      : null;

  // Mes con mayor recolección: sobre el periodo principal específicamente (no
  // sobre el año completo que siempre trae la gráfica).
  const puntosMensualesPeriodoPrincipal = agruparPorMes(
    fechasPeriodoPrincipal.map((f) => ({ fecha: f.fecha, kg: kgDeFila(f, materialFiltro) })),
    rangoPrincipal.desde,
    rangoPrincipal.hasta,
  );
  const mesMayorRecoleccionRaw = puntosMensualesPeriodoPrincipal.reduce<PuntoMensual | null>(
    (max, p) => (max === null || p.kg > max.kg ? p : max),
    null,
  );
  const mesMayorRecoleccion =
    mesMayorRecoleccionRaw && mesMayorRecoleccionRaw.kg > 0
      ? { anio: mesMayorRecoleccionRaw.anio, mes: mesMayorRecoleccionRaw.mes, kg: mesMayorRecoleccionRaw.kg }
      : null;

  // ---- Manifiestos generados en el periodo: solo a quién van dirigidos ----
  const manifiestos = await prisma.manifiesto.findMany({
    where: {
      estatus: "generado",
      eliminadoAt: null,
      fechaManifiesto: { gte: rangoPrincipal.desde, lte: rangoPrincipal.hasta },
      ...(puntoAcopioId && { puntoAcopioId }),
    },
    select: { dirigidoA: true, dirigidoAPuesto: true },
    orderBy: { fechaManifiesto: "asc" },
  });
  const manifiestosDirigidos = manifiestos.map((m) => ({ nombre: m.dirigidoA, puesto: m.dirigidoAPuesto }));

  // ---- Advertencias: reportes "realizada" sin ningún material capturado ----
  const incompletos = fechasPeriodoPrincipal
    .filter((f) => MATERIALES.every((m) => !f[m.key]))
    .map((f) => ({
      id: f.id,
      puntoAcopioId: f.puntoAcopioId,
      nombre: centroPorId.get(f.puntoAcopioId)?.nombre ?? "—",
      fecha: f.fecha.toISOString(),
    }));

  return {
    periodo: {
      tipo: periodo,
      anio,
      mes: mes ?? null,
      desde: rangoPrincipal.desde.toISOString(),
      hasta: rangoPrincipal.hasta.toISOString(),
    },
    indicadores: {
      totalKg: totalKgMostrado,
      totalCentrosReportaron,
      totalReportes,
      promedioPorCentroKg,
      materialMayorVolumen,
      centroMayorDesempeno,
      mesMayorRecoleccion,
    },
    graficoMensual: { modo: rangoGrafico.modo, puntos: puntosMensuales },
    materiales: materialesResp,
    centros: centrosMostrados,
    manifiestosDirigidos,
    advertencias: { sinReporte, incompletos },
  };
}
