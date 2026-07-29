import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import type { Permisos } from "@/lib/roles";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });
        if (!user) return null;
        if (!user.activo) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roleName: user.role.nombre,
          permisos: {
            puntosAcopio: user.role.puntosAcopio,
            fechasAcopio: user.role.fechasAcopio,
            sincronizarNotion: user.role.sincronizarNotion,
            configuracion: user.role.configuracion,
            manifiestos: user.role.manifiestos,
          },
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        const u = user as { id: string; roleName: string; permisos: Permisos };
        token.id = u.id;
        token.roleName = u.roleName;
        token.permisos = u.permisos;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.roleName = token.roleName as string;
        session.user.permisos = token.permisos as Permisos;
      }
      return session;
    },
  },
});
