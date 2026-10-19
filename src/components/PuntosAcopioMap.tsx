"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Los íconos por defecto de Leaflet apuntan a rutas que el bundler no
// resuelve; se reemplazan por copias propias en /public/leaflet (antes
// servidas desde unpkg.com — un bloqueador de anuncios o una red que
// filtre esa CDN dejaba los pines como imagen rota para quien los viera).
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});

// Punto rojo simple (distinto del pin azul de los centros) para la
// ubicación de quien busca — no es un centro de acopio real, así que no
// debe confundirse con uno.
const iconoUbicacion = L.divIcon({
  className: "",
  html: '<div style="width:16px;height:16px;border-radius:9999px;background:#ef4444;border:3px solid white;box-shadow:0 0 0 2px rgba(239,68,68,0.45);"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Centra el mapa en la ubicación de quien busca en cuanto la captura
// (búsqueda por dirección o "usar mi ubicación"). MapContainer solo lee
// `center` al montarse, así que un cambio posterior necesita esto.
function CentrarEnUbicacion({ ubicacion }: { ubicacion: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (ubicacion) map.setView([ubicacion.lat, ubicacion.lng], 13);
  }, [ubicacion, map]);
  return null;
}

export type PuntoMapa = {
  id: string;
  nombre: string;
  direccion: string;
  zona: string | null;
  lat: number | null;
  lng: number | null;
};

export default function PuntosAcopioMap({
  puntos,
  className = "h-80 sm:h-96",
  zoom = 10,
  mensajeVacio = "Ningún punto de acopio visible tiene ubicación geocodificada todavía.",
  scrollWheelZoom = true,
  miUbicacion = null,
}: {
  puntos: PuntoMapa[];
  className?: string;
  zoom?: number;
  mensajeVacio?: string;
  scrollWheelZoom?: boolean;
  miUbicacion?: { lat: number; lng: number } | null;
}) {
  const conUbicacion = puntos.filter(
    (p): p is PuntoMapa & { lat: number; lng: number } => p.lat != null && p.lng != null,
  );

  if (conUbicacion.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl border border-dashed border-white/60 bg-white/20 text-center text-sm text-[var(--muted)] dark:border-slate-700/60 dark:bg-slate-800/30 dark:text-slate-400 ${className}`}
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
    <div className={`w-full overflow-hidden rounded-xl border border-white/60 dark:border-slate-700/60 ${className}`}>
      <MapContainer center={centro} zoom={zoom} scrollWheelZoom={scrollWheelZoom} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {conUbicacion.map((p) => (
          <Marker key={p.id} position={[p.lat, p.lng]}>
            <Popup>
              <strong>{p.nombre}</strong>
              <br />
              {p.direccion}
              {p.zona ? `, ${p.zona}` : ""}
            </Popup>
          </Marker>
        ))}
        {miUbicacion && (
          <Marker position={[miUbicacion.lat, miUbicacion.lng]} icon={iconoUbicacion}>
            <Popup>Tu ubicación aproximada</Popup>
          </Marker>
        )}
        <CentrarEnUbicacion ubicacion={miUbicacion} />
      </MapContainer>
    </div>
  );
}
