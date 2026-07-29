import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const MS_POR_DIA = 1000 * 60 * 60 * 24;

function calcularFrecuencia(fechas: Date[]): string {
  if (fechas.length < 2) return "Sin datos suficientes";
  const ordenadas = [...fechas].sort((a, b) => a.getTime() - b.getTime());
  let sumaDias = 0;
  for (let i = 1; i < ordenadas.length; i++) {
    sumaDias += (ordenadas[i].getTime() - ordenadas[i - 1].getTime()) / MS_POR_DIA;
  }
  const promedio = sumaDias / (ordenadas.length - 1);
  if (promedio <= 100) return "Trimestral";
  if (promedio <= 200) return "Semestral";
  return "Anual";
}

// Umbrales confirmados por el usuario: rosa <=2, amarillo ==3, verde >=4,
// medidos en una ventana móvil de los últimos 6 meses (no el semestre calendario).
function calcularSemaforo(conteo: number) {
  if (conteo <= 2) return { color: "pink" as const, label: "Rosa" };
  if (conteo === 3) return { color: "amber" as const, label: "Amarillo" };
  return { color: "green" as const, label: "Verde" };
}

export async function GET() {
  const hoy = new Date();
  const inicioVentanaMovil = new Date(hoy.getFullYear(), hoy.getMonth() - 6, hoy.getDate());

  const puntos = await prisma.puntoAcopio.findMany({
    include: {
      fechas: {
        where: { estado: "realizada" },
        orderBy: { fecha: "asc" },
      },
    },
    orderBy: { nombre: "asc" },
  });

  const filas = puntos.map((punto) => {
    const fechas = punto.fechas.map((f) => f.fecha);

    const conteoVentanaMovil = fechas.filter((f) => f >= inicioVentanaMovil && f <= hoy).length;

    const kgsTapasTotal = punto.fechas.reduce((suma, f) => suma + (f.tapasKg ?? 0), 0);
    const ultimaRecoleccion = fechas.length > 0 ? fechas[fechas.length - 1] : null;

    return {
      id: punto.id,
      nombre: punto.nombre,
      municipio: punto.zona,
      tipoContenedor: punto.tipoContenedor,
      decisionReubicacion: punto.decisionReubicacion,
      numeroCelular: punto.numeroCelular,
      correoElectronico: punto.correoElectronico,
      totalRecolecciones: fechas.length,
      ultimaRecoleccion,
      kgsTapasTotal,
      frecuencia: calcularFrecuencia(fechas),
      semaforo: calcularSemaforo(conteoVentanaMovil),
      conteoVentanaMovil,
    };
  });

  filas.sort((a, b) => {
    const orden = { Rosa: 0, Amarillo: 1, Verde: 2 };
    return orden[a.semaforo.label as keyof typeof orden] - orden[b.semaforo.label as keyof typeof orden];
  });

  return NextResponse.json({ filas });
}
