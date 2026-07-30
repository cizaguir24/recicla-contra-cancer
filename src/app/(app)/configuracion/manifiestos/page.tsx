"use client";

import { useEffect, useState } from "react";
import { Upload } from "lucide-react";

export default function ConfiguracionManifiestosPage() {
  const [textoDefault, setTextoDefault] = useState("");
  const [textoCierreDefault, setTextoCierreDefault] = useState("");
  const [nombreFirmante, setNombreFirmante] = useState("");
  const [puesto, setPuesto] = useState("");
  const [firmaDataUrl, setFirmaDataUrl] = useState("");
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);

  useEffect(() => {
    fetch("/api/configuracion/manifiestos")
      .then((r) => r.json())
      .then((data) => {
        setTextoDefault(data.textoDefault);
        setTextoCierreDefault(data.textoCierreDefault);
        setNombreFirmante(data.nombreFirmante ?? "");
        setPuesto(data.puesto ?? "");
        setFirmaDataUrl(data.firmaDataUrl ?? "");
        setCargando(false);
      });
  }, []);

  function onFirmaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setFirmaDataUrl(reader.result as string);
      setGuardado(false);
    };
    reader.readAsDataURL(file);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setGuardado(false);
    await fetch("/api/configuracion/manifiestos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ textoDefault, textoCierreDefault, nombreFirmante, puesto, firmaDataUrl }),
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

        <div className="border-t border-[var(--border)] pt-4">
          <h2 className="mb-1 text-sm font-semibold">Quien emite y firma los manifiestos</h2>
          <p className="mb-3 text-[11px] text-[var(--muted)]">
            Este nombre, puesto y firma son fijos: se aplican automáticamente a todos los
            manifiestos y no se pueden cambiar al crear uno individual. Solo un administrador
            puede modificarlos aquí.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="font-medium">Nombre(s) de quien emite el manifiesto</span>
              <input
                value={nombreFirmante}
                onChange={(e) => {
                  setNombreFirmante(e.target.value);
                  setGuardado(false);
                }}
                className="input"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="font-medium">Puesto</span>
              <input
                value={puesto}
                onChange={(e) => {
                  setPuesto(e.target.value);
                  setGuardado(false);
                }}
                className="input"
              />
            </label>
          </div>

          <div className="mt-3 space-y-1 text-sm">
            <span className="font-medium">Firma</span>
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/60 bg-white/30 px-3 py-2 text-sm hover:bg-white/50">
              <Upload className="h-4 w-4" />
              {firmaDataUrl ? "Cambiar imagen de firma" : "Subir imagen de firma"}
              <input type="file" accept="image/*" className="hidden" onChange={onFirmaChange} />
            </label>
            {firmaDataUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={firmaDataUrl}
                alt="Firma"
                className="mt-2 h-16 rounded border border-white/60 bg-white/50 p-1"
              />
            )}
          </div>
        </div>

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
