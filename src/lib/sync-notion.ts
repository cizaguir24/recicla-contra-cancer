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
} from "@/lib/notion";

const ACOPIOS_2026_DATA_SOURCE_ID = "2dcbc6f4-11db-81d0-8cb2-000bb99aafb0";

export async function sincronizarNotion() {
  const pages = await queryDataSource(ACOPIOS_2026_DATA_SOURCE_ID);

  const puntoIdPorUbicacion = new Map<string, string>();

  let creados = 0;
  let actualizados = 0;

  for (const page of pages) {
    const fechaStr = getDateStart(page, "Fecha de Acopio");
    if (!fechaStr) continue;

    const [ubicacionId] = getRelationIds(page, "Ubicación");
    if (!ubicacionId) continue;

    let puntoAcopioId = puntoIdPorUbicacion.get(ubicacionId);

    if (!puntoAcopioId) {
      const ubicacionPage = await getPage(ubicacionId);
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
      // "N/A" es el placeholder que se usa en Notion cuando el campo no aplica.
      const esPlaceholder = (v: string) => !v || v.trim().toUpperCase() === "N/A";
      const direccion = [
        !esPlaceholder(calle) ? calle : null,
        !esPlaceholder(numeroExterior) ? `#${numeroExterior}` : null,
        !esPlaceholder(numeroInterior) ? `Int. ${numeroInterior}` : null,
      ]
        .filter(Boolean)
        .join(" ");

      const punto = await prisma.puntoAcopio.upsert({
        where: { notionPageId: ubicacionId },
        create: {
          nombre,
          direccion,
          materiales: "tapas, PET, aluminio",
          zona: municipio,
          estado: estadoDireccion,
          tipoContenedor,
          decisionReubicacion,
          numeroCelular,
          correoElectronico,
          notionPageId: ubicacionId,
        },
        update: {
          nombre,
          direccion,
          zona: municipio,
          estado: estadoDireccion,
          tipoContenedor,
          decisionReubicacion,
          numeroCelular,
          correoElectronico,
        },
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

  return { creados, actualizados, total: pages.length };
}
