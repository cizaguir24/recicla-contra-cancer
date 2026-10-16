// Puntos de acopio vinculados a una página de Notion que ya no aparece en la
// base de Ubicaciones (la borraron o la movieron). Solo se REPORTAN: nunca se
// modifican ni se eliminan automáticamente. Se omiten los ya inactivos (ya
// fueron atendidos) y, por seguridad, si Notion devolvió cero páginas (señal de
// un fallo de lectura, no de que se borró todo).
export function detectarHuerfanos<T extends { notionPageId: string | null; activo: boolean }>(
  puntos: T[],
  idsNotion: Set<string>,
): T[] {
  if (idsNotion.size === 0) return [];
  return puntos.filter(
    (p) => p.activo && p.notionPageId !== null && !idsNotion.has(p.notionPageId),
  );
}
