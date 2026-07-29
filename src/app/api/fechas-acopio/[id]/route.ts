import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const fecha = await prisma.fechaAcopio.findUnique({
    where: { id },
    include: { puntoAcopio: true },
  });
  if (!fecha) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json(fecha);
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const body = await request.json();

  const fecha = await prisma.fechaAcopio.update({
    where: { id },
    data: {
      puntoAcopioId: body.puntoAcopioId,
      fecha: new Date(body.fecha),
      estado: body.estado,
      notas: body.notas || null,
    },
  });

  return NextResponse.json(fecha);
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  await prisma.fechaAcopio.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
