// Distancia aproximada entre dos coordenadas (fórmula de Haversine), en km.
// Suficiente para ordenar puntos de acopio por cercanía; no pretende
// precisión de ruta real.
const RADIO_TIERRA_KM = 6371;

function gradosARadianes(grados: number): number {
  return (grados * Math.PI) / 180;
}

export function distanciaKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const dLat = gradosARadianes(b.lat - a.lat);
  const dLng = gradosARadianes(b.lng - a.lng);
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(gradosARadianes(a.lat)) * Math.cos(gradosARadianes(b.lat)) * Math.sin(dLng / 2) ** 2;
  return RADIO_TIERRA_KM * 2 * Math.atan2(Math.sqrt(sa), Math.sqrt(1 - sa));
}

export function formatoDistancia(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}
