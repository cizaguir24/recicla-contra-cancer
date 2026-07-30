import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { ManifiestoDocument } from "@/lib/manifiesto-pdf";
import { expandirAcopiosPorMaterial, totalKgDeFilas } from "@/lib/manifiestos";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Context) {
  const { id } = await params;

  const manifiesto = await prisma.manifiesto.findUnique({
    where: { id },
    include: { puntoAcopio: true },
  });
  if (!manifiesto) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (manifiesto.estatus !== "borrador") {
    return NextResponse.json(
      { error: "Este manifiesto ya fue generado y no se puede volver a generar" },
      { status: 400 },
    );
  }

  const faltantes: string[] = [];
  if (!manifiesto.puntoAcopioId) faltantes.push("punto de acopio");
  if (!manifiesto.titulo) faltantes.push("título");
  if (!manifiesto.nombreFirmante) faltantes.push("nombre del firmante");
  if (!manifiesto.puesto) faltantes.push("puesto");
  if (!manifiesto.texto) faltantes.push("texto");
  if (!manifiesto.firmaDataUrl) faltantes.push("firma");
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
    manifiesto.puntoAcopio.direccion,
    manifiesto.puntoAcopio.zona,
    manifiesto.puntoAcopio.estado,
  ]
    .filter(Boolean)
    .join(", ");

  const buffer = await renderToBuffer(
    ManifiestoDocument({
      titulo: manifiesto.titulo,
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
      nombreFirmante: manifiesto.nombreFirmante,
      puesto: manifiesto.puesto,
      firmaDataUrl: manifiesto.firmaDataUrl,
    }),
  );

  const actualizado = await prisma.manifiesto.update({
    where: { id },
    data: {
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
