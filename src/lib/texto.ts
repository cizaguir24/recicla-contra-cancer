// Normaliza texto para comparar sin distinguir mayúsculas/minúsculas ni acentos.
export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export function coincideBusqueda(busqueda: string, ...campos: (string | null | undefined)[]): boolean {
  const termino = normalizarTexto(busqueda);
  if (!termino) return true;
  return campos.some((campo) => campo && normalizarTexto(campo).includes(termino));
}
