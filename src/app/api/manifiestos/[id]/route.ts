import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

const SELECT_DETALLE = {
  id: true,
  puntoAcopioId: true,
  fechaManifiesto: true,
  fechaInicioPeriodo: true,
  fechaFinPeriodo: true,
  dirigidoA: true,
  dirigidoAPuesto: true,
  nombreFirmante: true,
  puesto: true,
  texto: true,
  textoCierre: true,
  firmaDataUrl: true,
  totalKg: true,
  estatus: true,
  generadoAt: true,
  eliminadoAt: true,
  createdAt: true,
  updatedAt: true,
  puntoAcopio: {
    select: { id: true, nombre: true, direccion: true, zona: true, estado: true },
  },
} as const;

export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const manifiesto = await prisma.manifiesto.findUnique({
    where: { id },
    select: SELECT_DETALLE,
  });
  if (!manifiesto || manifiesto.eliminadoAt) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json(manifiesto);
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const body = await request.json();

  const actual = await prisma.manifiesto.findUnique({ where: { id } });
  if (!actual || actual.eliminadoAt) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (actual.estatus !== "borrador") {
    return NextResponse.json(
      { error: "Un manifiesto generado no se puede modificar. Duplícalo para hacer ajustes." },
      { status: 400 },
    );
  }

  const fechaInicioPeriodo = body.fechaInicioPeriodo
    ? new Date(body.fechaInicioPeriodo)
    : actual.fechaInicioPeriodo;
  const fechaFinPeriodo = body.fechaFinPeriodo
    ? new Date(body.fechaFinPeriodo)
    : actual.fechaFinPeriodo;
  if (fechaFinPeriodo < fechaInicioPeriodo) {
    return NextResponse.json(
      { error: "La fecha final no puede ser anterior a la fecha inicial" },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};
  if ("puntoAcopioId" in body) data.puntoAcopioId = body.puntoAcopioId;
  if ("fechaManifiesto" in body) data.fechaManifiesto = new Date(body.fechaManifiesto);
  if ("fechaInicioPeriodo" in body) data.fechaInicioPeriodo = fechaInicioPeriodo;
  if ("fechaFinPeriodo" in body) data.fechaFinPeriodo = fechaFinPeriodo;
  if ("dirigidoA" in body) data.dirigidoA = body.dirigidoA;
  if ("dirigidoAPuesto" in body) data.dirigidoAPuesto = body.dirigidoAPuesto;
  if ("nombreFirmante" in body) data.nombreFirmante = body.nombreFirmante;
  if ("puesto" in body) data.puesto = body.puesto;
  if ("texto" in body) data.texto = body.texto;
  if ("textoCierre" in body) data.textoCierre = body.textoCierre;
  if ("firmaDataUrl" in body) data.firmaDataUrl = body.firmaDataUrl || null;

  const manifiesto = await prisma.manifiesto.update({
    where: { id },
    data,
    select: SELECT_DETALLE,
  });
  return NextResponse.json(manifiesto);
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const actual = await prisma.manifiesto.findUnique({ where: { id } });
  if (!actual || actual.eliminadoAt) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  if (actual.estatus === "generado") {
    // Un manifiesto generado es un documento oficial: se cancela, no se borra.
    await prisma.manifiesto.update({ where: { id }, data: { estatus: "cancelado" } });
  } else {
    // Un borrador se mueve a la papelera; se purga definitivamente a los 15 días.
    await prisma.manifiesto.update({ where: { id }, data: { eliminadoAt: new Date() } });
  }
  return NextResponse.json({ ok: true });
}
