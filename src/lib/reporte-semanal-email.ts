import nodemailer from "nodemailer";
import type { FilaDesempeno } from "./desempeno-data";

export type PuntoInactivo = {
  id: string;
  nombre: string;
  municipio: string | null;
  responsable: string | null;
  numeroCelular: string | null;
  contacto: string | null;
};

const URL_DESEMPENO = "https://reciclavscancer.complicesac.org/reportes/desempeno";
const TOP_ROJO = 30;

function destinatarios(): string[] {
  return (process.env.REPORTE_SEMANAL_DESTINATARIOS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function fmtFecha(d: Date | null) {
  if (!d) return "Sin recolecciones registradas";
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}

function filaRojoHtml(f: FilaDesempeno) {
  return `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #e7e9ed;font-weight:600;">${f.nombre}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e7e9ed;color:#6b7280;">${f.municipio ?? "—"}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e7e9ed;color:#6b7280;">${f.responsable ?? "—"}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e7e9ed;color:#6b7280;">${f.numeroCelular ?? "—"}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e7e9ed;text-align:center;">${f.conteoVentanaMovil}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e7e9ed;color:#6b7280;">${fmtFecha(f.ultimaRecoleccion)}</td>
    </tr>`;
}

function filaInactivoHtml(p: PuntoInactivo) {
  return `
    <tr>
      <td style="padding:8px 10px;border-bottom:1px solid #e7e9ed;font-weight:600;">${p.nombre}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e7e9ed;color:#6b7280;">${p.municipio ?? "—"}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e7e9ed;color:#6b7280;">${p.responsable ?? "—"}</td>
      <td style="padding:8px 10px;border-bottom:1px solid #e7e9ed;color:#6b7280;">${p.numeroCelular ?? p.contacto ?? "—"}</td>
    </tr>`;
}

function construirHtml(enRojo: FilaDesempeno[], inactivos: PuntoInactivo[]) {
  const fechaHoy = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" });

  // Los más urgentes primero: menos recolecciones y, en empate, la más
  // antigua (o nunca recolectada) antes que la más reciente.
  const enRojoOrdenado = [...enRojo].sort((a, b) => {
    if (a.conteoVentanaMovil !== b.conteoVentanaMovil) return a.conteoVentanaMovil - b.conteoVentanaMovil;
    const ta = a.ultimaRecoleccion?.getTime() ?? 0;
    const tb = b.ultimaRecoleccion?.getTime() ?? 0;
    return ta - tb;
  });
  const enRojoTop = enRojoOrdenado.slice(0, TOP_ROJO);
  const restantes = enRojoOrdenado.length - enRojoTop.length;

  const seccionRojo =
    enRojo.length === 0
      ? `<p style="color:#6b7280;font-size:14px;">Ningún contenedor activo está en rojo esta semana.</p>`
      : `<table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#fce7f3;text-align:left;">
              <th style="padding:8px 10px;">Punto de acopio</th>
              <th style="padding:8px 10px;">Municipio</th>
              <th style="padding:8px 10px;">Responsable</th>
              <th style="padding:8px 10px;">Celular</th>
              <th style="padding:8px 10px;text-align:center;">Recolecciones (6 meses)</th>
              <th style="padding:8px 10px;">Última recolección</th>
            </tr>
          </thead>
          <tbody>${enRojoTop.map(filaRojoHtml).join("")}</tbody>
        </table>
        ${
          restantes > 0
            ? `<p style="color:#6b7280;font-size:12px;margin-top:8px;">
                Mostrando los ${enRojoTop.length} más urgentes. Hay ${restantes} más — consulta el
                <a href="${URL_DESEMPENO}" style="color:#2563eb;">listado completo en Desempeño</a>.
              </p>`
            : ""
        }`;

  const seccionInactivos =
    inactivos.length === 0
      ? `<p style="color:#6b7280;font-size:14px;">No hay puntos de acopio inactivos.</p>`
      : `<table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#e7e9ed;text-align:left;">
              <th style="padding:8px 10px;">Punto de acopio</th>
              <th style="padding:8px 10px;">Municipio</th>
              <th style="padding:8px 10px;">Responsable</th>
              <th style="padding:8px 10px;">Contacto</th>
            </tr>
          </thead>
          <tbody>${inactivos.map(filaInactivoHtml).join("")}</tbody>
        </table>`;

  return `<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Reporte semanal de contenedores</title>
  </head>
  <body style="margin:0;padding:24px;background:#f7f8fa;">
    <div style="font-family:Helvetica,Arial,sans-serif;color:#1f2430;max-width:680px;margin:0 auto;">
      <div style="border-bottom:2px solid #2563eb;padding-bottom:12px;margin-bottom:20px;">
        <h1 style="color:#2563eb;font-size:18px;margin:0;">Recicla Contra el Cáncer</h1>
        <p style="color:#6b7280;font-size:12px;margin:4px 0 0;">Reporte semanal de contenedores · ${fechaHoy}</p>
      </div>

      <h2 style="color:#2563eb;font-size:14px;margin:0 0 8px;">🔴 En rojo — pocas recolecciones (${enRojo.length})</h2>
      <p style="color:#6b7280;font-size:12px;margin:0 0 10px;">2 o menos recolecciones realizadas en los últimos 6 meses.</p>
      ${seccionRojo}

      <h2 style="color:#2563eb;font-size:14px;margin:24px 0 8px;">⚪ Puntos inactivos (${inactivos.length})</h2>
      ${seccionInactivos}

      <p style="color:#6b7280;font-size:11px;margin-top:28px;border-top:1px solid #e7e9ed;padding-top:10px;">
        Recicla Contra el Cáncer · Un proyecto original de Cómplices AC
      </p>
    </div>
  </body>
</html>`;
}

export async function enviarReporteSemanal(enRojo: FilaDesempeno[], inactivos: PuntoInactivo[]) {
  const to = destinatarios();
  if (to.length === 0) {
    throw new Error("No hay destinatarios configurados (REPORTE_SEMANAL_DESTINATARIOS)");
  }
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error("Faltan credenciales de Gmail (GMAIL_USER / GMAIL_APP_PASSWORD)");
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  const fecha = new Date().toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });

  await transporter.sendMail({
    from: `"Recicla Contra el Cáncer" <${process.env.GMAIL_USER}>`,
    to: to.join(", "),
    subject: `Reporte semanal · ${enRojo.length} en rojo, ${inactivos.length} inactivos · ${fecha}`,
    html: construirHtml(enRojo, inactivos),
  });
}
