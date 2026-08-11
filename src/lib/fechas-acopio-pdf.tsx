import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { esLogotipoValido } from "./manifiestos";
import { ESTADO_LABEL } from "./fechas-acopio";

const LOGOTIPO_ANCHO_PT = 170;
const LOGOTIPO_ALTO_PT = 56;

const COLOR_ESTADO: Record<string, string> = {
  programada: "#6b7280",
  realizada: "#16a34a",
  cancelada: "#ef4444",
};

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1f2430" },
  header: {
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    borderBottomStyle: "solid",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitleBlock: { flexShrink: 1 },
  headerTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#2563eb" },
  headerSubtitle: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  headerFiltros: { fontSize: 9, color: "#6b7280", marginTop: 6 },
  headerLogo: { width: LOGOTIPO_ANCHO_PT, height: LOGOTIPO_ALTO_PT, objectFit: "contain", objectPosition: "center" },

  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    marginBottom: 10,
    marginTop: 20,
  },

  resumenRow: { flexDirection: "row", flexWrap: "wrap", marginBottom: 4 },
  resumenItem: {
    marginRight: 24,
    marginBottom: 10,
  },
  resumenLabel: { fontSize: 8, color: "#6b7280" },
  resumenValue: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 2 },

  table: { marginBottom: 4 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#eaf1fe",
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  tableHeaderText: { fontFamily: "Helvetica-Bold", fontSize: 9 },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e7e9ed",
    borderBottomStyle: "solid",
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  colPunto: { width: "32%" },
  colFecha: { width: "16%" },
  colEstado: { width: "18%" },
  colNotas: { width: "34%" },
  estadoBadge: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  emptyNote: { fontSize: 9, color: "#6b7280", fontStyle: "italic", marginBottom: 4 },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#6b7280",
    textAlign: "center",
    borderTopWidth: 0.5,
    borderTopColor: "#e7e9ed",
    borderTopStyle: "solid",
    paddingTop: 8,
  },
  pageNumber: { position: "absolute", bottom: 24, right: 40, fontSize: 8, color: "#6b7280" },
});

function fmtFecha(iso: string) {
  return iso.slice(0, 10);
}

export type FechaAcopioPdfRow = {
  id: string;
  puntoAcopioNombre: string;
  fecha: string;
  estado: string;
  notas: string | null;
};

export type FechasAcopioDocumentProps = {
  logotipoDataUrl: string | null;
  filtros: { estado: string | null; desde: string | null; hasta: string | null };
  fechas: FechaAcopioPdfRow[];
};

export function FechasAcopioDocument({ logotipoDataUrl, filtros, fechas }: FechasAcopioDocumentProps) {
  const logotipo = esLogotipoValido(logotipoDataUrl) ? logotipoDataUrl : null;

  const porEstado: Record<string, number> = {};
  for (const f of fechas) {
    porEstado[f.estado] = (porEstado[f.estado] ?? 0) + 1;
  }

  const descripcionFiltros = [
    filtros.estado ? `Estado: ${ESTADO_LABEL[filtros.estado] ?? filtros.estado}` : "Todos los estados",
    filtros.desde || filtros.hasta
      ? `Del ${filtros.desde ?? "inicio"} al ${filtros.hasta ?? "hoy"}`
      : "Todo el rango de fechas",
  ].join(" · ");

  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Recicla Contra el Cáncer</Text>
            <Text style={styles.headerSubtitle}>Reporte de Fechas de Acopio · Un proyecto original de Cómplices AC</Text>
            <Text style={styles.headerFiltros}>{descripcionFiltros}</Text>
          </View>
          {logotipo && <Image src={logotipo} style={styles.headerLogo} />}
        </View>

        <Text style={styles.sectionTitle}>Resumen</Text>
        <View style={styles.resumenRow}>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>TOTAL DE FECHAS</Text>
            <Text style={styles.resumenValue}>{fechas.length}</Text>
          </View>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>PROGRAMADA</Text>
            <Text style={[styles.resumenValue, { color: COLOR_ESTADO.programada }]}>
              {porEstado.programada ?? 0}
            </Text>
          </View>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>REALIZADA</Text>
            <Text style={[styles.resumenValue, { color: COLOR_ESTADO.realizada }]}>
              {porEstado.realizada ?? 0}
            </Text>
          </View>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>CANCELADA</Text>
            <Text style={[styles.resumenValue, { color: COLOR_ESTADO.cancelada }]}>
              {porEstado.cancelada ?? 0}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Detalle de fechas ({fechas.length})</Text>
        {fechas.length === 0 ? (
          <Text style={styles.emptyNote}>No hay fechas de acopio con estos filtros.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader} fixed>
              <Text style={[styles.colPunto, styles.tableHeaderText]}>Punto de acopio</Text>
              <Text style={[styles.colFecha, styles.tableHeaderText]}>Fecha</Text>
              <Text style={[styles.colEstado, styles.tableHeaderText]}>Estado</Text>
              <Text style={[styles.colNotas, styles.tableHeaderText]}>Notas</Text>
            </View>
            {fechas.map((f) => (
              <View key={f.id} style={styles.tableRow} wrap={false}>
                <Text style={styles.colPunto}>{f.puntoAcopioNombre}</Text>
                <Text style={styles.colFecha}>{fmtFecha(f.fecha)}</Text>
                <Text style={[styles.colEstado, styles.estadoBadge, { color: COLOR_ESTADO[f.estado] ?? "#1f2430" }]}>
                  {ESTADO_LABEL[f.estado] ?? f.estado}
                </Text>
                <Text style={styles.colNotas}>{f.notas ?? ""}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.footer} fixed>
          Recicla Contra el Cáncer · Un proyecto original de Cómplices AC
        </Text>
        <Text
          style={styles.pageNumber}
          fixed
          render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
        />
      </Page>
    </Document>
  );
}
