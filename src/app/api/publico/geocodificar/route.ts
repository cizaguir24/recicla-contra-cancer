import { NextRequest, NextResponse } from "next/server";
import { geocodificarDireccion } from "@/lib/geocode";

// Geocodifica una dirección escrita por quien visita el buscador público,
// para poder ordenar los centros de acopio por cercanía. Sin sesión, de
// solo lectura hacia Nominatim — nunca guarda ni expone nada de quien busca.
export async function GET(request: NextRequest) {
  const direccion = request.nextUrl.searchParams.get("direccion")?.trim();
  if (!direccion) {
    return NextResponse.json({ error: "Escribe una dirección o colonia" }, { status: 400 });
  }

  const coords = await geocodificarDireccion(direccion);
  if (!coords) {
    return NextResponse.json({ error: "No encontramos esa dirección" }, { status: 404 });
  }

  return NextResponse.json(coords, { headers: { "Cache-Control": "no-store" } });
}
