"use client";

import { useEffect, useState } from "react";

export default function ConfiguracionManifiestosPage() {
  const [textoDefault, setTextoDefault] = useState("");
  const [textoCierreDefault, setTextoCierreDefault] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    fetch("/api/configuracion/manifiestos")
      .then((r) => r.json())
      .then((data) => {
        setTextoDefault(data.textoDefault);
        setTextoCierreDefault(data.textoCierreDefault);
        setCargando(false);
      });
  }, []);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setGuardado(false);
    await fetch("/api/configuracion/manifiestos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ textoDefault, textoCierreDefault }),
    });
    setGuardando(false);
    setGuardado(true);
  }

  if (cargando) {
    return <p className="text-sm text-foreground/60">Cargando...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Plantilla de Manifiesto</h1>
        <p className="text-sm text-foreground/60">
          Este texto se carga automáticamente al crear un manifiesto nuevo. Editarlo aquí no
          modifica los manifiestos ya creados.
        </p>
      </div>

      <form onSubmit={guardar} className="space-y-4 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4">
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Texto predeterminado (inicio)</span>
          <textarea
            value={textoDefault}
            onChange={(e) => {
              setTextoDefault(e.target.value);
              setGuardado(false);
            }}
            rows={10}
            className="input"
          />
          <p className="text-[11px] text-[var(--muted)]">
            Usa <code>{"{nombre de la empresa}"}</code> donde quieras que aparezca
            automáticamente el nombre del benefactor o punto de acopio seleccionado.
          </p>
        </label>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Texto predeterminado (cierre)</span>
          <textarea
            value={textoCierreDefault}
            onChange={(e) => {
              setTextoCierreDefault(e.target.value);
              setGuardado(false);
            }}
            rows={3}
            className="input"
          />
          <p className="text-[11px] text-[var(--muted)]">
            Se muestra después de la tabla de acopios y el total acumulado, antes de la firma.
          </p>
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={guardando}
            className="rounded-xl bg-[var(--brand-blue)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] shadow-sm disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Guardar plantilla"}
          </button>
          {guardado && <span className="text-sm text-green-600">Guardado</span>}
        </div>
      </form>
    </div>
  );
}
