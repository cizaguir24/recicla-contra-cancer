import { prisma } from "@/lib/prisma";

export async function quedaSinAccesoConfiguracion(opts: {
  excluirUserId?: string;
  excluirRoleId?: string;
}) {
  const otros = await prisma.user.count({
    where: {
      activo: true,
      ...(opts.excluirUserId && { id: { not: opts.excluirUserId } }),
      role: {
        configuracion: true,
        ...(opts.excluirRoleId && { id: { not: opts.excluirRoleId } }),
      },
    },
  });
  return otros === 0;
}
