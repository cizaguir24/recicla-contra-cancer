import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const original = await prisma.manifiesto.findUnique({ where: { id } });
  if (!original) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const copia = await prisma.manifiesto.create({
    data: {
      puntoAcopioId: original.puntoAcopioId,
      fechaManifiesto: new Date(),
      fechaInicioPeriodo: original.fechaInicioPeriodo,
      fechaFinPeriodo: original.fechaFinPeriodo,
      titulo: "",
      dirigidoA: original.dirigidoA,
      nombreFirmante: original.nombreFirmante,
      puesto: original.puesto,
      texto: original.texto,
      textoCierre: original.textoCierre,
      firmaDataUrl: original.firmaDataUrl,
      estatus: "borrador",
    },
  });

  return NextResponse.json(copia, { status: 201 });
}
