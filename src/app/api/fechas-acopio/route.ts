import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const puntoAcopioId = searchParams.get("puntoAcopioId");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const fechas = await prisma.fechaAcopio.findMany({
    where: {
      ...(puntoAcopioId && { puntoAcopioId }),
      ...((desde || hasta) && {
        fecha: {
          ...(desde && { gte: new Date(desde) }),
          ...(hasta && { lte: new Date(`${hasta}T23:59:59`) }),
        },
      }),
    },
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
