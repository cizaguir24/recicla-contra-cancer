import { DefaultSession } from "next-auth";
import type { Permisos } from "@/lib/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleName: string;
      permisos: Permisos;
    } & DefaultSession["user"];
  }

  interface User {
    roleName: string;
    permisos: Permisos;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roleName: string;
    permisos: Permisos;
  }
}
