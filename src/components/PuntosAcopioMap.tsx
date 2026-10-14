"use client";

// Versión "pro": agrupa marcadores cercanos (react-leaflet-cluster), usa
// pines propios con color según activo/inactivo en vez del ícono azul
// genérico de Leaflet, usa teselas en gris claro tipo "mapa minimalista"
// (Esri World Light Gray, sin llave de API) en vez del estilo con relieve
// y colores saturados de World Street Map, y rediseña el popup al estilo
// de cristal mate de la app en vez del cuadro blanco por default de
// Leaflet.
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { Pencil } from "lucide-react";

// Pin propio en vez del ícono por default de Leaflet: un teardrop con un
// punto central, coloreado por CSS para que activo/inactivo se distinga
// de un vistazo sin abrir el popup. Ya no depende de ningún PNG externo.
function crearIcono(activo: boolean) {
  const color = activo ? "#16a34a" : "var(--brand-blue)";
  return L.divIcon({
    className: "recicla-marker",
    html:
      `<span class="recicla-marker__pin" style="color:${color}">` +
      `<svg viewBox="0 0 24 32" width="28" height="36" xmlns="http://www.w3.org/2000/svg">` +
      `<path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20C24 5.373 18.627 0 12 0z" fill="currentColor"/>` +
      `<circle cx="12" cy="12" r="4.5" fill="#fff"/>` +
      `</svg></span>`,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -32],
  });
}

// Racimo propio (reemplaza el círculo amarillo por default del plugin):
// un círculo con un número adentro no significa nada para quien no esté
// acostumbrado a mapas con clustering ("¿qué es ese 190?"). En vez de
// eso, se reusa la MISMA silueta de pin que ya usan los puntos
// individuales — así se lee de inmediato como "un marcador que
// representa varios lugares", sin inventar un símbolo nuevo. El `title`
// explica el resto al pasar el mouse encima.
function crearIconoCluster(cluster: { getChildCount: () => number }) {
  const cantidad = cluster.getChildCount();
  const texto = cantidad > 99 ? "99+" : String(cantidad);
  const descripcion = cantidad === 1 ? "1 punto de acopio aquí" : `${cantidad} puntos de acopio aquí`;
  return L.divIcon({
    className: "recicla-cluster",
    html:
      `<span class="recicla-cluster-pin" title="${descripcion} — clic para acercar y separarlos">` +
      `<svg viewBox="0 0 24 32" width="44" height="58" xmlns="http://www.w3.org/2000/svg">` +
      `<path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20C24 5.373 18.627 0 12 0z" fill="var(--brand-blue)"/>` +
      `</svg>` +
      `<span class="recicla-cluster-pin__count">${texto}</span>` +
      `</span>`,
    iconSize: [44, 58],
    iconAnchor: [22, 58],
    popupAnchor: [0, -52],
  });
}

export type PuntoMapa = {
  id: string;
  nombre: string;
  direccion: string;
  zona: string | null;
  lat: number | null;
  lng: number | null;
  // Opcionales: el mapa chico del modal de edición solo manda un punto
  // mínimo (id/nombre/direccion/zona/lat/lng), así que estos dos campos no
  // pueden ser requeridos sin romper ese uso.
  activo?: boolean;
  materiales?: string;
};

export default function PuntosAcopioMap({
  puntos,
  className = "h-80 sm:h-96",
  zoom = 10,
  mensajeVacio = "Ningún punto de acopio visible tiene ubicación geocodificada todavía.",
  scrollWheelZoom = true,
  onEditar,
}: {
  puntos: PuntoMapa[];
  className?: string;
  zoom?: number;
  mensajeVacio?: string;
  scrollWheelZoom?: boolean;
  // Si se manda, el popup muestra un botón "Editar" — el mapa chico del
  // modal de edición no lo manda, porque ahí ya se está editando.
  onEditar?: (id: string) => void;
}) {
  const conUbicacion = puntos.filter(
    (p): p is PuntoMapa & { lat: number; lng: number } => p.lat != null && p.lng != null,
  );

  if (conUbicacion.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-white/60 bg-white/20 text-center text-sm text-[var(--muted)] ${className}`}
      >
        {mensajeVacio}
      </div>
    );
  }

  const centro: [number, number] = [
    conUbicacion.reduce((suma, p) => suma + p.lat, 0) / conUbicacion.length,
    conUbicacion.reduce((suma, p) => suma + p.lng, 0) / conUbicacion.length,
  ];

  return (
    // isolate: Leaflet no le pone z-index a su propio contenedor (solo
    // position:relative), así que sin esto los z-index internos de sus
    // capas (marcadores/popups llegan hasta 700) no quedan contenidos aquí
    // y compiten directo en el stacking context raíz de la página.
    <div className={`isolate w-full overflow-hidden rounded-xl border border-white/60 ${className}`}>
      <MapContainer center={centro} zoom={zoom} scrollWheelZoom={scrollWheelZoom} className="h-full w-full">
        <TileLayer
          attribution="Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
          maxNativeZoom={16}
        />
        {/* Capa de referencia: calles y nombres de lugar por encima del
            fondo gris — el servicio base solo trae el "lienzo", sin esto
            el mapa se ve vacío salvo por los pines. */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}"
          maxZoom={19}
          maxNativeZoom={16}
        />
        <MarkerClusterGroup chunkedLoading maxClusterRadius={50} iconCreateFunction={crearIconoCluster}>
          {conUbicacion.map((p) => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={crearIcono(p.activo ?? true)}>
              <Popup className="recicla-popup" minWidth={220}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <strong className="text-sm leading-tight text-[var(--foreground)]">{p.nombre}</strong>
                    {p.activo !== undefined && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          p.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {p.activo ? "Activo" : "Inactivo"}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--muted)]">
                    {p.direccion}
                    {p.zona ? `, ${p.zona}` : ""}
                  </p>
                  {p.materiales && (
                    <p className="text-xs text-[var(--muted)]">
                      <span className="font-medium text-[var(--foreground)]">Materiales:</span> {p.materiales}
                    </p>
                  )}
                  {onEditar && (
                    <button
                      type="button"
                      onClick={() => onEditar(p.id)}
                      className="mt-1 inline-flex w-fit items-center gap-1 rounded-lg bg-[var(--brand-blue)] px-2 py-1 text-xs font-medium text-white hover:bg-[var(--brand-blue-dark)]"
                    >
                      <Pencil className="h-3 w-3" /> Editar
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
}
