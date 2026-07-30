import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const original = await prisma.manifiesto.findUnique({ where: { id } });
  if (!original) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // Nombre, puesto y firma de quien emite son fijos: se toman siempre del
  // valor vigente en Configuración, no de lo que tenía el original.
  const config = await prisma.configuracionManifiesto.findUnique({ where: { id: "singleton" } });

  const copia = await prisma.manifiesto.create({
    data: {
      puntoAcopioId: original.puntoAcopioId,
      fechaManifiesto: new Date(),
      fechaInicioPeriodo: original.fechaInicioPeriodo,
      fechaFinPeriodo: original.fechaFinPeriodo,
      titulo: "",
      dirigidoA: original.dirigidoA,
      dirigidoAPuesto: original.dirigidoAPuesto,
      nombreFirmante: config?.nombreFirmante || "",
      puesto: config?.puesto || "",
      texto: original.texto,
      textoCierre: original.textoCierre,
      firmaDataUrl: config?.firmaDataUrl || null,
      estatus: "borrador",
    },
  });

  return NextResponse.json(copia, { status: 201 });
}
