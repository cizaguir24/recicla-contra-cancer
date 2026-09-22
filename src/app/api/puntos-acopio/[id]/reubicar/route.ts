import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { setSelectProperty } from "@/lib/notion";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const movimientos = await prisma.movimientoReubicacion.findMany({
    where: { OR: [{ puntoOrigenId: id }, { puntoDestinoId: id }] },
    include: {
      puntoOrigen: { select: { nombre: true } },
      puntoDestino: { select: { nombre: true } },
      usuario: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(movimientos);
}

export async function POST(request: NextRequest, { params }: Context) {
  const { id: puntoOrigenId } = await params;
  const body = await request.json();
  const puntoDestinoId = body.puntoDestinoId as string | undefined;
  const motivo = (body.motivo as string | undefined)?.trim() || null;

  const session = await auth();
  const usuarioId = session?.user?.id;
  if (!usuarioId) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  if (!puntoDestinoId) {
    return NextResponse.json({ error: "Falta el punto de acopio destino" }, { status: 400 });
  }
  if (puntoDestinoId === puntoOrigenId) {
    return NextResponse.json(
      { error: "El origen y el destino no pueden ser el mismo punto de acopio" },
      { status: 400 },
    );
  }

  const [origen, destino] = await Promise.all([
    prisma.puntoAcopio.findUnique({ where: { id: puntoOrigenId } }),
    prisma.puntoAcopio.findUnique({ where: { id: puntoDestinoId } }),
  ]);

  if (!origen) {
    return NextResponse.json({ error: "El punto de acopio origen no existe" }, { status: 404 });
  }
  if (!destino) {
    return NextResponse.json({ error: "El punto de acopio destino no existe" }, { status: 404 });
  }
  if (!destino.activo) {
    return NextResponse.json(
      { error: "El punto de acopio destino no está activo" },
      { status: 400 },
    );
  }
  if (!origen.tipoContenedor) {
    return NextResponse.json(
      { error: "El punto de acopio origen no tiene un contenedor asignado para reubicar" },
      { status: 400 },
    );
  }

  const tipoContenedor = origen.tipoContenedor;

  const [origenActualizado, destinoActualizado, movimiento] = await prisma.$transaction([
    prisma.puntoAcopio.update({
      where: { id: puntoOrigenId },
      data: { tipoContenedor: null, activo: false, decisionReubicacion: null },
    }),
    prisma.puntoAcopio.update({
      where: { id: puntoDestinoId },
      data: { tipoContenedor },
    }),
    prisma.movimientoReubicacion.create({
      data: { puntoOrigenId, puntoDestinoId, tipoContenedor, motivo, usuarioId },
    }),
  ]);

  // Reflejar el movimiento en Notion (mismo patrón que Activo/Inactivo):
  // best-effort, no revierte la operación ya guardada si falla.
  await Promise.all([
    origen.notionPageId
      ? Promise.all([
          setSelectProperty(origen.notionPageId, "Tipo de contenedor", null),
          setSelectProperty(origen.notionPageId, "Decisión de Reubicación", null),
        ]).catch((err) => console.error("No se pudo reflejar el origen en Notion:", err))
      : null,
    destino.notionPageId
      ? setSelectProperty(destino.notionPageId, "Tipo de contenedor", tipoContenedor).catch((err) =>
          console.error("No se pudo reflejar el destino en Notion:", err),
        )
      : null,
  ]);

  return NextResponse.json({ origen: origenActualizado, destino: destinoActualizado, movimiento });
}
