"use client";

// Buscador público de Puntos de Acopio — sin sesión, pensado para
// compartirse por WhatsApp/redes. Vive fuera del grupo de rutas (app)
// (ver src/app/(app)/layout.tsx), así que no hereda su AppShell/menú:
// nada de botones de editar/eliminar, solo lo necesario para ubicar un
// punto. El filtro de qué punto se puede ver vive en el servidor
// (/api/publico/puntos-acopio), nunca aquí — esta pantalla nunca recibe
// un punto "Privada" para empezar.
import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2, LocateFixed, MapPin, Recycle, Search } from "lucide-react";
import { limpiarDireccionDuplicada } from "@/lib/direccion";
import { coincideBusqueda } from "@/lib/texto";
import { distanciaKm, formatoDistancia } from "@/lib/distancia";

const PuntosAcopioMap = dynamic(() => import("@/components/PuntosAcopioMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 items-center justify-center rounded-2xl border border-white/60 bg-white/50 text-sm text-slate-500 dark:border-slate-700/60 dark:bg-slate-800/50 dark:text-slate-400 sm:h-96">
      Cargando mapa…
    </div>
  ),
});

type PuntoPublico = {
  id: string;
  nombre: string;
  direccion: string;
  zona: string | null;
  estado: string | null;
  materiales: string;
  lat: number | null;
  lng: number | null;
};

export default function BuscadorPublicoPuntosAcopioPage() {
  const [puntos, setPuntos] = useState<PuntoPublico[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const [direccionCercania, setDireccionCercania] = useState("");
  const [miUbicacion, setMiUbicacion] = useState<{ lat: number; lng: number } | null>(null);
  const [buscandoCercania, setBuscandoCercania] = useState(false);
  const [errorCercania, setErrorCercania] = useState<string | null>(null);

  useEffect(() => {
    let vivo = true;
    fetch("/api/publico/puntos-acopio", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (vivo) setPuntos(data);
      })
      .catch(() => {
        if (vivo) setError(true);
      })
      .finally(() => {
        if (vivo) setCargando(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const puntosFiltrados = useMemo(() => {
    if (!busqueda) return puntos;
    return puntos.filter((p) => coincideBusqueda(busqueda, p.nombre, p.zona, p.materiales));
  }, [puntos, busqueda]);

  // Con una ubicación de referencia, se le suma la distancia a cada punto y
  // se reordena de más cercano a más lejano; sin ella, se deja el orden
  // alfabético que ya trae el directorio.
  const puntosOrdenados = useMemo(() => {
    if (!miUbicacion) return puntosFiltrados.map((p) => ({ ...p, distancia: null as number | null }));
    return [...puntosFiltrados]
      .map((p) => ({
        ...p,
        distancia: p.lat != null && p.lng != null ? distanciaKm(miUbicacion, { lat: p.lat, lng: p.lng }) : null,
      }))
      .sort((a, b) => (a.distancia ?? Infinity) - (b.distancia ?? Infinity));
  }, [puntosFiltrados, miUbicacion]);

  async function buscarCercania(e: React.FormEvent) {
    e.preventDefault();
    if (!direccionCercania.trim() || buscandoCercania) return;
    setBuscandoCercania(true);
    setErrorCercania(null);
    try {
      const r = await fetch(`/api/publico/geocodificar?direccion=${encodeURIComponent(direccionCercania)}`);
      const body = await r.json().catch(() => null);
      if (!r.ok || !body) {
        setErrorCercania(body?.error ?? "No encontramos esa dirección");
        return;
      }
      setMiUbicacion(body);
    } catch {
      setErrorCercania("No se pudo buscar en este momento. Intenta de nuevo.");
    } finally {
      setBuscandoCercania(false);
    }
  }

  function usarMiUbicacion() {
    if (!navigator.geolocation) {
      setErrorCercania("Tu navegador no permite compartir tu ubicación.");
      return;
    }
    setBuscandoCercania(true);
    setErrorCercania(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMiUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setBuscandoCercania(false);
      },
      () => {
        setErrorCercania("No pudimos obtener tu ubicación. Intenta escribir tu dirección.");
        setBuscandoCercania(false);
      },
      { timeout: 10000 },
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="mb-6 flex items-center gap-2.5">
          <Recycle className="h-7 w-7 shrink-0 text-[var(--brand-blue)] dark:text-sky-400" />
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50 sm:text-2xl">Recicla Contra el Cáncer</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Encuentra tu centro de acopio o corazón más cercano</p>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, municipio o material…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[var(--brand-blue)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500"
          />
        </div>

        <form onSubmit={buscarCercania} className="mb-5 flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <LocateFixed className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
            <input
              value={direccionCercania}
              onChange={(e) => setDireccionCercania(e.target.value)}
              placeholder="Escribe tu calle, colonia o municipio para ver el más cercano…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[var(--brand-blue)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={buscandoCercania || !direccionCercania.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--brand-blue)] px-4 py-2.5 text-sm font-medium text-white shadow-sm disabled:opacity-50"
            >
              {buscandoCercania ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </button>
            <button
              type="button"
              onClick={usarMiUbicacion}
              disabled={buscandoCercania}
              title="Usar mi ubicación actual"
              className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 shadow-sm disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <LocateFixed className="h-4 w-4" />
              <span className="hidden sm:inline">Mi ubicación</span>
            </button>
          </div>
        </form>

        {errorCercania && (
          <p className="-mt-3 mb-5 text-xs text-red-600 dark:text-red-400">{errorCercania}</p>
        )}
        {miUbicacion && !errorCercania && (
          <p className="-mt-3 mb-5 text-xs text-slate-500 dark:text-slate-400">
            Mostrando los centros ordenados de más cercano a más lejano.
          </p>
        )}

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            No se pudo cargar el directorio en este momento. Intenta de nuevo más tarde.
          </p>
        ) : cargando ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
        ) : (
          <>
            <PuntosAcopioMap puntos={puntosFiltrados} miUbicacion={miUbicacion} className="mb-5 h-72 sm:h-96" />

            {puntosOrdenados.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                No encontramos ningún centro que coincida con tu búsqueda.
              </p>
            ) : (
              <div className="space-y-2.5">
                {puntosOrdenados.map((p) => (
                  <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="font-semibold text-slate-900 dark:text-slate-50">{p.nombre}</h2>
                      {p.distancia != null && (
                        <span className="shrink-0 rounded-full bg-[var(--brand-blue-light)] px-2 py-0.5 text-[11px] font-medium text-[var(--brand-blue-dark)] dark:bg-sky-400/10 dark:text-sky-400">
                          {formatoDistancia(p.distancia)}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 flex items-start gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      <span>
                        {limpiarDireccionDuplicada(p.direccion)}
                        {p.zona ? `, ${p.zona}` : ""}
                        {p.estado ? `, ${p.estado}` : ""}
                      </span>
                    </p>
                    <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900/60">
                      <p className="text-slate-400 dark:text-slate-500">Materiales que acepta</p>
                      <p className="font-medium text-slate-700 dark:text-slate-200">{p.materiales}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <p className="mt-8 text-center text-[11px] text-slate-400 dark:text-slate-600">Cómplices AC — reciclavscancer.complicesac.org</p>
      </div>
    </div>
  );
}
