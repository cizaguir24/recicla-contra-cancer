"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Upload } from "lucide-react";
import {
  expandirAcopiosPorMaterial,
  totalKgDeFilas,
  type FilaAcopioManifiesto,
} from "@/lib/manifiestos";

type PuntoAcopio = { id: string; nombre: string; direccion: string; zona: string | null; estado: string | null };

type FechaAcopioApi = {
  fecha: string;
  estado: string;
  petKg: number | null;
  tapasKg: number | null;
  aluminioKg: number | null;
  tapasWinsKg: number | null;
};

type ManifiestoDetalle = {
  id: string;
  puntoAcopioId: string;
  fechaManifiesto: string;
  fechaInicioPeriodo: string;
  fechaFinPeriodo: string;
  titulo: string;
  nombreFirmante: string;
  puesto: string;
  texto: string;
  firmaDataUrl: string | null;
  estatus: string;
};

const hoy = () => new Date().toISOString().slice(0, 10);

const FORM_VACIO = {
  puntoAcopioId: "",
  fechaManifiesto: hoy(),
  fechaInicioPeriodo: "",
  fechaFinPeriodo: "",
  titulo: "",
  nombreFirmante: "",
  puesto: "",
  texto: "",
  firmaDataUrl: "",
};

export default function ManifiestoForm({
  manifiestoId: manifiestoIdInicial,
  puntoAcopioIdInicial,
}: {
  manifiestoId?: string;
  puntoAcopioIdInicial?: string;
}) {
  const router = useRouter();
  const [manifiestoId, setManifiestoId] = useState<string | null>(manifiestoIdInicial ?? null);
  const [puntos, setPuntos] = useState<PuntoAcopio[]>([]);
  const [form, setForm] = useState({
    ...FORM_VACIO,
    puntoAcopioId: puntoAcopioIdInicial ?? "",
  });
  const [filas, setFilas] = useState<FilaAcopioManifiesto[]>([]);
  const [cargandoAcopios, setCargandoAcopios] = useState(false);
  const [cargando, setCargando] = useState(!!manifiestoIdInicial);
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soloLectura, setSoloLectura] = useState(false);

  useEffect(() => {
    fetch("/api/puntos-acopio")
      .then((r) => r.json())
      .then(setPuntos);
  }, []);

  useEffect(() => {
    if (!manifiestoIdInicial) return;
    fetch(`/api/manifiestos/${manifiestoIdInicial}`)
      .then((r) => r.json())
      .then((m: ManifiestoDetalle) => {
        setForm({
          puntoAcopioId: m.puntoAcopioId,
          fechaManifiesto: m.fechaManifiesto.slice(0, 10),
          fechaInicioPeriodo: m.fechaInicioPeriodo.slice(0, 10),
          fechaFinPeriodo: m.fechaFinPeriodo.slice(0, 10),
          titulo: m.titulo,
          nombreFirmante: m.nombreFirmante,
          puesto: m.puesto,
          texto: m.texto,
          firmaDataUrl: m.firmaDataUrl ?? "",
        });
        setSoloLectura(m.estatus !== "borrador");
        setCargando(false);
      });
  }, [manifiestoIdInicial]);

  const puntoSeleccionado = puntos.find((p) => p.id === form.puntoAcopioId) ?? null;

  const cargarAcopios = useCallback(async () => {
    if (!form.puntoAcopioId || !form.fechaInicioPeriodo || !form.fechaFinPeriodo) {
      setFilas([]);
      return;
    }
    setCargandoAcopios(true);
    const params = new URLSearchParams({
      puntoAcopioId: form.puntoAcopioId,
      desde: form.fechaInicioPeriodo,
      hasta: form.fechaFinPeriodo,
    });
    const res = await fetch(`/api/fechas-acopio?${params}`);
    const data: FechaAcopioApi[] = await res.json();
    const realizadas = data.filter((f) => f.estado === "realizada");
    setFilas(expandirAcopiosPorMaterial(realizadas));
    setCargandoAcopios(false);
  }, [form.puntoAcopioId, form.fechaInicioPeriodo, form.fechaFinPeriodo]);

  useEffect(() => {
    cargarAcopios();
  }, [cargarAcopios]);

  const total = useMemo(() => totalKgDeFilas(filas), [filas]);

  function onFirmaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, firmaDataUrl: reader.result as string }));
    reader.readAsDataURL(file);
  }

  async function guardarBorrador(): Promise<string | null> {
    setError(null);
    if (!form.puntoAcopioId) {
      setError("Selecciona un punto de acopio");
      return null;
    }
    if (!form.fechaInicioPeriodo || !form.fechaFinPeriodo) {
      setError("Completa la fecha inicial y final del periodo");
      return null;
    }
    if (form.fechaFinPeriodo < form.fechaInicioPeriodo) {
      setError("La fecha final no puede ser anterior a la fecha inicial");
      return null;
    }
    setGuardando(true);
    const url = manifiestoId ? `/api/manifiestos/${manifiestoId}` : "/api/manifiestos";
    const method = manifiestoId ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setGuardando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "No se pudo guardar el manifiesto");
      return null;
    }
    const data = await res.json();
    if (!manifiestoId) {
      setManifiestoId(data.id);
      router.replace(`/manifiestos/${data.id}`);
    }
    return data.id ?? manifiestoId;
  }

  async function generarPdf() {
    setError(null);

    const camposFaltantes: string[] = [];
    if (!form.titulo) camposFaltantes.push("título");
    if (!form.nombreFirmante) camposFaltantes.push("nombre del firmante");
    if (!form.puesto) camposFaltantes.push("puesto");
    if (!form.texto) camposFaltantes.push("texto");
    if (!form.firmaDataUrl) camposFaltantes.push("firma");
    if (filas.length === 0) camposFaltantes.push("al menos un registro de acopio");
    if (camposFaltantes.length > 0) {
      setError(`Faltan datos obligatorios: ${camposFaltantes.join(", ")}`);
      return;
    }

    // Advertencia si ya existe un manifiesto para el mismo punto y periodo exacto.
    const existentesRes = await fetch(`/api/manifiestos?puntoAcopioId=${form.puntoAcopioId}`);
    const existentes = await existentesRes.json();
    const duplicado = existentes.some(
      (m: { id: string; fechaInicioPeriodo: string; fechaFinPeriodo: string }) =>
        m.id !== manifiestoId &&
        m.fechaInicioPeriodo.slice(0, 10) === form.fechaInicioPeriodo &&
        m.fechaFinPeriodo.slice(0, 10) === form.fechaFinPeriodo,
    );
    if (duplicado) {
      const continuar = confirm(
        "Ya existe un manifiesto para este punto de acopio con exactamente el mismo periodo. ¿Deseas crear otro de todas formas?",
      );
      if (!continuar) return;
    }

    const id = await guardarBorrador();
    if (!id) return;

    setGenerando(true);
    const res = await fetch(`/api/manifiestos/${id}/generar`, { method: "POST" });
    setGenerando(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "No se pudo generar el PDF");
      return;
    }
    router.push("/manifiestos");
  }

  if (cargando) {
    return <p className="text-sm text-foreground/60">Cargando...</p>;
  }

  return (
    <div className="space-y-6 pb-10">
      <div>
        <h1 className="text-xl font-semibold">{manifiestoId ? "Editar manifiesto" : "Crear manifiesto"}</h1>
        <p className="text-sm text-foreground/60">
          La información de acopios se toma automáticamente de los registros existentes.
        </p>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Punto de acopio</span>
          <select
            value={form.puntoAcopioId}
            onChange={(e) => setForm({ ...form, puntoAcopioId: e.target.value })}
            disabled={soloLectura}
            className="input"
          >
            <option value="">Selecciona un punto</option>
            {puntos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          {puntoSeleccionado && (
            <p className="text-xs text-[var(--muted)]">
              Benefactor: <span className="font-medium">{puntoSeleccionado.nombre}</span>
            </p>
          )}
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Fecha del manifiesto</span>
          <input
            type="date"
            value={form.fechaManifiesto}
            onChange={(e) => setForm({ ...form, fechaManifiesto: e.target.value })}
            disabled={soloLectura}
            className="input"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Fecha inicial del periodo</span>
          <input
            type="date"
            value={form.fechaInicioPeriodo}
            onChange={(e) => setForm({ ...form, fechaInicioPeriodo: e.target.value })}
            disabled={soloLectura}
            className="input"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Fecha final del periodo</span>
          <input
            type="date"
            value={form.fechaFinPeriodo}
            onChange={(e) => setForm({ ...form, fechaFinPeriodo: e.target.value })}
            disabled={soloLectura}
            className="input"
          />
        </label>
      </div>

      <div className="rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4">
        <h2 className="mb-3 text-sm font-semibold">Acopios del periodo</h2>
        {cargandoAcopios ? (
          <p className="text-sm text-foreground/60">Consultando acopios...</p>
        ) : filas.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {form.puntoAcopioId && form.fechaInicioPeriodo && form.fechaFinPeriodo
              ? "No se encontraron registros de acopio para el punto y periodo seleccionados"
              : "Selecciona punto de acopio y periodo para ver los acopios"}
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/50 text-left">
                  <tr>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Material</th>
                    <th className="px-3 py-2">Kilogramos</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((f, i) => (
                    <tr key={i} className="border-t border-white/50">
                      <td className="px-3 py-2">{f.fecha.toISOString().slice(0, 10)}</td>
                      <td className="px-3 py-2">{f.material}</td>
                      <td className="px-3 py-2">{f.kg.toFixed(2)} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-right text-sm font-semibold">
              TOTAL ACUMULADO: {total.toFixed(2)} kg
            </p>
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 rounded-xl border border-white/50 bg-white/40 backdrop-blur-md p-4">
        <label className="space-y-1 text-sm">
          <span className="font-medium">Título</span>
          <input
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            placeholder="Manifiesto de Acopio"
            disabled={soloLectura}
            className="input"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">Texto</span>
          <textarea
            value={form.texto}
            onChange={(e) => setForm({ ...form, texto: e.target.value })}
            rows={4}
            disabled={soloLectura}
            className="input"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm">
            <span className="font-medium">Nombre del firmante</span>
            <input
              value={form.nombreFirmante}
              onChange={(e) => setForm({ ...form, nombreFirmante: e.target.value })}
              disabled={soloLectura}
              className="input"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-medium">Puesto</span>
            <input
              value={form.puesto}
              onChange={(e) => setForm({ ...form, puesto: e.target.value })}
              disabled={soloLectura}
              className="input"
            />
          </label>
        </div>
        <div className="space-y-1 text-sm">
          <span className="font-medium">Firma</span>
          {!soloLectura && (
            <label className="flex w-fit cursor-pointer items-center gap-2 rounded-xl border border-dashed border-white/60 bg-white/30 px-3 py-2 text-sm hover:bg-white/50">
              <Upload className="h-4 w-4" />
              {form.firmaDataUrl ? "Cambiar imagen de firma" : "Subir imagen de firma"}
              <input type="file" accept="image/*" className="hidden" onChange={onFirmaChange} />
            </label>
          )}
          {form.firmaDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.firmaDataUrl} alt="Firma" className="mt-2 h-16 rounded border border-white/60 bg-white/50 p-1" />
          )}
        </div>
      </div>

      {soloLectura ? (
        <p className="rounded-xl border border-white/50 bg-white/40 px-3 py-2 text-sm text-foreground/60">
          Este manifiesto ya fue generado (o cancelado) y no se puede modificar. Duplícalo desde el
          historial si necesitas hacer ajustes.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={guardarBorrador}
            disabled={guardando}
            className="rounded-xl border border-[var(--brand-blue)] px-4 py-2 text-sm font-medium text-[var(--brand-blue)] hover:bg-white/40 disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Guardar como borrador"}
          </button>
          <button
            onClick={generarPdf}
            disabled={generando || guardando}
            className="rounded-xl bg-[var(--brand-blue)] px-4 py-2 text-sm font-medium text-[var(--accent-foreground)] shadow-sm disabled:opacity-50"
          >
            {generando ? "Generando…" : "Generar PDF"}
          </button>
        </div>
      )}
    </div>
  );
}
