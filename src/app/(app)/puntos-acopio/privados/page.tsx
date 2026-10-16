"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, MapPin } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { coincideBusqueda } from "@/lib/texto";
import { limpiarDireccionDuplicada } from "@/lib/direccion";

const PuntosAcopioMap = dynamic(() => import("@/components/PuntosAcopioMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-80 items-center justify-center rounded-xl border border-white/60 bg-white/20 text-sm text-[var(--muted)] sm:h-96">
      Cargando mapa…
    </div>
  ),
});

type PuntoAcopio = {
  id: string;
  nombre: string;
  direccion: string;
  zona: string | null;
  estado: string | null;
  materiales: string;
  activo: boolean;
  visibilidad: string | null;
  lat: number | null;
  lng: number | null;
};

export default function MapaPrivadosPage() {
  const [puntos, setPuntos] = useState<PuntoAcopio[]>([]);
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    fetch("/api/puntos-acopio")
      .then((r) => r.json())
      .then(setPuntos)
      .finally(() => setCargando(false));
  }, []);

  // El contraparte interno del link público: solo puntos activos marcados
  // como "Privada" (los que el link público nunca muestra).
  const privados = useMemo(
    () => puntos.filter((p) => p.activo && p.visibilidad === "Privada"),
    [puntos],
  );

  const privadosFiltrados = useMemo(() => {
    if (!busqueda) return privados;
    return privados.filter((p) => coincideBusqueda(busqueda, p.nombre, p.zona, p.materiales));
  }, [privados, busqueda]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/puntos-acopio"
          className="flex items-center gap-1 text-sm text-[var(--brand-blue)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Puntos de Acopio
        </Link>
        <h1 className="mt-1 text-xl font-semibold">Mapa de puntos no públicos</h1>
        <p className="text-sm text-foreground/60">
          {privadosFiltrados.length} punto{privadosFiltrados.length === 1 ? "" : "s"} activo
          {privadosFiltrados.length === 1 ? "" : "s"} marcado{privadosFiltrados.length === 1 ? "" : "s"} como
          privado{privadosFiltrados.length === 1 ? "" : "s"} — nunca aparecen en el link público.
        </p>
      </div>

      <SearchBar value={busqueda} onChange={setBusqueda} className="sm:max-w-md" />

      {cargando ? (
        <p className="text-sm text-foreground/60">Cargando...</p>
      ) : (
        <>
          <PuntosAcopioMap
            puntos={privadosFiltrados}
            mensajeVacio="Ningún punto privado activo tiene ubicación geocodificada todavía."
          />

          {privadosFiltrados.length === 0 ? (
            <div className="flex min-h-[20vh] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/60 bg-white/20 text-center backdrop-blur-sm">
              <p className="text-sm text-[var(--muted)]">
                {busqueda
                  ? "No se encontraron puntos privados que coincidan con tu búsqueda."
                  : "No hay puntos de acopio activos marcados como privados."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {privadosFiltrados.map((p) => (
                <div key={p.id} className="glass-card p-4 backdrop-saturate-150">
                  <div className="mb-1 flex items-start justify-between gap-2">
                    <h2 className="font-semibold text-[var(--foreground)]">{p.nombre}</h2>
                    <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                      Privada
                    </span>
                  </div>
                  <p className="flex items-start gap-1 text-xs text-[var(--muted)]">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>
                      {p.direccion ? limpiarDireccionDuplicada(p.direccion) : "Sin dirección"}
                      {p.zona ? `, ${p.zona}` : ""}
                      {p.estado ? `, ${p.estado}` : ""}
                    </span>
                  </p>
                  <div className="mt-2 rounded-lg bg-white/40 px-3 py-2 text-xs">
                    <p className="text-[var(--text-secondary)]">Materiales</p>
                    <p className="font-medium text-[var(--text-primary)]">{p.materiales}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
