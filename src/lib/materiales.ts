// Materiales aceptados por un punto de acopio. En la app son texto
// ("Tapas, PET, Aluminio"); en Notion, una selección múltiple. Una sola regla
// compartida por el sync (Notion -> app) y el espejo (app -> Notion).

export const MATERIALES_OPCIONES = ["Tapas", "PET", "Aluminio"];

// Lista canónica (en el orden de MATERIALES_OPCIONES) de los materiales
// reconocidos en un texto o lista; ignora mayúsculas y cualquier otro texto.
export function materialesCanonicos(valor: string | string[] | null | undefined): string[] {
  const partes = (Array.isArray(valor) ? valor : (valor ?? "").split(","))
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return MATERIALES_OPCIONES.filter((op) => partes.includes(op.toLowerCase()));
}

export function materialesATexto(lista: string[]): string {
  return lista.join(", ");
}

// Dos textos de materiales son equivalentes si reconocen los mismos materiales
// ("tapas, PET, aluminio" == "Tapas, PET, Aluminio").
export function mismosMateriales(a: string | null | undefined, b: string | null | undefined): boolean {
  return materialesATexto(materialesCanonicos(a)) === materialesATexto(materialesCanonicos(b));
}
