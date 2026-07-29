import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

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

  // Solo se incluyen las llaves presentes en el body, para soportar
  // actualizaciones parciales (ej. desde la tarjeta de Desempeño) sin
  // borrar campos que ese formulario no envía.
  const data: Prisma.PuntoAcopioUpdateInput = {};
  if ("nombre" in body) data.nombre = body.nombre;
  if ("direccion" in body) data.direccion = body.direccion;
  if ("zona" in body) data.zona = body.zona || null;
  if ("materiales" in body) data.materiales = body.materiales;
  if ("responsable" in body) data.responsable = body.responsable || null;
  if ("contacto" in body) data.contacto = body.contacto || null;
  if ("activo" in body) data.activo = body.activo;
  if ("estado" in body) data.estado = body.estado || null;
  if ("tipoContenedor" in body) data.tipoContenedor = body.tipoContenedor || null;
  if ("decisionReubicacion" in body) data.decisionReubicacion = body.decisionReubicacion || null;
  if ("numeroCelular" in body) data.numeroCelular = body.numeroCelular || null;
  if ("correoElectronico" in body) data.correoElectronico = body.correoElectronico || null;

  const punto = await prisma.puntoAcopio.update({ where: { id }, data });

  return NextResponse.json(punto);
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  await prisma.puntoAcopio.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
