import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISOS_KEYS } from "@/lib/roles";

function permisosDelBody(body: Record<string, unknown>) {
  const permisos: Record<string, boolean> = {};
  for (const key of PERMISOS_KEYS) {
    permisos[key] = Boolean(body[key]);
  }
  return permisos;
}

export async function GET() {
  const roles = await prisma.role.findMany({
    include: { _count: { select: { usuarios: true } } },
    orderBy: { nombre: "asc" },
  });
  return NextResponse.json(roles);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.nombre || typeof body.nombre !== "string") {
    return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
  }

  try {
    const role = await prisma.role.create({
      data: {
        nombre: body.nombre,
        esSistema: false,
        ...permisosDelBody(body),
      },
    });
    return NextResponse.json(role, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ya existe un rol con ese nombre" }, { status: 409 });
  }
}
