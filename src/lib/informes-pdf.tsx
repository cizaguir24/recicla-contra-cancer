import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { esLogotipoValido } from "./manifiestos";
import { MESES_LABEL, type InformesResponse, type MaterialKey } from "./informes";

const LOGOTIPO_ANCHO_PT = 170;
const LOGOTIPO_ALTO_PT = 56;

const COLOR_MATERIAL: Record<MaterialKey, string> = {
  tapasKg: "#2563eb",
  petKg: "#60a5fa",
  tapasWinsKg: "#1e3a8a",
  aluminioKg: "#93a5b8",
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
  headerPeriodo: { fontSize: 9, color: "#6b7280", marginTop: 6 },
  headerLogo: { width: LOGOTIPO_ANCHO_PT, height: LOGOTIPO_ALTO_PT, objectFit: "contain", objectPosition: "center" },

  sectionTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#2563eb",
    marginBottom: 10,
    marginTop: 20,
  },

  resumenGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  resumenItem: {
    width: "48%",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e7e9ed",
    borderBottomStyle: "solid",
  },
  resumenLabel: { fontSize: 8, color: "#6b7280" },
  resumenValue: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 2 },

  materialRow: { flexDirection: "row", alignItems: "center", marginBottom: 9 },
  materialLabel: { width: 95, fontSize: 9 },
  materialTrack: {
    flex: 1,
    height: 8,
    backgroundColor: "#e7e9ed",
    borderRadius: 4,
    marginHorizontal: 10,
  },
  materialBar: { height: 8, borderRadius: 4 },
  materialValue: { width: 125, fontSize: 8.5, textAlign: "right", color: "#3d4552" },

  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 110,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e7e9ed",
    borderBottomStyle: "solid",
    marginBottom: 4,
  },
  chartCol: { flex: 1, alignItems: "center" },
  chartVal: { fontSize: 6.5, color: "#3d4552", marginBottom: 2 },
  chartBar: { width: 16, borderRadius: 2 },
  chartLabelsRow: { flexDirection: "row" },
  chartLabel: { flex: 1, fontSize: 7, color: "#6b7280", textAlign: "center", marginTop: 4 },

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
  colRank: { width: "8%" },
  colNombre: { width: "52%" },
  colMunicipio: { width: "22%" },
  colKg: { width: "18%", textAlign: "right" },
  colDirNombre: { width: "55%" },
  colDirPuesto: { width: "45%" },
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

// A diferencia de las fechas de Manifiesto (guardadas como medianoche UTC),
// las fechas de periodo de Informes se calculan al vuelo con el constructor
// local de Date (ver resolverRangoPeriodo) — se leen de vuelta con getters
// locales para que el redondeo a UTC de por medio (toISOString) no corra el
// día según la zona horaria del servidor.
function fmtFecha(iso: string) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fmtKg(n: number) {
  return `${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;
}

export type InformesDocumentProps = {
  logotipoDataUrl: string | null;
  datos: InformesResponse;
};

export function InformesDocument({ logotipoDataUrl, datos }: InformesDocumentProps) {
  const logotipo = esLogotipoValido(logotipoDataUrl) ? logotipoDataUrl : null;
  const ind = datos.indicadores;
  const top10 = datos.centros.filter((c) => c.totalKg > 0).slice(0, 10);
  const maxMensual = Math.max(1, ...datos.graficoMensual.puntos.map((p) => p.kg));
  const maxMaterial = Math.max(1, ...datos.materiales.map((m) => m.kg));

  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Recicla Contra el Cáncer</Text>
            <Text style={styles.headerSubtitle}>Informe ejecutivo de recolección · Un proyecto original de Cómplices AC</Text>
            <Text style={styles.headerPeriodo}>
              Periodo: {fmtFecha(datos.periodo.desde)} – {fmtFecha(datos.periodo.hasta)}
            </Text>
          </View>
          {logotipo && <Image src={logotipo} style={styles.headerLogo} />}
        </View>

        <Text style={styles.sectionTitle}>Resumen del periodo</Text>
        <View style={styles.resumenGrid}>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>TOTAL GENERAL RECOLECTADO</Text>
            <Text style={styles.resumenValue}>{fmtKg(ind.totalKg)}</Text>
          </View>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>CENTROS QUE REPORTARON</Text>
            <Text style={styles.resumenValue}>{ind.totalCentrosReportaron}</Text>
          </View>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>TOTAL DE REPORTES</Text>
            <Text style={styles.resumenValue}>{ind.totalReportes}</Text>
          </View>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>PROMEDIO POR CENTRO</Text>
            <Text style={styles.resumenValue}>{fmtKg(ind.promedioPorCentroKg)}</Text>
          </View>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>MATERIAL CON MAYOR VOLUMEN</Text>
            <Text style={styles.resumenValue}>
              {ind.materialMayorVolumen ? `${ind.materialMayorVolumen.nombre} (${fmtKg(ind.materialMayorVolumen.kg)})` : "Sin datos"}
            </Text>
          </View>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>CENTRO CON MAYOR DESEMPEÑO</Text>
            <Text style={styles.resumenValue}>
              {ind.centroMayorDesempeno ? `${ind.centroMayorDesempeno.nombre} (${fmtKg(ind.centroMayorDesempeno.kg)})` : "Sin datos"}
            </Text>
          </View>
          <View style={styles.resumenItem}>
            <Text style={styles.resumenLabel}>MES CON MAYOR RECOLECCIÓN</Text>
            <Text style={styles.resumenValue}>
              {ind.mesMayorRecoleccion
                ? `${MESES_LABEL[ind.mesMayorRecoleccion.mes - 1]} ${ind.mesMayorRecoleccion.anio} (${fmtKg(ind.mesMayorRecoleccion.kg)})`
                : "Sin datos"}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Recolección mensual</Text>
        <View style={styles.chart} wrap={false}>
          {datos.graficoMensual.puntos.map((p) => {
            const alturaPt = p.kg > 0 ? Math.max(3, (p.kg / maxMensual) * 90) : 1.5;
            return (
              <View key={p.clave} style={styles.chartCol}>
                {p.kg > 0 && <Text style={styles.chartVal}>{Math.round(p.kg).toLocaleString("es-MX")}</Text>}
                <View
                  style={[
                    styles.chartBar,
                    { height: alturaPt, backgroundColor: p.kg > 0 ? "#2563eb" : "#dbe1ea" },
                  ]}
                />
              </View>
            );
          })}
        </View>
        <View style={styles.chartLabelsRow} wrap={false}>
          {datos.graficoMensual.puntos.map((p) => (
            <Text key={p.clave} style={styles.chartLabel}>
              {MESES_LABEL[p.mes - 1].slice(0, 3)}
            </Text>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Total por tipo de material</Text>
        {datos.materiales.every((m) => m.kg === 0) ? (
          <Text style={styles.emptyNote}>No hay materiales recolectados en este periodo.</Text>
        ) : (
          datos.materiales.map((m) => (
            <View key={m.key} style={styles.materialRow} wrap={false}>
              <Text style={styles.materialLabel}>{m.nombre}</Text>
              <View style={styles.materialTrack}>
                <View
                  style={[
                    styles.materialBar,
                    { width: `${Math.max(2, (m.kg / maxMaterial) * 100)}%`, backgroundColor: COLOR_MATERIAL[m.key] },
                  ]}
                />
              </View>
              <Text style={styles.materialValue}>
                {fmtKg(m.kg)} · {m.porcentaje.toFixed(1)}%
              </Text>
            </View>
          ))
        )}

        <Text style={styles.sectionTitle}>Los 10 centros que más aportaron</Text>
        {top10.length === 0 ? (
          <Text style={styles.emptyNote}>No hay centros con recolección en este periodo.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader} fixed>
              <Text style={[styles.colRank, styles.tableHeaderText]}>#</Text>
              <Text style={[styles.colNombre, styles.tableHeaderText]}>Centro</Text>
              <Text style={[styles.colMunicipio, styles.tableHeaderText]}>Municipio</Text>
              <Text style={[styles.colKg, styles.tableHeaderText]}>Kilogramos</Text>
            </View>
            {top10.map((c, i) => (
              <View key={c.id} style={styles.tableRow} wrap={false}>
                <Text style={styles.colRank}>{i + 1}</Text>
                <Text style={styles.colNombre}>{c.nombre}</Text>
                <Text style={styles.colMunicipio}>{c.municipio ?? "—"}</Text>
                <Text style={styles.colKg}>{fmtKg(c.totalKg)}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.sectionTitle}>Manifiestos generados — dirigido a</Text>
        {datos.manifiestosDirigidos.length === 0 ? (
          <Text style={styles.emptyNote}>No se generaron manifiestos en este periodo.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.tableHeader} fixed>
              <Text style={[styles.colDirNombre, styles.tableHeaderText]}>Nombre</Text>
              <Text style={[styles.colDirPuesto, styles.tableHeaderText]}>Puesto</Text>
            </View>
            {datos.manifiestosDirigidos.map((m, i) => (
              <View key={i} style={styles.tableRow} wrap={false}>
                <Text style={styles.colDirNombre}>{m.nombre}</Text>
                <Text style={styles.colDirPuesto}>{m.puesto}</Text>
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
