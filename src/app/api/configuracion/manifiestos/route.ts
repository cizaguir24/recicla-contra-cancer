import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TEXTO_DEFAULT_INICIAL = [
  "Me complace dirigirme a usted para expresar nuestro más sincero agradecimiento por el valioso apoyo brindado por {nombre de la empresa} a nuestro proyecto Recicla Contra el Cáncer.",
  "Esta iniciativa sin fines de lucro tiene como objetivo contribuir al tratamiento de pacientes oncológicos de escasos recursos mediante la recolección y el reciclaje de tapas plásticas y aluminio. De esta manera, promovemos una doble cultura de responsabilidad social: apoyar la lucha contra el cáncer y contribuir al cuidado de nuestro planeta.",
  "Con el paso del tiempo, la incidencia de enfermedades neoplásicas en nuestra comunidad continúa en aumento, mientras que los tratamientos contra el cáncer representan un costo considerable para los pacientes y sus familias. Por esta razón, la colaboración de benefactores como ustedes resulta fundamental para impulsar iniciativas que contribuyen a mejorar la calidad de vida de los pacientes y, al mismo tiempo, fomentan la sostenibilidad ambiental.",
].join("\n\n");

const TEXTO_DEFAULT_CIERRE =
  "Agradezco nuevamente su apoyo y quedo a su disposición para cualquier consulta adicional.";

export async function GET() {
  const config = await prisma.configuracionManifiesto.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      textoDefault: TEXTO_DEFAULT_INICIAL,
      textoCierreDefault: TEXTO_DEFAULT_CIERRE,
    },
    update: {},
  });
  return NextResponse.json(config);
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();

  const data: {
    textoDefault?: string;
    textoCierreDefault?: string;
    nombreFirmante?: string;
    puesto?: string;
    firmaDataUrl?: string | null;
  } = {};
  if ("textoDefault" in body) data.textoDefault = body.textoDefault;
  if ("textoCierreDefault" in body) data.textoCierreDefault = body.textoCierreDefault;
  if ("nombreFirmante" in body) data.nombreFirmante = body.nombreFirmante;
  if ("puesto" in body) data.puesto = body.puesto;
  if ("firmaDataUrl" in body) data.firmaDataUrl = body.firmaDataUrl || null;

  const config = await prisma.configuracionManifiesto.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      textoDefault: data.textoDefault ?? TEXTO_DEFAULT_INICIAL,
      textoCierreDefault: data.textoCierreDefault ?? TEXTO_DEFAULT_CIERRE,
    },
    update: data,
  });
  return NextResponse.json(config);
}
