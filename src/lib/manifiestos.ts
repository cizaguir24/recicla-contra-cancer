export type AcopioParaExpandir = {
  fecha: Date | string;
  petKg: number | null;
  tapasKg: number | null;
  aluminioKg: number | null;
  tapasWinsKg: number | null;
};

export type FilaAcopioManifiesto = {
  fecha: Date;
  material: string;
  kg: number;
};

// Cada FechaAcopio guarda kg por material en columnas separadas; el manifiesto
// necesita una fila por material (igual que el ejemplo de la especificación).
export function expandirAcopiosPorMaterial(fechas: AcopioParaExpandir[]): FilaAcopioManifiesto[] {
  const filas: FilaAcopioManifiesto[] = [];
  for (const f of fechas) {
    const fecha = new Date(f.fecha);
    if (f.petKg) filas.push({ fecha, material: "PET", kg: f.petKg });
    if (f.tapasKg) filas.push({ fecha, material: "Tapas plásticas", kg: f.tapasKg });
    if (f.aluminioKg) filas.push({ fecha, material: "Aluminio", kg: f.aluminioKg });
    if (f.tapasWinsKg) filas.push({ fecha, material: "Tapas Wins", kg: f.tapasWinsKg });
  }
  filas.sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  return filas;
}

export function totalKgDeFilas(filas: FilaAcopioManifiesto[]): number {
  return filas.reduce((suma, f) => suma + f.kg, 0);
}

export const ESTATUS_LABEL: Record<string, string> = {
  borrador: "Borrador",
  generado: "Generado",
  cancelado: "Cancelado",
};

export const ESTATUS_BADGE: Record<string, string> = {
  borrador: "bg-gray-100 text-gray-600",
  generado: "bg-green-100 text-green-700",
  cancelado: "bg-red-100 text-red-600",
};

// Un borrador o un manifiesto cancelado eliminado se conserva en la papelera
// este tiempo antes de purgarse definitivamente.
export const DIAS_RETENCION_PAPELERA = 15;
