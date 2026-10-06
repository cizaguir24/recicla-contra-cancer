// Espejo app -> Notion de los campos de Puntos de Acopio que también vienen de
// Notion. Función pura: dado el registro antes y después de una edición,
// devuelve SOLO las propiedades de Notion que realmente cambiaron, para no
// empujar a Notion valores viejos de campos que el usuario no tocó.
//
// La dirección se refleja por sus tres partes (calle, número exterior, número
// interior); "direccion" en sí es una cadena derivada y nunca se escribe.

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
};

type Tipo = "title" | "rich_text" | "phone_number" | "email" | "select";

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
];

const vacioANull = (v: string | null | undefined) => (v == null || v === "" ? null : v);

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
  }
}

export function construirPropiedadesNotion(
  antes: CamposEspejo,
  despues: CamposEspejo,
): Record<string, unknown> {
  const propiedades: Record<string, unknown> = {};
  for (const { campo, propiedad, tipo } of MAPEO) {
    const a = vacioANull(antes[campo]);
    const d = vacioANull(despues[campo]);
    if (a === d) continue;
    // El título de una página de Notion no puede quedar vacío.
    if (tipo === "title" && d === null) continue;
    propiedades[propiedad] = valorNotion(tipo, d);
  }
  return propiedades;
}
