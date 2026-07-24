import { NextResponse } from "next/server";
import { sincronizarNotion } from "@/lib/sync-notion";

export async function POST() {
  const resultado = await sincronizarNotion();
  return NextResponse.json(resultado);
}
