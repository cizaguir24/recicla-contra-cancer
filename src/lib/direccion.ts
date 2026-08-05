// Notion captura la dirección en 3 campos separados (Calle, Numero Exterior,
// Numero Interior) que se concatenan al sincronizar (ver sync-notion.ts). En
// varios registros el número de calle quedó escrito dos veces en Notion —
// una vez dentro de "Calle" y otra en "Numero Exterior" — lo que produce
// direcciones como "Coronel Calderon 777 #777". Esta función limpia esa
// duplicación SOLO para mostrarla (nunca se toca el dato guardado ni Notion).
function escaparRegExp(valor: string): string {
  return valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function limpiarDireccionDuplicada(direccion: string): string {
  let resultado = direccion;

  // "#<numero> Int. <mismo numero>" — el interior repite el exterior
  // (típicamente porque Notion copió el mismo valor a ambos campos).
  resultado = resultado.replace(/(#\s*([A-Za-z0-9.\-]+))\s+Int\.?\s*#?\2\b/i, "$1");

  // Cualquier "#<numero>" cuyo número ya haya aparecido antes en el texto
  // (como parte de la calle, o como otro marcador "#<numero>" anterior) se
  // considera redundante y se quita.
  const vistos = new Set<string>();
  resultado = resultado.replace(/#\s*([A-Za-z0-9.\-]+)\b/g, (marcador, numero: string, offset: number, cadena: string) => {
    const antes = cadena.slice(0, offset);
    const clave = numero.toLowerCase();
    const yaApareceAntes =
      vistos.has(clave) || new RegExp(`(^|[^\\w])${escaparRegExp(numero)}([^\\w]|$)`, "i").test(antes);
    vistos.add(clave);
    return yaApareceAntes ? "" : marcador;
  });

  return resultado
    .replace(/\s+/g, " ")
    .replace(/\s*,\s*,/g, ",")
    .replace(/,\s*$/, "")
    .trim();
}
