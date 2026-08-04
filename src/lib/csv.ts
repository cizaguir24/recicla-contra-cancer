// Exportación CSV sin librerías: arma el texto delimitado por comas, antepone el
// BOM (para que Excel detecte UTF-8 correctamente) y dispara la descarga vía un
// <a> sintético.
function descargarBlob(nombreArchivo: string, contenido: string) {
  const blob = new Blob([`﻿${contenido}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

function filaCSV(valores: (string | number)[]): string {
  return valores.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(",");
}

export function descargarCSV(
  nombreArchivo: string,
  encabezados: string[],
  filas: (string | number)[][],
) {
  const csv = [encabezados.join(","), ...filas.map(filaCSV)].join("\n");
  descargarBlob(nombreArchivo, csv);
}
