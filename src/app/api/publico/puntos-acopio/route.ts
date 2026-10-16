import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Buscador público de Puntos de Acopio (sin sesión, para compartir por
// WhatsApp/redes) — sin caché, sin indexar, y el filtro de qué se puede
// ver vive aquí mismo, nunca en el cliente. Nunca expone
// responsable/contacto ni acepta ningún método que no sea GET.
//
// Dos filtros, los dos obligatorios:
// - visibilidad != "Privada": NULL/"Pública" se trata como pública — un
//   punto marcado "Privada" nunca debe salir de aquí, sin excepción.
// - activo: un punto que ya no recibe material no debería mandarse a
//   alguien buscando dónde entregar el suyo.
export async function GET() {
  const puntos = await prisma.puntoAcopio.findMany({
    // OJO: "NOT: { visibilidad: 'Privada' }" se traduce a un <> de SQL, que
    // por las reglas de NULL de SQL excluye también las filas con
    // visibilidad NULL (ninguna comparación con NULL es verdadera) — el
    // OR explícito es la única forma correcta de tratar "sin marcar" como
    // público.
    where: { activo: true, OR: [{ visibilidad: null }, { visibilidad: { not: "Privada" } }] },
    select: {
      id: true,
      nombre: true,
      direccion: true,
      zona: true,
      estado: true,
      materiales: true,
      lat: true,
      lng: true,
    },
    orderBy: { nombre: "asc" },
  });

  return NextResponse.json(puntos, {
    headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}
