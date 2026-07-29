import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const puntos = await prisma.puntoAcopio.findMany({
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json(puntos);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  const punto = await prisma.puntoAcopio.create({
    data: {
      nombre: body.nombre,
      direccion: body.direccion,
      zona: body.zona || null,
      materiales: body.materiales,
      responsable: body.responsable || null,
      contacto: body.contacto || null,
      estado: body.estado || null,
      activo: body.activo ?? true,
    },
  });

  return NextResponse.json(punto, { status: 201 });
}
