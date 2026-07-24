import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

const SELECT_SIN_PASSWORD = {
  id: true,
  name: true,
  email: true,
  activo: true,
  role: { select: { id: true, nombre: true } },
} as const;

export async function GET() {
  const usuarios = await prisma.user.findMany({
    select: SELECT_SIN_PASSWORD,
    orderBy: { name: "asc" },
  });
  return NextResponse.json(usuarios);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.roleId) {
    return NextResponse.json({ error: "El rol es obligatorio" }, { status: 400 });
  }
  const role = await prisma.role.findUnique({ where: { id: body.roleId } });
  if (!role) {
    return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
  }
  if (!body.password) {
    return NextResponse.json({ error: "La contraseña es obligatoria" }, { status: 400 });
  }

  const password = await bcrypt.hash(body.password, 10);

  try {
    const usuario = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password,
        roleId: body.roleId,
        activo: body.activo ?? true,
      },
      select: SELECT_SIN_PASSWORD,
    });
    return NextResponse.json(usuario, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
  }
}
