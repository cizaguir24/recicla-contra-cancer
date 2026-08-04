// Exportación CSV sin librerías: arma el texto delimitado por comas, antepone el
// BOM (para que Excel detecte UTF-8 correctamente) y dispara la descarga vía un
// <a> sintético.
export function descargarCSV(
  nombreArchivo: string,
  encabezados: string[],
  filas: (string | number)[][],
) {
  const lineas = filas.map((fila) =>
    fila.map((valor) => `"${String(valor).replace(/"/g, '""')}"`).join(","),
  );
  const csv = [encabezados.join(","), ...lineas].join("\n");

  const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}
