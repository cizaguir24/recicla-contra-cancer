import { NextRequest, NextResponse } from "next/server";
import { sincronizarNotion } from "@/lib/sync-notion";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const resultado = await sincronizarNotion();
  return NextResponse.json(resultado);
}
