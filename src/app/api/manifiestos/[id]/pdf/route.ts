import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

function nombreArchivo(puntoNombre: string, fecha: Date) {
  const slug = puntoNombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  // Fecha se guarda como medianoche UTC; se formatea en UTC para no recorrerse
  // un día según la zona horaria del servidor.
  const dd = String(fecha.getUTCDate()).padStart(2, "0");
  const mm = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = fecha.getUTCFullYear();
  return `Manifiesto_${slug}_${dd}-${mm}-${yyyy}.pdf`;
}

export async function GET(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const descargar = request.nextUrl.searchParams.get("download") === "1";

  const manifiesto = await prisma.manifiesto.findUnique({
    where: { id },
    include: { puntoAcopio: { select: { nombre: true } } },
  });
  if (!manifiesto || !manifiesto.pdfData) {
    return NextResponse.json({ error: "PDF no disponible" }, { status: 404 });
  }

  const filename = nombreArchivo(manifiesto.puntoAcopio.nombre, manifiesto.fechaManifiesto);

  return new NextResponse(new Uint8Array(manifiesto.pdfData), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${descargar ? "attachment" : "inline"}; filename="${filename}"`,
    },
  });
}
