import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const { conservarId, eliminarIds } = await request.json();

  if (!conservarId || !Array.isArray(eliminarIds) || eliminarIds.length === 0) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const conservar = await prisma.fechaAcopio.findUnique({ where: { id: conservarId } });
  if (!conservar) {
    return NextResponse.json({ error: "No se encontró la fecha a conservar" }, { status: 404 });
  }

  const aEliminar = await prisma.fechaAcopio.findMany({
    where: { id: { in: eliminarIds } },
  });
  if (aEliminar.length !== eliminarIds.length) {
    return NextResponse.json({ error: "Alguna fecha a fusionar no existe" }, { status: 404 });
  }
  if (aEliminar.some((f) => f.puntoAcopioId !== conservar.puntoAcopioId)) {
    return NextResponse.json(
      { error: "Todas las fechas a fusionar deben ser del mismo punto de acopio" },
      { status: 400 },
    );
  }

  await prisma.fechaAcopio.deleteMany({ where: { id: { in: eliminarIds } } });

  return NextResponse.json({ conservada: conservar.id, eliminadas: eliminarIds.length });
}
