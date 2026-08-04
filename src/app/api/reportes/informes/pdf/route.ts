import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/prisma";
import { obtenerInformes } from "@/lib/informes-data";
import { InformesDocument } from "@/lib/informes-pdf";

export async function GET(request: NextRequest) {
  const datos = await obtenerInformes(request.nextUrl.searchParams);
  const config = await prisma.configuracionManifiesto.findUnique({ where: { id: "singleton" } });

  const buffer = await renderToBuffer(
    InformesDocument({ logotipoDataUrl: config?.logotipoDataUrl ?? null, datos }),
  );

  const desde = datos.periodo.desde.slice(0, 10);
  const hasta = datos.periodo.hasta.slice(0, 10);
  const filename = `Informe_${desde}_a_${hasta}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
