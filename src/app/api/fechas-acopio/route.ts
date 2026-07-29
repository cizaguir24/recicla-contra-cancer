import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const fechas = await prisma.fechaAcopio.findMany({
    include: { puntoAcopio: true },
    orderBy: { fecha: "desc" },
  });
  return NextResponse.json(fechas);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const fecha = await prisma.fechaAcopio.create({
    data: {
      puntoAcopioId: body.puntoAcopioId,
      fecha: new Date(body.fecha),
      estado: body.estado || "programada",
      notas: body.notas || null,
    },
  });

  return NextResponse.json(fecha, { status: 201 });
}
