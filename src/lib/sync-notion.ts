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
  type NotionPage,
} from "@/lib/notion";

const ACOPIOS_2026_DATA_SOURCE_ID = "2dcbc6f4-11db-81d0-8cb2-000bb99aafb0";
const UBICACIONES_DATA_SOURCE_ID = "f6e38491-8e9b-4008-9386-4201289ad652";

// "N/A" es el placeholder que se usa en Notion cuando el campo no aplica.
function esPlaceholder(v: string) {
  return !v || v.trim().toUpperCase() === "N/A";
}

function datosPuntoDesdeNotion(ubicacionPage: NotionPage) {
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
  const direccion = [
    !esPlaceholder(calle) ? calle : null,
    !esPlaceholder(numeroExterior) ? `#${numeroExterior}` : null,
    !esPlaceholder(numeroInterior) ? `Int. ${numeroInterior}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  return {
    nombre,
    direccion,
    zona: municipio,
    estado: estadoDireccion,
    tipoContenedor,
    decisionReubicacion,
    numeroCelular,
    correoElectronico,
  };
}

export async function sincronizarNotion() {
  // 1. Sincroniza TODAS las ubicaciones de Notion como Puntos de Acopio,
  //    tengan o no acopios capturados todavía (ej. benefactores nuevos).
  const ubicaciones = await queryDataSource(UBICACIONES_DATA_SOURCE_ID);
  const puntoIdPorUbicacion = new Map<string, string>();
  let puntosCreados = 0;
  let puntosActualizados = 0;

  for (const ubicacionPage of ubicaciones) {
    const datos = datosPuntoDesdeNotion(ubicacionPage);

    const existente = await prisma.puntoAcopio.findUnique({
      where: { notionPageId: ubicacionPage.id },
    });

    const punto = await prisma.puntoAcopio.upsert({
      where: { notionPageId: ubicacionPage.id },
      create: {
        ...datos,
        materiales: "tapas, PET, aluminio",
        notionPageId: ubicacionPage.id,
      },
      update: datos,
    });

    if (existente) puntosActualizados++;
    else puntosCreados++;
    puntoIdPorUbicacion.set(ubicacionPage.id, punto.id);
  }

  // 2. Sincroniza los acopios (Acopios 2026), vinculándolos al punto ya sincronizado.
  const pages = await queryDataSource(ACOPIOS_2026_DATA_SOURCE_ID);

  let creados = 0;
  let actualizados = 0;

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
      const punto = await prisma.puntoAcopio.upsert({
        where: { notionPageId: ubicacionId },
        create: { ...datos, materiales: "tapas, PET, aluminio", notionPageId: ubicacionId },
        update: datos,
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

    const existente = await prisma.fechaAcopio.findUnique({
      where: { notionPageId: page.id },
    });

    if (existente) {
      await prisma.fechaAcopio.update({
        where: { id: existente.id },
        data: datosNotion,
      });
      actualizados++;
    } else {
      await prisma.fechaAcopio.create({
        data: {
          ...datosNotion,
          estado: "realizada",
          puntoAcopioId,
          notionPageId: page.id,
        },
      });
      creados++;
    }
  }

  return {
    creados,
    actualizados,
    total: pages.length,
    puntosCreados,
    puntosActualizados,
    puntosTotal: ubicaciones.length,
  };
}
