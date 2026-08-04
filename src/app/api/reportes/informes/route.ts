import { NextRequest, NextResponse } from "next/server";
import { obtenerInformes } from "@/lib/informes-data";

export async function GET(request: NextRequest) {
  const respuesta = await obtenerInformes(request.nextUrl.searchParams);
  return NextResponse.json(respuesta);
}
