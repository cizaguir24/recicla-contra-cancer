import { NextResponse } from "next/server";
import { sincronizarNotion } from "@/lib/sync-notion";

// Geocodificar direcciones nuevas respeta 1 solicitud/segundo (Nominatim),
// así que el sync puede tardar más que el límite por defecto.
export const maxDuration = 300;

export async function POST() {
  const resultado = await sincronizarNotion();
  return NextResponse.json(resultado);
}
