// Espejo app -> Notion de los campos de Puntos de Acopio que también viven en
// Notion. Función pura: dado el registro antes y después de una edición,
// devuelve SOLO las propiedades de Notion que realmente cambiaron, para no
// empujar a Notion valores viejos de campos que el usuario no tocó.
//
// La dirección se refleja por sus tres partes (calle, número exterior, número
// interior); "direccion" en sí es una cadena derivada y nunca se escribe.

import { materialesCanonicos } from "./materiales";

export type CamposEspejo = {
  nombre: string;
  calle: string | null;
  numeroExterior: string | null;
  numeroInterior: string | null;
  zona: string | null;
  estado: string | null;
  numeroCelular: string | null;
  correoElectronico: string | null;
  tipoContenedor: string | null;
  decisionReubicacion: string | null;
  contacto: string | null;
  googleMapsUrl: string | null;
  materiales: string;
};

type Tipo = "title" | "rich_text" | "phone_number" | "email" | "select" | "url" | "multi_select";

const MAPEO: { campo: keyof CamposEspejo; propiedad: string; tipo: Tipo }[] = [
  { campo: "nombre", propiedad: "Empresa, institución, otro", tipo: "title" },
  { campo: "calle", propiedad: "Calle", tipo: "rich_text" },
  // OJO: la propiedad se llama "Numero Exterior " (con espacio al final) en Notion.
  { campo: "numeroExterior", propiedad: "Numero Exterior ", tipo: "rich_text" },
  { campo: "numeroInterior", propiedad: "Numero Interior", tipo: "rich_text" },
  { campo: "zona", propiedad: "Municipio", tipo: "rich_text" },
  { campo: "estado", propiedad: "Estado", tipo: "rich_text" },
  { campo: "numeroCelular", propiedad: "Numero Celular", tipo: "phone_number" },
  { campo: "correoElectronico", propiedad: "Correo electrónico", tipo: "email" },
  { campo: "tipoContenedor", propiedad: "Tipo de contenedor", tipo: "select" },
  { campo: "decisionReubicacion", propiedad: "Decisión de Reubicación", tipo: "select" },
  { campo: "contacto", propiedad: "Nombre de contacto", tipo: "rich_text" },
  { campo: "googleMapsUrl", propiedad: "URL Google Maps", tipo: "url" },
  { campo: "materiales", propiedad: "Materiales aceptados", tipo: "multi_select" },
];

const vacioANull = (v: string | null | undefined) => (v == null || v === "" ? null : v);

// Los materiales se comparan por los materiales reconocidos, no por el texto
// ("tapas, PET, aluminio" y "Tapas, PET, Aluminio" son lo mismo).
function normalizar(tipo: Tipo, v: string | null | undefined): string | null {
  if (tipo === "multi_select") return materialesCanonicos(v).join(",") || null;
  return vacioANull(v);
}

function valorNotion(tipo: Tipo, valor: string | null): unknown {
  switch (tipo) {
    case "title":
      return { title: [{ text: { content: valor ?? "" } }] };
    case "rich_text":
      return { rich_text: valor ? [{ text: { content: valor } }] : [] };
    case "phone_number":
      return { phone_number: valor };
    case "email":
      return { email: valor };
    case "select":
      return { select: valor ? { name: valor } : null };
    case "url":
      return { url: valor };
    case "multi_select":
      return { multi_select: valor ? valor.split(",").map((name) => ({ name })) : [] };
  }
}

export function construirPropiedadesNotion(
  antes: CamposEspejo,
  despues: CamposEspejo,
): Record<string, unknown> {
  const propiedades: Record<string, unknown> = {};
  for (const { campo, propiedad, tipo } of MAPEO) {
    const a = normalizar(tipo, antes[campo]);
    const d = normalizar(tipo, despues[campo]);
    if (a === d) continue;
    // El título de una página de Notion no puede quedar vacío.
    if (tipo === "title" && d === null) continue;
    propiedades[propiedad] = valorNotion(tipo, d);
  }
  return propiedades;
}
