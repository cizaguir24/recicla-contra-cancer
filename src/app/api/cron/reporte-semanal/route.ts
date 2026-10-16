import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { obtenerDesempeno } from "@/lib/desempeno-data";
import { enviarReporteSemanal } from "@/lib/reporte-semanal-email";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [filas, inactivos] = await Promise.all([
    obtenerDesempeno(),
    prisma.puntoAcopio.findMany({
      where: { activo: false },
      select: { id: true, nombre: true, zona: true, responsable: true, numeroCelular: true, contacto: true },
      orderBy: { nombre: "asc" },
    }),
  ]);

  const enRojo = filas.filter((f) => f.semaforo.label === "Rosa");
  const inactivosMapeados = inactivos.map((p) => ({
    id: p.id,
    nombre: p.nombre,
    municipio: p.zona,
    responsable: p.responsable,
    numeroCelular: p.numeroCelular,
    contacto: p.contacto,
  }));

  await enviarReporteSemanal(enRojo, inactivosMapeados);

  return NextResponse.json({ enviado: true, enRojo: enRojo.length, inactivos: inactivosMapeados.length });
}
