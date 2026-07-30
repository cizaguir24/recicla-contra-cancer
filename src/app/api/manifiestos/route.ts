import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SELECT_LISTA = {
  id: true,
  puntoAcopioId: true,
  fechaManifiesto: true,
  fechaInicioPeriodo: true,
  fechaFinPeriodo: true,
  dirigidoA: true,
  dirigidoAPuesto: true,
  nombreFirmante: true,
  puesto: true,
  totalKg: true,
  estatus: true,
  generadoAt: true,
  createdAt: true,
  puntoAcopio: { select: { id: true, nombre: true, zona: true } },
} as const;

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const puntoAcopioId = searchParams.get("puntoAcopioId");
  const estatus = searchParams.get("estatus");
  const q = searchParams.get("q")?.trim();
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const manifiestos = await prisma.manifiesto.findMany({
    where: {
      eliminadoAt: null,
      ...(puntoAcopioId && { puntoAcopioId }),
      ...(estatus && { estatus }),
      ...((desde || hasta) && {
        fechaManifiesto: {
          ...(desde && { gte: new Date(desde) }),
          ...(hasta && { lte: new Date(`${hasta}T23:59:59`) }),
        },
      }),
      ...(q && {
        OR: [
          { dirigidoA: { contains: q } },
          { nombreFirmante: { contains: q } },
          { puntoAcopio: { nombre: { contains: q } } },
        ],
      }),
    },
    select: SELECT_LISTA,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(manifiestos);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.puntoAcopioId) {
    return NextResponse.json({ error: "Falta el punto de acopio" }, { status: 400 });
  }
  if (!body.fechaInicioPeriodo || !body.fechaFinPeriodo) {
    return NextResponse.json({ error: "Faltan las fechas del periodo" }, { status: 400 });
  }
  if (new Date(body.fechaFinPeriodo) < new Date(body.fechaInicioPeriodo)) {
    return NextResponse.json(
      { error: "La fecha final no puede ser anterior a la fecha inicial" },
      { status: 400 },
    );
  }

  // Nombre, puesto y firma de quien emite son fijos: se toman siempre del
  // valor vigente en Configuración, no de lo que mande el cliente.
  const config = await prisma.configuracionManifiesto.findUnique({ where: { id: "singleton" } });

  const manifiesto = await prisma.manifiesto.create({
    data: {
      puntoAcopioId: body.puntoAcopioId,
      fechaManifiesto: body.fechaManifiesto ? new Date(body.fechaManifiesto) : new Date(),
      fechaInicioPeriodo: new Date(body.fechaInicioPeriodo),
      fechaFinPeriodo: new Date(body.fechaFinPeriodo),
      titulo: "",
      dirigidoA: body.dirigidoA || "",
      dirigidoAPuesto: body.dirigidoAPuesto || "",
      nombreFirmante: config?.nombreFirmante || "",
      puesto: config?.puesto || "",
      texto: body.texto || "",
      textoCierre: body.textoCierre || "",
      firmaDataUrl: config?.firmaDataUrl || null,
      estatus: "borrador",
    },
    select: SELECT_LISTA,
  });

  return NextResponse.json(manifiesto, { status: 201 });
}
