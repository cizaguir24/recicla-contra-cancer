import { NextResponse } from "next/server";
import { obtenerDesempeno } from "@/lib/desempeno-data";

export async function GET() {
  const filas = await obtenerDesempeno();
  return NextResponse.json({ filas });
}
