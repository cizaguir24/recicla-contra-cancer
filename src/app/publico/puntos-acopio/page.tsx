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
import { MapPin, Recycle, Search } from "lucide-react";
import { limpiarDireccionDuplicada } from "@/lib/direccion";
import { coincideBusqueda } from "@/lib/texto";

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

        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, municipio o material…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 shadow-sm outline-none focus:border-[var(--brand-blue)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-50 dark:placeholder:text-slate-500"
          />
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
            No se pudo cargar el directorio en este momento. Intenta de nuevo más tarde.
          </p>
        ) : cargando ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Cargando…</p>
        ) : (
          <>
            <PuntosAcopioMap puntos={puntosFiltrados} className="mb-5 h-72 sm:h-96" />

            {puntosFiltrados.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white/60 px-4 py-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
                No encontramos ningún centro que coincida con tu búsqueda.
              </p>
            ) : (
              <div className="space-y-2.5">
                {puntosFiltrados.map((p) => (
                  <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                    <h2 className="font-semibold text-slate-900 dark:text-slate-50">{p.nombre}</h2>
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
