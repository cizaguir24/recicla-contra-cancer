import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { quedaSinAccesoConfiguracion } from "@/lib/permisos-guard";

type Context = { params: Promise<{ id: string }> };

const SELECT_SIN_PASSWORD = {
  id: true,
  name: true,
  email: true,
  activo: true,
  role: { select: { id: true, nombre: true } },
} as const;

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const body = await request.json();

  const usuario = await prisma.user.findUnique({ where: { id }, include: { role: true } });
  if (!usuario) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  let nuevoRole = usuario.role;
  if (body.roleId && body.roleId !== usuario.roleId) {
    const role = await prisma.role.findUnique({ where: { id: body.roleId } });
    if (!role) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }
    nuevoRole = role;
  }

  const dejaDeTenerAcceso =
    usuario.activo &&
    usuario.role.configuracion &&
    (body.activo === false || !nuevoRole.configuracion);

  if (dejaDeTenerAcceso && (await quedaSinAccesoConfiguracion({ excluirUserId: id }))) {
    return NextResponse.json(
      { error: "Debe existir al menos un usuario activo con acceso a Configuración" },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {
    name: body.name,
    email: body.email,
    roleId: body.roleId,
    activo: body.activo,
  };
  if (body.password) {
    data.password = await bcrypt.hash(body.password, 10);
  }

  try {
    const actualizado = await prisma.user.update({
      where: { id },
      data,
      select: SELECT_SIN_PASSWORD,
    });
    return NextResponse.json(actualizado);
  } catch {
    return NextResponse.json({ error: "Ya existe un usuario con ese email" }, { status: 409 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const { id } = await params;

  const usuario = await prisma.user.findUnique({ where: { id }, include: { role: true } });
  if (!usuario) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  const dejaDeTenerAcceso = usuario.activo && usuario.role.configuracion;
  if (dejaDeTenerAcceso && (await quedaSinAccesoConfiguracion({ excluirUserId: id }))) {
    return NextResponse.json(
      { error: "Debe existir al menos un usuario activo con acceso a Configuración" },
      { status: 400 },
    );
  }

  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
