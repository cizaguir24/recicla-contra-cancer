"use client";

import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { lanzarConfeti } from "@/lib/confeti";
import {
  guardarSilencio,
  leerSilencio,
  reproducirSonidoAntiestres,
} from "@/lib/sonido-antiestres";

// Botón antiestrés: al pulsarlo suena una campanita y cae confeti por toda la
// pantalla. Se puede silenciar (se recuerda en el navegador) y, si la persona
// tiene activado "reducir movimiento", solo suena (no hay confeti ni giro).
export default function BotonAntiestres({ compacto = false }: { compacto?: boolean }) {
  const [silencio, setSilencio] = useState(false);
  const [giro, setGiro] = useState(0);

  useEffect(() => {
    setSilencio(leerSilencio());
  }, []);

  function soltar() {
    if (!silencio) reproducirSonidoAntiestres();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setGiro((g) => g + 360);
      lanzarConfeti();
    }
  }

  function alternarSilencio() {
    const nuevo = !silencio;
    setSilencio(nuevo);
    guardarSilencio(nuevo);
  }

  if (compacto) {
    return (
      <div className="flex justify-center">
        <Dial giro={giro} onClick={soltar} tamano={44} />
      </div>
    );
  }

  return (
    <div className="glass-card-elevated flex items-center gap-3 p-3">
      <Dial giro={giro} onClick={soltar} tamano={56} />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-[var(--menu-text)]">Antiestrés</p>
        <p className="text-[10px] leading-tight text-[var(--menu-text-muted)]">
          Toca y suelta confeti
        </p>
      </div>
      <button
        type="button"
        onClick={alternarSilencio}
        aria-pressed={silencio}
        aria-label={silencio ? "Activar el sonido" : "Silenciar el sonido"}
        title={silencio ? "Activar el sonido" : "Silenciar el sonido"}
        className="shrink-0 rounded-lg p-1.5 text-[var(--menu-text-muted)] hover:bg-white/50 hover:text-[var(--menu-text)]"
      >
        {silencio ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

function Dial({
  giro,
  onClick,
  tamano,
}: {
  giro: number;
  onClick: () => void;
  tamano: number;
}) {
  // Arco de 270° con la abertura abajo: se dibuja con trazos discontinuos.
  const radio = 23;
  const circunferencia = 2 * Math.PI * radio;
  const arco = (grados: number) => (circunferencia * grados) / 360;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Botón antiestrés: soltar confeti"
      title="Soltar confeti"
      style={{ width: tamano, height: tamano }}
      className="group relative shrink-0 touch-manipulation rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-blue)] focus-visible:ring-offset-2"
    >
      <svg
        viewBox="0 0 56 56"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full transition-transform duration-700 ease-out motion-reduce:transition-none"
        style={{ transform: `rotate(${giro}deg)` }}
      >
        <g transform="rotate(135 28 28)" fill="none" strokeWidth="3.4" strokeLinecap="round">
          <circle
            cx="28"
            cy="28"
            r={radio}
            stroke="rgba(100,130,170,0.32)"
            strokeDasharray={`${arco(270)} ${circunferencia}`}
          />
          <circle
            cx="28"
            cy="28"
            r={radio}
            stroke="#4a9dff"
            strokeDasharray={`${arco(135)} ${circunferencia}`}
          />
        </g>
        <circle cx="28" cy="5" r="3.3" fill="rgba(255,255,255,0.9)" stroke="rgba(100,140,200,0.8)" strokeWidth="1" />
      </svg>
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-150 ease-out group-active:scale-90"
        style={{
          width: "56%",
          height: "56%",
          background: "linear-gradient(180deg, #9ccdff 0%, #4a9dff 55%, #3b86ec 100%)",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.85), inset 0 -3px 6px rgba(20,70,170,0.22), 0 3px 8px rgba(37,99,235,0.35), 0 0 0 3px rgba(255,255,255,0.45)",
        }}
      />
    </button>
  );
}
