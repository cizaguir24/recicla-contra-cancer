import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const punto = await prisma.puntoAcopio.findUnique({ where: { id } });
  if (!punto) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json(punto);
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const body = await request.json();

  const punto = await prisma.puntoAcopio.update({
    where: { id },
    data: {
      nombre: body.nombre,
      direccion: body.direccion,
      zona: body.zona || null,
      materiales: body.materiales,
      responsable: body.responsable || null,
      contacto: body.contacto || null,
      activo: body.activo,
    },
  });

  return NextResponse.json(punto);
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  await prisma.puntoAcopio.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
