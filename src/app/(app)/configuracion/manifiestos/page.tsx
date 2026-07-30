"use client";

import { useEffect, useState } from "react";
import { Upload, Trash2 } from "lucide-react";

export default function ConfiguracionManifiestosPage() {
  const [textoDefault, setTextoDefault] = useState("");
  const [textoCierreDefault, setTextoCierreDefault] = useState("");
  const [nombreFirmante, setNombreFirmante] = useState("");
  const [puesto, setPuesto] = useState("");
  const [firmaDataUrl, setFirmaDataUrl] = useState("");
  const [firmaError, setFirmaError] = useState<string | null>(null);
  const [logotipoDataUrl, setLogotipoDataUrl] = useState("");
  const [logotipoError, setLogotipoError] = useState<string | null>(null);
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
        setLogotipoDataUrl(data.logotipoDataUrl ?? "");
        setCargando(false);
      });
  }, []);

  function onFirmaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const esPng = file.type === "image/png" || file.name.toLowerCase().endsWith(".png");
    if (!esPng) {
      setFirmaError("La firma debe ser un archivo PNG.");
      e.target.value = "";
      return;
    }
    setFirmaError(null);
    const reader = new FileReader();
    reader.onload = () => {
      setFirmaDataUrl(reader.result as string);
      setGuardado(false);
    };
    reader.readAsDataURL(file);
  }

  function eliminarFirma() {
    setFirmaDataUrl("");
    setFirmaError(null);
    setGuardado(false);
  }

  const LOGOTIPO_TIPOS_ACEPTADOS = ["image/png", "image/jpeg", "image/webp"];
  const LOGOTIPO_TAMANO_MAXIMO = 5 * 1024 * 1024;
  const LOGOTIPO_ERROR =
    "El logotipo debe ser una imagen PNG, JPG o WebP con un tamaño máximo de 5 MB.";

  function onLogotipoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const tipoValido = LOGOTIPO_TIPOS_ACEPTADOS.includes(file.type);
    const tamanoValido = file.size <= LOGOTIPO_TAMANO_MAXIMO;
    if (!tipoValido || !tamanoValido) {
      setLogotipoError(LOGOTIPO_ERROR);
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // Verifica que el archivo cargue como imagen válida antes de aceptarlo,
      // para no terminar mostrando una imagen rota.
      const img = new Image();
      img.onload = () => {
        setLogotipoDataUrl(dataUrl);
        setLogotipoError(null);
        setGuardado(false);
      };
      img.onerror = () => setLogotipoError(LOGOTIPO_ERROR);
      img.src = dataUrl;
    };
    reader.onerror = () => setLogotipoError(LOGOTIPO_ERROR);
    reader.readAsDataURL(file);
  }

  function eliminarLogotipo() {
    setLogotipoDataUrl("");
    setLogotipoError(null);
    setGuardado(false);
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    setGuardado(false);
    await fetch("/api/configuracion/manifiestos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        textoDefault,
        textoCierreDefault,
        nombreFirmante,
        puesto,
        firmaDataUrl,
        logotipoDataUrl,
      }),
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
          <h2 className="mb-1 text-sm font-semibold">Logotipo del encabezado</h2>
          <p className="mb-3 text-[11px] text-[var(--muted)]">
            Se muestra en la esquina superior derecha del encabezado, junto al título. Se guarda
            una sola vez y se aplica automáticamente a todos los manifiestos nuevos.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/60 bg-white/30 px-3 py-2 text-sm hover:bg-white/50">
              <Upload className="h-4 w-4" />
              {logotipoDataUrl ? "Reemplazar logotipo" : "Subir logotipo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp"
                className="hidden"
                onChange={onLogotipoChange}
              />
            </label>
            {logotipoDataUrl && (
              <button
                type="button"
                onClick={eliminarLogotipo}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100"
              >
                <Trash2 className="h-4 w-4" /> Eliminar logotipo
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-[var(--muted)]">
            Dimensiones recomendadas: 1200 × 400 px, formato PNG y fondo transparente.
          </p>
          {logotipoError && <p className="text-xs text-red-600">{logotipoError}</p>}
          {logotipoDataUrl && (
            <div className="mt-2 flex max-h-[120px] max-w-[360px] items-center justify-center rounded border border-white/60 bg-white/50 p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logotipoDataUrl}
                alt="Logotipo"
                className="max-h-[104px] max-w-[344px] object-contain object-center"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            </div>
          )}
        </div>

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
            <span className="font-medium">Firma (opcional)</span>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/60 bg-white/30 px-3 py-2 text-sm hover:bg-white/50">
                <Upload className="h-4 w-4" />
                {firmaDataUrl ? "Reemplazar imagen de firma" : "Subir imagen de firma"}
                <input type="file" accept="image/png,.png" className="hidden" onChange={onFirmaChange} />
              </label>
              {firmaDataUrl && (
                <button
                  type="button"
                  onClick={eliminarFirma}
                  className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="h-4 w-4" /> Eliminar firma
                </button>
              )}
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              Formato PNG únicamente. Si no se sube una firma, el manifiesto se genera sin ella.
            </p>
            {firmaError && <p className="text-xs text-red-600">{firmaError}</p>}
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
