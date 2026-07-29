export type Permisos = {
  puntosAcopio: boolean;
  fechasAcopio: boolean;
  sincronizarNotion: boolean;
  configuracion: boolean;
  manifiestos: boolean;
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
};
