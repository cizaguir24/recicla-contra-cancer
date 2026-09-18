export type Permisos = {
  puntosAcopio: boolean;
  fechasAcopio: boolean;
  sincronizarNotion: boolean;
  configuracion: boolean;
  manifiestos: boolean;
  // No es un permiso configurable por rol (no aparece en PERMISOS_KEYS): es
  // "true" solo para el rol protegido Administrador, para acciones que ningún
  // otro rol debe tener aunque tenga el permiso general (ej. eliminar puntos
  // de acopio).
  esAdministrador: boolean;
};

export const PERMISOS_KEYS = [
  "puntosAcopio",
  "fechasAcopio",
  "sincronizarNotion",
  "configuracion",
  "manifiestos",
] as const;

export const PERMISOS_LABELS: Record<(typeof PERMISOS_KEYS)[number], string> = {
  puntosAcopio: "Puntos de Acopio",
  fechasAcopio: "Fechas de Acopio",
  sincronizarNotion: "Sincronizar con Notion",
  configuracion: "Configuración",
  manifiestos: "Manifiestos",
};

export const PERMISOS_VACIOS: Permisos = {
  puntosAcopio: false,
  fechasAcopio: false,
  sincronizarNotion: false,
  configuracion: false,
  manifiestos: false,
  esAdministrador: false,
};
