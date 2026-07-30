import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DIAS_RETENCION_PAPELERA } from "@/lib/manifiestos";

const SELECT_PAPELERA = {
  id: true,
  puntoAcopioId: true,
  fechaInicioPeriodo: true,
  fechaFinPeriodo: true,
  dirigidoA: true,
  nombreFirmante: true,
  puesto: true,
  eliminadoAt: true,
  puntoAcopio: { select: { id: true, nombre: true, zona: true } },
} as const;

export async function GET() {
  const limite = new Date(Date.now() - DIAS_RETENCION_PAPELERA * 24 * 60 * 60 * 1000);

  // Purga definitiva de lo que ya cumplió los 15 días en la papelera.
  await prisma.manifiesto.deleteMany({
    where: { eliminadoAt: { lt: limite } },
  });

  const manifiestos = await prisma.manifiesto.findMany({
    where: { eliminadoAt: { not: null } },
    select: SELECT_PAPELERA,
    orderBy: { eliminadoAt: "desc" },
  });

  return NextResponse.json(manifiestos);
}
