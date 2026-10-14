"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Los íconos por defecto de Leaflet apuntan a rutas que el bundler no
// resuelve; se reemplazan por las imágenes servidas desde unpkg.
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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
}: {
  puntos: PuntoMapa[];
  className?: string;
  zoom?: number;
  mensajeVacio?: string;
  scrollWheelZoom?: boolean;
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
    <div className={`w-full overflow-hidden rounded-xl border border-white/60 ${className}`}>
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
      </MapContainer>
    </div>
  );
}
