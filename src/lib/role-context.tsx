"use client";

import { createContext, useContext } from "react";
import { PERMISOS_VACIOS, type Permisos } from "@/lib/roles";

const PermisosContext = createContext<Permisos>(PERMISOS_VACIOS);

export function PermisosProvider({
  permisos,
  children,
}: {
  permisos: Permisos;
  children: React.ReactNode;
}) {
  return <PermisosContext.Provider value={permisos}>{children}</PermisosContext.Provider>;
}

export function usePermisos() {
  return useContext(PermisosContext);
}
