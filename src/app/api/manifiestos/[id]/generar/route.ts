import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { ManifiestoDocument } from "@/lib/manifiesto-pdf";
import {
  expandirAcopiosPorMaterial,
  totalKgDeFilas,
  esFirmaPngValida,
  esLogotipoValido,
} from "@/lib/manifiestos";
import { limpiarDireccionDuplicada } from "@/lib/direccion";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Context) {
  const { id } = await params;

  const manifiesto = await prisma.manifiesto.findUnique({
    where: { id },
    include: { puntoAcopio: true },
  });
  if (!manifiesto || manifiesto.eliminadoAt) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (manifiesto.estatus !== "borrador") {
    return NextResponse.json(
      { error: "Este manifiesto ya fue generado y no se puede volver a generar" },
      { status: 400 },
    );
  }

  // Nombre, puesto y firma (opcional) de quien emite son fijos y se toman
  // siempre del valor vigente en Configuración, no de lo guardado en el borrador.
  const config = await prisma.configuracionManifiesto.findUnique({ where: { id: "singleton" } });
  if (!config) {
    return NextResponse.json(
      {
        error:
          "Falta configurar el nombre y puesto de quien emite manifiestos en Configuración > Plantilla de Manifiesto.",
      },
      { status: 400 },
    );
  }

  const faltantes: string[] = [];
  if (!manifiesto.puntoAcopioId) faltantes.push("punto de acopio");
  if (!manifiesto.dirigidoA) faltantes.push("profesión y nombre de la persona a quien va dirigido");
  if (!manifiesto.texto) faltantes.push("texto");
  if (!config.nombreFirmante) faltantes.push("nombre de quien emite el manifiesto (Configuración)");
  if (!config.puesto) faltantes.push("puesto de quien emite el manifiesto (Configuración)");
  if (faltantes.length > 0) {
    return NextResponse.json(
      { error: `Faltan datos obligatorios: ${faltantes.join(", ")}` },
      { status: 400 },
    );
  }

  const fechasAcopio = await prisma.fechaAcopio.findMany({
    where: {
      puntoAcopioId: manifiesto.puntoAcopioId,
      estado: "realizada",
      fecha: {
        gte: manifiesto.fechaInicioPeriodo,
        lte: new Date(manifiesto.fechaFinPeriodo.getTime() + 24 * 60 * 60 * 1000 - 1),
      },
    },
    orderBy: { fecha: "asc" },
  });

  const filas = expandirAcopiosPorMaterial(fechasAcopio);
  if (filas.length === 0) {
    return NextResponse.json(
      {
        error:
          "No se encontraron registros de acopio para el punto y periodo seleccionados",
      },
      { status: 400 },
    );
  }
  const total = totalKgDeFilas(filas);

  const direccionCompleta = [
    manifiesto.puntoAcopio.direccion ? limpiarDireccionDuplicada(manifiesto.puntoAcopio.direccion) : null,
    manifiesto.puntoAcopio.zona,
    manifiesto.puntoAcopio.estado,
  ]
    .filter(Boolean)
    .join(", ");

  // La firma y el logotipo son opcionales; si el formato no es válido se
  // tratan como ausentes.
  const firma = esFirmaPngValida(config.firmaDataUrl) ? config.firmaDataUrl : null;
  const logotipo = esLogotipoValido(config.logotipoDataUrl) ? config.logotipoDataUrl : null;

  const buffer = await renderToBuffer(
    ManifiestoDocument({
      logotipoDataUrl: logotipo,
      dirigidoA: manifiesto.dirigidoA,
      dirigidoAPuesto: manifiesto.dirigidoAPuesto,
      fechaManifiesto: manifiesto.fechaManifiesto,
      fechaInicioPeriodo: manifiesto.fechaInicioPeriodo,
      fechaFinPeriodo: manifiesto.fechaFinPeriodo,
      benefactorNombre: manifiesto.puntoAcopio.nombre,
      puntoNombre: manifiesto.puntoAcopio.nombre,
      direccionCompleta,
      texto: manifiesto.texto,
      textoCierre: manifiesto.textoCierre,
      filas,
      total,
      nombreFirmante: config.nombreFirmante,
      puesto: config.puesto,
      firmaDataUrl: firma,
    }),
  );

  const actualizado = await prisma.manifiesto.update({
    where: { id },
    data: {
      nombreFirmante: config.nombreFirmante,
      puesto: config.puesto,
      firmaDataUrl: firma,
      pdfData: new Uint8Array(buffer),
      totalKg: total,
      estatus: "generado",
      generadoAt: new Date(),
    },
    select: {
      id: true,
      estatus: true,
      totalKg: true,
      generadoAt: true,
    },
  });

  return NextResponse.json(actualizado);
}
