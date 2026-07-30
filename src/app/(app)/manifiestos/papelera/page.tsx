"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCcw, Trash2 } from "lucide-react";
import { DIAS_RETENCION_PAPELERA } from "@/lib/manifiestos";

type PuntoAcopioMini = { id: string; nombre: string; zona: string | null };

type ManifiestoPapelera = {
  id: string;
  puntoAcopioId: string;
  fechaInicioPeriodo: string;
  fechaFinPeriodo: string;
  dirigidoA: string;
  nombreFirmante: string;
  puesto: string;
  eliminadoAt: string;
  puntoAcopio: PuntoAcopioMini;
};

function fmt(d: string) {
  return d.slice(0, 10);
}

function diasRestantes(eliminadoAt: string): number {
  const limite = new Date(eliminadoAt).getTime() + DIAS_RETENCION_PAPELERA * 24 * 60 * 60 * 1000;
  return Math.max(Math.ceil((limite - Date.now()) / (24 * 60 * 60 * 1000)), 0);
}

export default function PapeleraManifiestosPage() {
  const [items, setItems] = useState<ManifiestoPapelera[]>([]);
  const [cargando, setCargando] = useState(true);
  const [restaurando, setRestaurando] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    const res = await fetch("/api/manifiestos/papelera");
    setItems(await res.json());
    setCargando(false);
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  async function restaurar(id: string) {
    setRestaurando(id);
    await fetch(`/api/manifiestos/${id}/restaurar`, { method: "POST" });
    setRestaurando(null);
    await cargar();
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/manifiestos"
          className="flex items-center gap-1 text-sm text-[var(--brand-blue)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a Manifiestos
        </Link>
        <h1 className="mt-2 text-xl font-semibold">Papelera de Manifiestos</h1>
        <p className="text-sm text-foreground/60">
          Los borradores eliminados se conservan aquí {DIAS_RETENCION_PAPELERA} días antes de
          borrarse definitivamente.
        </p>
      </div>

      {cargando ? (
        <p className="text-sm text-foreground/60">Cargando...</p>
      ) : items.length === 0 ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/60 bg-white/20 text-center backdrop-blur-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--brand-blue-light)]">
            <Trash2 className="h-6 w-6 text-[var(--brand-blue-dark)]" />
          </div>
          <p className="text-sm text-[var(--muted)]">La papelera está vacía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((m) => {
            const restantes = diasRestantes(m.eliminadoAt);
            return (
              <div
                key={m.id}
                className="rounded-xl border border-white/60 bg-white/40 p-4 shadow-lg shadow-black/5 backdrop-blur-md backdrop-saturate-150"
              >
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h2 className="font-semibold text-[var(--foreground)]">{m.puntoAcopio.nombre}</h2>
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                    {restantes} día{restantes === 1 ? "" : "s"} restante{restantes === 1 ? "" : "s"}
                  </span>
                </div>
                {m.dirigidoA && (
                  <p className="mb-3 text-xs text-[var(--muted)]">Dirigido a: {m.dirigidoA}</p>
                )}

                <div className="mb-3 grid grid-cols-2 gap-x-3 gap-y-2 rounded-lg bg-white/40 p-3 text-xs">
                  <div className="col-span-2">
                    <p className="text-[var(--muted)]">Periodo</p>
                    <p className="font-medium text-[var(--foreground)]">
                      {fmt(m.fechaInicioPeriodo)} – {fmt(m.fechaFinPeriodo)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[var(--muted)]">Eliminado el</p>
                    <p className="font-medium text-[var(--foreground)]">{fmt(m.eliminadoAt)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 border-t border-[var(--border)] pt-2 text-xs">
                  <button
                    onClick={() => restaurar(m.id)}
                    disabled={restaurando === m.id}
                    className="flex items-center gap-1 text-[var(--brand-blue)] hover:underline disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    {restaurando === m.id ? "Restaurando…" : "Restaurar"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
