import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { FechasAcopioDocument } from "@/lib/fechas-acopio-pdf";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const estado = searchParams.get("estado");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");

  const [fechas, config] = await Promise.all([
    prisma.fechaAcopio.findMany({
      where: {
        ...(estado && { estado }),
        ...((desde || hasta) && {
          fecha: {
            ...(desde && { gte: new Date(desde) }),
            ...(hasta && { lte: new Date(`${hasta}T23:59:59`) }),
          },
        }),
      },
      include: { puntoAcopio: true },
      orderBy: { fecha: "desc" },
    }),
    prisma.configuracionManifiesto.findUnique({ where: { id: "singleton" } }),
  ]);

  const buffer = await renderToBuffer(
    FechasAcopioDocument({
      logotipoDataUrl: config?.logotipoDataUrl ?? null,
      filtros: { estado, desde, hasta },
      fechas: fechas.map((f) => ({
        id: f.id,
        puntoAcopioNombre: f.puntoAcopio.nombre,
        fecha: f.fecha.toISOString(),
        estado: f.estado,
        notas: f.notas,
      })),
    }),
  );

  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Fechas_de_Acopio_${fecha}.pdf"`,
    },
  });
}
