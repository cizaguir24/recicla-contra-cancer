import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PERMISOS_KEYS } from "@/lib/roles";
import { quedaSinAccesoConfiguracion } from "@/lib/permisos-guard";

type Context = { params: Promise<{ id: string }> };

function permisosDelBody(body: Record<string, unknown>) {
  const permisos: Record<string, boolean> = {};
  for (const key of PERMISOS_KEYS) {
    if (body[key] !== undefined) permisos[key] = Boolean(body[key]);
  }
  return permisos;
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const body = await request.json();

  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) {
    return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });
  }
  if (role.esSistema) {
    return NextResponse.json(
      { error: "El rol Administrador no se puede editar" },
      { status: 400 },
    );
  }

  if (role.configuracion && body.configuracion === false) {
    if (await quedaSinAccesoConfiguracion({ excluirRoleId: id })) {
      return NextResponse.json(
        { error: "Debe existir al menos un usuario activo con acceso a Configuración" },
        { status: 400 },
      );
    }
  }

  try {
    const actualizado = await prisma.role.update({
      where: { id },
      data: {
        ...(body.nombre && { nombre: body.nombre }),
        ...permisosDelBody(body),
      },
    });
    return NextResponse.json(actualizado);
  } catch {
    return NextResponse.json({ error: "Ya existe un rol con ese nombre" }, { status: 409 });
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const { id } = await params;

  const role = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { usuarios: true } } },
  });
  if (!role) {
    return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });
  }
  if (role.esSistema) {
    return NextResponse.json(
      { error: "El rol Administrador no se puede eliminar" },
      { status: 400 },
    );
  }
  if (role._count.usuarios > 0) {
    return NextResponse.json(
      { error: "Reasigna los usuarios de este rol antes de eliminarlo" },
      { status: 400 },
    );
  }

  await prisma.role.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
