// Geocodificación de direcciones vía Nominatim (OpenStreetMap), sin costo ni API key.
// Política de uso de Nominatim: máximo 1 solicitud por segundo y un User-Agent
// que identifique la aplicación. Ver https://operations.osmfoundation.org/policies/nominatim/

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "ReciclaContraElCancer/1.0 (contacto@complicesac.org)";

export type Coordenadas = { lat: number; lng: number };

export async function geocodificarDireccion(direccion: string): Promise<Coordenadas | null> {
  if (!direccion || !direccion.trim()) return null;

  const params = new URLSearchParams({
    q: direccion,
    format: "json",
    limit: "1",
    countrycodes: "mx",
  });

  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) return null;

  const lat = parseFloat(data[0].lat);
  const lng = parseFloat(data[0].lon);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

  return { lat, lng };
}

export function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
