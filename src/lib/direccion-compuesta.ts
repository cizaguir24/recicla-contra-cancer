// Dirección de un punto de acopio = Calle + #Número exterior + Int. Número
// interior (las tres propiedades de Notion). Una sola regla compartida entre el
// sync (Notion -> app) y la edición (app -> Notion) para que nunca se desfasen.

// "N/A" es el placeholder que se usa en Notion cuando el campo no aplica.
export function esPlaceholder(v: string | null | undefined): boolean {
  return !v || v.trim().toUpperCase() === "N/A";
}

export function componerDireccion(partes: {
  calle: string | null | undefined;
  numeroExterior: string | null | undefined;
  numeroInterior: string | null | undefined;
}): string {
  const { calle, numeroExterior, numeroInterior } = partes;
  return [
    !esPlaceholder(calle) ? calle : null,
    !esPlaceholder(numeroExterior) ? `#${numeroExterior}` : null,
    !esPlaceholder(numeroInterior) ? `Int. ${numeroInterior}` : null,
  ]
    .filter(Boolean)
    .join(" ");
}

// Las tres partes solo se pueden editar por separado cuando el punto viene de
// Notion y sus partes reproducen exactamente la dirección guardada. Si no (aún
// no se respaldaron las partes, o la dirección se editó a mano), se sigue
// editando `direccion` como una sola cadena y nunca se pierde información.
export function partesConsistentes(punto: {
  notionPageId: string | null;
  direccion: string;
  calle: string | null;
  numeroExterior: string | null;
  numeroInterior: string | null;
}): boolean {
  return !!punto.notionPageId && componerDireccion(punto) === punto.direccion;
}

// Cadena que se manda a Nominatim para ubicar un punto en el mapa.
export function direccionParaGeocodificar(datos: {
  direccion: string;
  zona: string | null;
  estado: string | null;
}): string {
  return [datos.direccion, datos.zona, datos.estado].filter(Boolean).join(", ");
}
