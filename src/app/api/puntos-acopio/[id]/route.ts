import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { setCheckboxProperty, actualizarPropiedadesNotion } from "@/lib/notion";
import { construirPropiedadesNotion } from "@/lib/notion-writeback";
import {
  componerDireccion,
  direccionParaGeocodificar,
  partesConsistentes,
} from "@/lib/direccion-compuesta";
import { geocodificarDireccion, esperar } from "@/lib/geocode";

// Re-ubicar el punto en el mapa puede hacer hasta 2 consultas a Nominatim
// (1 solicitud por segundo): damos margen sobre el límite por defecto.
export const maxDuration = 30;

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  const punto = await prisma.puntoAcopio.findUnique({ where: { id } });
  if (!punto) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json(punto);
}

function conLimite<T>(promesa: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, rechazar) => setTimeout(() => rechazar(new Error("tiempo agotado")), ms)),
  ]);
}

// Una parte de la dirección (calle / número): si lo escrito es igual al valor
// guardado salvo por espacios, se conserva el valor guardado tal cual.
function parteDireccion(nuevo: unknown, existente: string | null): string | null {
  const n = typeof nuevo === "string" ? nuevo.trim() : "";
  const e = (existente ?? "").trim();
  return n === e ? existente : n || null;
}

export async function PATCH(request: NextRequest, { params }: Context) {
  const { id } = await params;
  const body = await request.json();

  // Estado previo: sirve para componer la dirección por partes y para mandar a
  // Notion solo lo que de verdad cambió.
  const antes = await prisma.puntoAcopio.findUnique({ where: { id } });

  // Solo se incluyen las llaves presentes en el body, para soportar
  // actualizaciones parciales (ej. desde la tarjeta de Desempeño) sin
  // borrar campos que ese formulario no envía.
  const data: Prisma.PuntoAcopioUpdateInput = {};
  if ("nombre" in body) data.nombre = body.nombre;
  if ("direccion" in body) data.direccion = body.direccion;
  if ("zona" in body) data.zona = body.zona || null;
  if ("materiales" in body) data.materiales = body.materiales;
  if ("responsable" in body) data.responsable = body.responsable || null;
  if ("contacto" in body) data.contacto = body.contacto || null;
  if ("activo" in body) data.activo = body.activo;
  if ("estado" in body) data.estado = body.estado || null;
  if ("tipoContenedor" in body) data.tipoContenedor = body.tipoContenedor || null;
  if ("decisionReubicacion" in body) data.decisionReubicacion = body.decisionReubicacion || null;
  if ("numeroCelular" in body) data.numeroCelular = body.numeroCelular || null;
  if ("correoElectronico" in body) data.correoElectronico = body.correoElectronico || null;
  if ("googleMapsUrl" in body) data.googleMapsUrl = body.googleMapsUrl || null;

  // Dirección por partes: solo para puntos que vienen de Notion y cuyas partes
  // guardadas reproducen su dirección actual. La cadena `direccion` se deriva
  // de las partes con la misma regla que usa el sync, y reemplaza a cualquier
  // `direccion` enviada en el mismo body. Si las partes no son consistentes
  // se ignoran y todo sigue funcionando como antes (dirección como cadena).
  const tocaPartes = ["calle", "numeroExterior", "numeroInterior"].some((k) => k in body);
  if (tocaPartes && antes && partesConsistentes(antes)) {
    const calle = "calle" in body ? parteDireccion(body.calle, antes.calle) : antes.calle;
    const numeroExterior =
      "numeroExterior" in body
        ? parteDireccion(body.numeroExterior, antes.numeroExterior)
        : antes.numeroExterior;
    const numeroInterior =
      "numeroInterior" in body
        ? parteDireccion(body.numeroInterior, antes.numeroInterior)
        : antes.numeroInterior;
    data.calle = calle;
    data.numeroExterior = numeroExterior;
    data.numeroInterior = numeroInterior;
    data.direccion = componerDireccion({ calle, numeroExterior, numeroInterior });
  }

  let punto = await prisma.puntoAcopio.update({ where: { id }, data });

  // Si la dirección con la que se ubica el punto cambió en esta edición, se
  // vuelve a ubicar solo este punto (misma lógica que el sync: dirección exacta
  // y, si no se encuentra, municipio/estado). Si falla, se conserva la
  // ubicación anterior. Estado en el header X-Geocode: "no-aplica" | "ok" | "fallo".
  let geocode = "no-aplica";
  if (antes) {
    const completaAntes = direccionParaGeocodificar(antes);
    const completaAhora = direccionParaGeocodificar(punto);
    if (completaAhora && completaAhora !== completaAntes && completaAhora !== punto.geocodificadoDireccion) {
      try {
        let coords = await conLimite(geocodificarDireccion(completaAhora), 8000);
        if (!coords) {
          const municipioEstado = [punto.zona, punto.estado].filter(Boolean).join(", ");
          if (municipioEstado) {
            await esperar(1000);
            coords = await conLimite(geocodificarDireccion(municipioEstado), 8000);
          }
        }
        if (coords) {
          punto = await prisma.puntoAcopio.update({
            where: { id },
            data: { lat: coords.lat, lng: coords.lng, geocodificadoDireccion: completaAhora },
          });
          geocode = "ok";
        } else {
          geocode = "fallo";
        }
      } catch (err) {
        console.error("No se pudo volver a ubicar el punto en el mapa:", err);
        geocode = "fallo";
      }
    }
  }

  // Estado del espejo hacia Notion, informado en el header X-Notion-Sync:
  // "no-aplica" (punto sin página en Notion) | "sin-cambios" | "ok" | "error".
  // Ninguna falla de Notion tumba la actualización ya guardada en la app.
  let notionSync = "no-aplica";

  if (punto.notionPageId) {
    notionSync = "sin-cambios";

    // Refleja Activo/Inactivo en la casilla "Activo (sistema)" de Ubicaciones.
    if ("activo" in body) {
      try {
        await setCheckboxProperty(punto.notionPageId, "Activo (sistema)", punto.activo);
        notionSync = "ok";
      } catch (err) {
        console.error("No se pudo reflejar Activo en Notion:", err);
        notionSync = "error";
      }
    }

    // Refleja el resto de campos que también vienen de Notion (nombre, calle,
    // números, municipio, estado, celular, correo, tipo de contenedor,
    // decisión de reubicación) — solo los que cambiaron en esta edición.
    if (antes) {
      const propiedades = construirPropiedadesNotion(antes, punto);
      if (Object.keys(propiedades).length > 0) {
        try {
          await actualizarPropiedadesNotion(punto.notionPageId, propiedades);
          if (notionSync !== "error") notionSync = "ok";
        } catch (err) {
          console.error("No se pudieron reflejar los cambios en Notion:", err);
          notionSync = "error";
        }
      }
    }
  }

  return NextResponse.json(punto, {
    headers: { "X-Notion-Sync": notionSync, "X-Geocode": geocode },
  });
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  const { id } = await params;
  await prisma.puntoAcopio.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
