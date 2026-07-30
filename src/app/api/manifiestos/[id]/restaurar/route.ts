import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Context = { params: Promise<{ id: string }> };

export async function POST(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const actual = await prisma.manifiesto.findUnique({ where: { id } });
  if (!actual || !actual.eliminadoAt) {
    return NextResponse.json({ error: "No está en la papelera" }, { status: 404 });
  }

  const manifiesto = await prisma.manifiesto.update({
    where: { id },
    data: { eliminadoAt: null },
  });

  return NextResponse.json(manifiesto);
}
