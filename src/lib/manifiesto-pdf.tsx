import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";
import { esFirmaPngValida, esLogotipoValido, type FilaAcopioManifiesto } from "./manifiestos";

// 1mm = 2.8346456693pt. El contenedor del logotipo respeta el máximo de
// 90x30mm (proporción 3:1) solicitado para el PDF.
const LOGOTIPO_ANCHO_PT = 255;
const LOGOTIPO_ALTO_PT = 85;

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
    alignItems: "flex-start",
  },
  headerTitleBlock: { flexShrink: 1 },
  headerTitle: { fontSize: 16, fontFamily: "Helvetica-Bold", color: "#2563eb" },
  headerSubtitle: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  headerLogo: { width: LOGOTIPO_ANCHO_PT, height: LOGOTIPO_ALTO_PT, objectFit: "contain", objectPosition: "center" },
  dirigidoABlock: { marginBottom: 12 },
  dirigidoA: { fontSize: 12, fontFamily: "Helvetica-Bold" },
  fechaEmision: { fontSize: 9, color: "#6b7280", marginBottom: 16 },
  section: { marginBottom: 14 },
  sectionTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 4, color: "#6b7280" },
  value: { fontSize: 11, fontFamily: "Helvetica-Bold" },
  label: { fontSize: 9, color: "#6b7280", marginTop: 2 },
  texto: { fontSize: 10, lineHeight: 1.5, marginBottom: 16 },
  table: { marginBottom: 8 },
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
  colFecha: { width: "25%" },
  colMaterial: { width: "45%" },
  colKg: { width: "30%", textAlign: "right" },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#eaf1fe",
    paddingVertical: 6,
    paddingHorizontal: 6,
    marginTop: 2,
  },
  totalLabel: { width: "70%", fontFamily: "Helvetica-Bold", fontSize: 10 },
  totalValor: { width: "30%", textAlign: "right", fontFamily: "Helvetica-Bold", fontSize: 10 },
  textoCierre: { fontSize: 10, lineHeight: 1.5, marginTop: 16 },
  firmaBlock: { marginTop: 36, alignItems: "center" },
  firmaNombre: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  firmaNombreConFirma: { fontFamily: "Helvetica-Bold", fontSize: 10, marginTop: 10 },
  firmaImg: { width: 140, height: 60, objectFit: "contain" },
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

// Las fechas se guardan como medianoche UTC; se formatean en UTC explícitamente
// para que no se recorran un día según la zona horaria del servidor.
function fmtFecha(d: Date | string) {
  const date = new Date(d);
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function fmtKg(n: number) {
  return `${n.toLocaleString("es-MX", { maximumFractionDigits: 2 })} kg`;
}

export type ManifiestoDocumentProps = {
  logotipoDataUrl: string | null;
  dirigidoA: string;
  dirigidoAPuesto: string;
  fechaManifiesto: Date | string;
  fechaInicioPeriodo: Date | string;
  fechaFinPeriodo: Date | string;
  benefactorNombre: string;
  puntoNombre: string;
  direccionCompleta: string;
  texto: string;
  textoCierre: string;
  filas: FilaAcopioManifiesto[];
  total: number;
  nombreFirmante: string;
  puesto: string;
  firmaDataUrl: string | null;
};

export function ManifiestoDocument({
  logotipoDataUrl,
  dirigidoA,
  dirigidoAPuesto,
  fechaManifiesto,
  fechaInicioPeriodo,
  fechaFinPeriodo,
  benefactorNombre,
  puntoNombre,
  direccionCompleta,
  texto,
  textoCierre,
  filas,
  total,
  nombreFirmante,
  puesto,
  firmaDataUrl,
}: ManifiestoDocumentProps) {
  const parrafos = texto.split(/\n{2,}/).filter(Boolean);
  const firma = esFirmaPngValida(firmaDataUrl) ? firmaDataUrl : null;
  const logotipo = esLogotipoValido(logotipoDataUrl) ? logotipoDataUrl : null;

  return (
    <Document>
      <Page size="LETTER" style={styles.page} wrap>
        <View style={styles.header} fixed>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Recicla Contra el Cáncer</Text>
            <Text style={styles.headerSubtitle}>Un proyecto original de Cómplices AC</Text>
          </View>
          {logotipo && <Image src={logotipo} style={styles.headerLogo} />}
        </View>

        {/* 2. Profesión y nombre de la persona a quien va dirigido, y su puesto */}
        <View style={styles.dirigidoABlock}>
          {dirigidoA && <Text style={styles.dirigidoA}>{dirigidoA}</Text>}
          {dirigidoAPuesto && <Text style={styles.label}>{dirigidoAPuesto}</Text>}
        </View>

        {/* 3. Nombre del benefactor o empresa */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Benefactor</Text>
          <Text style={styles.value}>{benefactorNombre}</Text>
          {puntoNombre !== benefactorNombre && <Text style={styles.label}>{puntoNombre}</Text>}
          {direccionCompleta && <Text style={styles.label}>{direccionCompleta}</Text>}
          <Text style={styles.label}>
            Periodo: {fmtFecha(fechaInicioPeriodo)} – {fmtFecha(fechaFinPeriodo)}
          </Text>
        </View>

        {/* 4. Fecha de emisión */}
        <Text style={styles.fechaEmision}>Fecha de emisión: {fmtFecha(fechaManifiesto)}</Text>

        {/* 5. Texto inicial */}
        {parrafos.map((p, i) => (
          <Text key={i} style={styles.texto}>
            {p}
          </Text>
        ))}

        {/* 6-7. Tabla de acopios y total acumulado */}
        <View style={styles.table}>
          <View style={styles.tableHeader} fixed>
            <Text style={[styles.colFecha, styles.tableHeaderText]}>Fecha</Text>
            <Text style={[styles.colMaterial, styles.tableHeaderText]}>Material</Text>
            <Text style={[styles.colKg, styles.tableHeaderText]}>Kilogramos</Text>
          </View>
          {filas.map((f, i) => (
            <View key={i} style={styles.tableRow} wrap={false}>
              <Text style={styles.colFecha}>{fmtFecha(f.fecha)}</Text>
              <Text style={styles.colMaterial}>{f.material}</Text>
              <Text style={styles.colKg}>{fmtKg(f.kg)}</Text>
            </View>
          ))}
          <View style={styles.totalRow} wrap={false}>
            <Text style={styles.totalLabel}>TOTAL ACUMULADO</Text>
            <Text style={styles.totalValor}>{fmtKg(total)}</Text>
          </View>
        </View>

        {/* 8. Texto de cierre */}
        {textoCierre ? <Text style={styles.textoCierre}>{textoCierre}</Text> : null}

        {/* 9-11. Firma (si existe), nombre y puesto de quien emite el manifiesto */}
        <View style={styles.firmaBlock} wrap={false}>
          {firma && <Image src={firma} style={styles.firmaImg} />}
          <Text style={firma ? styles.firmaNombreConFirma : styles.firmaNombre}>{nombreFirmante}</Text>
          <Text style={styles.label}>{puesto}</Text>
        </View>

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
