import { prisma } from "@/lib/prisma";
import {
  queryDataSource,
  getPage,
  getTitleText,
  getRichText,
  getSelectName,
  getNumber,
  getDateStart,
  getFormulaNumber,
  getRelationIds,
  getPhoneNumber,
  getEmail,
  getUrl,
  getMultiSelectNames,
  type NotionPage,
} from "@/lib/notion";
import { geocodificarDireccion, esperar } from "@/lib/geocode";
import { detectarHuerfanos } from "@/lib/notion-huerfanos";
import {
  esPlaceholder,
  componerDireccion,
  direccionParaGeocodificar,
} from "@/lib/direccion-compuesta";
import { materialesCanonicos, materialesATexto, mismosMateriales } from "@/lib/materiales";

const ACOPIOS_2026_DATA_SOURCE_ID = "2dcbc6f4-11db-81d0-8cb2-000bb99aafb0";
const UBICACIONES_DATA_SOURCE_ID = "f6e38491-8e9b-4008-9386-4201289ad652";

// Una fecha "tiene captura" cuando al menos un material llegó con kg > 0.
function tieneKgCapturados(datos: {
  petKg: number | null;
  tapasKg: number | null;
  aluminioKg: number | null;
  tapasWinsKg: number | null;
}) {
  return [datos.petKg, datos.tapasKg, datos.aluminioKg, datos.tapasWinsKg].some(
    (kg) => (kg ?? 0) > 0,
  );
}

// Materiales aceptados según Notion (texto canónico), o null si Notion no trae
// ninguno reconocido. Notion vacío NUNCA borra lo que ya tiene la app: los
// puntos nuevos del formulario llegan sin materiales y conservan el valor por defecto.
export function materialesDesdeNotion(ubicacionPage: NotionPage): string | null {
  const lista = materialesCanonicos(getMultiSelectNames(ubicacionPage, "Materiales aceptados"));
  return lista.length > 0 ? materialesATexto(lista) : null;
}

export function datosPuntoDesdeNotion(ubicacionPage: NotionPage) {
  const nombre =
    getTitleText(ubicacionPage, "Empresa, institución, otro") || "Sin nombre (Notion)";
  const municipio = getRichText(ubicacionPage, "Municipio") || null;
  const tipoContenedor = getSelectName(ubicacionPage, "Tipo de contenedor");
  const decisionReubicacion = getSelectName(ubicacionPage, "Decisión de Reubicación");
  const numeroCelular = getPhoneNumber(ubicacionPage, "Numero Celular");
  const correoElectronico = getEmail(ubicacionPage, "Correo electrónico");
  const estadoDireccion = getRichText(ubicacionPage, "Estado") || null;
  const calle = getRichText(ubicacionPage, "Calle");
  const numeroExterior = getRichText(ubicacionPage, "Numero Exterior ");
  const numeroInterior = getRichText(ubicacionPage, "Numero Interior");
  const direccion = componerDireccion({ calle, numeroExterior, numeroInterior });
  const contacto = getRichText(ubicacionPage, "Nombre de contacto").trim() || null;
  const googleMapsUrl = getUrl(ubicacionPage, "URL Google Maps")?.trim() || null;

  return {
    nombre,
    direccion,
    // Las tres partes se guardan aparte (sin los "N/A") para poder editarlas
    // por separado en la app; `direccion` sigue siendo la cadena compuesta.
    calle: esPlaceholder(calle) ? null : calle,
    numeroExterior: esPlaceholder(numeroExterior) ? null : numeroExterior,
    numeroInterior: esPlaceholder(numeroInterior) ? null : numeroInterior,
    zona: municipio,
    estado: estadoDireccion,
    tipoContenedor,
    decisionReubicacion,
    numeroCelular,
    correoElectronico,
    contacto,
    // Igual que los materiales: una URL vacía en Notion no borra la de la app.
    ...(googleMapsUrl ? { googleMapsUrl } : {}),
  };
}

function direccionCompletaParaGeocodificar(datos: {
  direccion: string;
  zona: string | null;
  estado: string | null;
}) {
  return direccionParaGeocodificar(datos);
}

export async function sincronizarNotion() {
  // 1. Sincroniza TODAS las ubicaciones de Notion como Puntos de Acopio,
  //    tengan o no acopios capturados todavía (ej. benefactores nuevos).
  const ubicaciones = await queryDataSource(UBICACIONES_DATA_SOURCE_ID);
  const puntoIdPorUbicacion = new Map<string, string>();
  let puntosCreados = 0;
  let puntosActualizados = 0;
  let puntosGeocodificados = 0;

  for (const ubicacionPage of ubicaciones) {
    const datos = datosPuntoDesdeNotion(ubicacionPage);
    const direccionCompleta = direccionCompletaParaGeocodificar(datos);

    const existente = await prisma.puntoAcopio.findUnique({
      where: { notionPageId: ubicacionPage.id },
    });

    // Solo se pisa el texto de materiales si Notion trae otros distintos.
    const materialesNotion = materialesDesdeNotion(ubicacionPage);
    const datosMateriales =
      materialesNotion && !mismosMateriales(existente?.materiales, materialesNotion)
        ? { materiales: materialesNotion }
        : {};

    // Solo se geocodifica cuando es nuevo o cuando la dirección cambió desde
    // la última vez, para no repetir llamadas innecesarias en cada sync.
    let datosGeo: { lat?: number | null; lng?: number | null; geocodificadoDireccion?: string } = {};
    if (direccionCompleta && existente?.geocodificadoDireccion !== direccionCompleta) {
      let coords = await geocodificarDireccion(direccionCompleta);
      await esperar(1000); // respeta el límite de 1 solicitud/segundo de Nominatim

      // La dirección exacta de Notion suele ser demasiado imprecisa para
      // Nominatim; si falla, se intenta con municipio/estado (menos preciso
      // pero mucho más confiable) para no dejar el punto sin ubicar.
      if (!coords) {
        const municipioEstado = [datos.zona, datos.estado].filter(Boolean).join(", ");
        if (municipioEstado) {
          coords = await geocodificarDireccion(municipioEstado);
          await esperar(1000);
        }
      }

      datosGeo = {
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
        geocodificadoDireccion: direccionCompleta,
      };
      puntosGeocodificados++;
    }

    const punto = await prisma.puntoAcopio.upsert({
      where: { notionPageId: ubicacionPage.id },
      create: {
        ...datos,
        ...datosGeo,
        materiales: materialesNotion ?? "tapas, PET, aluminio",
        notionPageId: ubicacionPage.id,
      },
      update: { ...datos, ...datosGeo, ...datosMateriales },
    });

    if (existente) puntosActualizados++;
    else puntosCreados++;
    puntoIdPorUbicacion.set(ubicacionPage.id, punto.id);
  }

  // 2. Sincroniza los acopios (Acopios 2026), vinculándolos al punto ya sincronizado.
  const pages = await queryDataSource(ACOPIOS_2026_DATA_SOURCE_ID);

  let creados = 0;
  let actualizados = 0;
  let fusionados = 0;
  let duplicadosEliminados = 0;

  for (const page of pages) {
    const fechaStr = getDateStart(page, "Fecha de Acopio");
    if (!fechaStr) continue;

    const [ubicacionId] = getRelationIds(page, "Ubicación");
    if (!ubicacionId) continue;

    let puntoAcopioId = puntoIdPorUbicacion.get(ubicacionId);

    if (!puntoAcopioId) {
      // No debería pasar (toda ubicación ya se sincronizó arriba), pero por
      // seguridad se resuelve igual si el acopio referencia algo fuera de esa lista.
      const ubicacionPage = await getPage(ubicacionId);
      const datos = datosPuntoDesdeNotion(ubicacionPage);
      const materialesNotion = materialesDesdeNotion(ubicacionPage);
      const punto = await prisma.puntoAcopio.upsert({
        where: { notionPageId: ubicacionId },
        create: {
          ...datos,
          materiales: materialesNotion ?? "tapas, PET, aluminio",
          notionPageId: ubicacionId,
        },
        update: { ...datos, ...(materialesNotion ? { materiales: materialesNotion } : {}) },
      });
      puntoAcopioId = punto.id;
      puntoIdPorUbicacion.set(ubicacionId, puntoAcopioId);
    }

    const datosNotion = {
      fecha: new Date(fechaStr),
      petKg: getNumber(page, "PET Kgs"),
      tapasKg: getNumber(page, "Tapas Kgs"),
      aluminioKg: getNumber(page, "Aluminio Kgs"),
      tapasWinsKg: getNumber(page, "Tapas Wins Kgs "),
      totalTapas: getFormulaNumber(page, "Total Tapas"),
    };

    let existente = await prisma.fechaAcopio.findUnique({
      where: { notionPageId: page.id },
    });

    // Si esta página de Notion todavía no tiene fila propia, busca si ya
    // hay una fecha creada a mano (sin notionPageId, no cancelada) para el
    // mismo punto: se fusiona con la más cercana en el tiempo a la fecha
    // capturada (aunque no coincida el día exacto, ej. se programó para el
    // 11 y la visita real fue el 13) en vez de crear una fila duplicada.
    let fusionada = false;
    if (!existente) {
      const candidatas = await prisma.fechaAcopio.findMany({
        where: { puntoAcopioId, notionPageId: null, estado: { not: "cancelada" } },
      });
      if (candidatas.length > 0) {
        const fechaCaptura = new Date(fechaStr).getTime();
        existente = candidatas.reduce((masCercana, actual) =>
          Math.abs(actual.fecha.getTime() - fechaCaptura) <
          Math.abs(masCercana.fecha.getTime() - fechaCaptura)
            ? actual
            : masCercana,
        );
        fusionada = true;
      }
    }

    // Una fecha "programada" pasa a "realizada" sola en cuanto Notion trae
    // kg capturados; nunca se toca "cancelada" ni se retrocede una que ya
    // estaba "realizada" aunque los kg bajen a 0 en un sync posterior.
    const yaConCaptura = tieneKgCapturados(datosNotion);

    if (existente) {
      const debeMarcarRealizada = existente.estado === "programada" && yaConCaptura;
      await prisma.fechaAcopio.update({
        where: { id: existente.id },
        data: {
          ...datosNotion,
          notionPageId: page.id,
          ...(debeMarcarRealizada && { estado: "realizada" }),
        },
      });
      if (fusionada) fusionados++;
      else actualizados++;
    } else {
      await prisma.fechaAcopio.create({
        data: {
          ...datosNotion,
          estado: yaConCaptura ? "realizada" : "programada",
          puntoAcopioId,
          notionPageId: page.id,
        },
      });
      creados++;
    }
  }

  // Puntos activos vinculados a una página de Notion que ya no existe allá
  // (la borraron o movieron). Solo se reportan; no se modifica nada. Si la
  // consulta falla, el resto del resultado del sync se entrega igual.
  let huerfanos: { id: string; nombre: string }[] = [];
  try {
    const vinculados = await prisma.puntoAcopio.findMany({
      where: { notionPageId: { not: null } },
      select: { id: true, nombre: true, notionPageId: true, activo: true },
    });
    huerfanos = detectarHuerfanos(vinculados, new Set(ubicaciones.map((u) => u.id))).map(
      ({ id, nombre }) => ({ id, nombre }),
    );
  } catch (err) {
    console.error("No se pudieron detectar puntos huérfanos:", err);
  }

  return {
    creados,
    actualizados,
    fusionados,
    total: pages.length,
    puntosCreados,
    puntosActualizados,
    puntosTotal: ubicaciones.length,
    puntosGeocodificados,
    huerfanos,
  };
}
