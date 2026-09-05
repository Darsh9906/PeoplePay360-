import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { PayslipData, PayslipLineData } from "./payslip-data";

const earningCategories = new Set(["basic", "allowance", "earning"]);

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 44,
    paddingHorizontal: 40,
    fontSize: 9,
    color: "#18181b",
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomWidth: 2,
    borderBottomColor: "#18181b",
    paddingBottom: 10,
    marginBottom: 14,
  },
  brand: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  brandSub: { fontSize: 8, color: "#71717a", marginTop: 2 },
  docTitle: { fontSize: 11, fontFamily: "Helvetica-Bold", textAlign: "right" },
  docMeta: { fontSize: 8, color: "#71717a", textAlign: "right", marginTop: 2 },
  panel: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#e4e4e7",
    marginBottom: 14,
  },
  panelHalf: { flex: 1, padding: 10 },
  panelDivider: { borderLeftWidth: 1, borderLeftColor: "#e4e4e7" },
  panelLabel: {
    fontSize: 7,
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 5,
    fontFamily: "Helvetica-Bold",
  },
  row: { flexDirection: "row", marginBottom: 3 },
  rowKey: { width: 78, color: "#71717a" },
  rowValue: { flex: 1, fontFamily: "Helvetica-Bold" },
  sectionTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  table: { borderWidth: 1, borderColor: "#e4e4e7", marginBottom: 12 },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#f4f4f5",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f4f4f5",
  },
  subtotalRow: {
    flexDirection: "row",
    paddingVertical: 5,
    paddingHorizontal: 8,
    backgroundColor: "#fafafa",
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
  },
  colName: { flex: 1 },
  colCode: { width: 70, color: "#71717a" },
  colAmount: { width: 85, textAlign: "right" },
  bold: { fontFamily: "Helvetica-Bold" },
  netBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#18181b",
    color: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  netLabel: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  netValue: { fontSize: 14, fontFamily: "Helvetica-Bold", color: "#ffffff" },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7,
    color: "#a1a1aa",
    textAlign: "center",
    borderTopWidth: 1,
    borderTopColor: "#e4e4e7",
    paddingTop: 6,
  },
});

function formatMoney(value: string | number | null, currency = "INR") {
  const amount = Number(value ?? 0);
  const formatted = amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${currency} ${formatted}`;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowKey}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function LineTable({
  title,
  lines,
  currency,
  total,
  totalLabel,
}: {
  title: string;
  lines: PayslipLineData[];
  currency: string;
  total: string;
  totalLabel: string;
}) {
  return (
    <View>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.table}>
        <View style={styles.tableHead}>
          <Text style={[styles.colName, styles.bold]}>Component</Text>
          <Text style={[styles.colCode, styles.bold]}>Code</Text>
          <Text style={[styles.colAmount, styles.bold]}>Amount</Text>
        </View>
        {lines.length === 0 ? (
          <View style={styles.tableRow}>
            <Text style={styles.colName}>No components</Text>
            <Text style={styles.colCode}>—</Text>
            <Text style={styles.colAmount}>{formatMoney(0, currency)}</Text>
          </View>
        ) : (
          lines.map((line) => (
            <View key={line.code + line.sequence} style={styles.tableRow}>
              <Text style={styles.colName}>{line.name}</Text>
              <Text style={styles.colCode}>{line.code}</Text>
              <Text style={styles.colAmount}>
                {formatMoney(line.amount, currency)}
              </Text>
            </View>
          ))
        )}
        <View style={styles.subtotalRow}>
          <Text style={[styles.colName, styles.bold]}>{totalLabel}</Text>
          <Text style={styles.colCode} />
          <Text style={[styles.colAmount, styles.bold]}>
            {formatMoney(total, currency)}
          </Text>
        </View>
      </View>
    </View>
  );
}

export function PayslipDocument({ payslip }: { payslip: PayslipData }) {
  const currency = payslip.currency ?? "INR";
  const earnings = payslip.lines.filter((line) =>
    earningCategories.has(line.category),
  );
  const deductions = payslip.lines.filter(
    (line) => line.category === "deduction",
  );

  return (
    <Document
      title={`Payslip ${payslip.employeeCode} ${payslip.payrunName}`}
      author="PeoplePay360"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>PeoplePay360</Text>
            <Text style={styles.brandSub}>HR &amp; Payroll Operations</Text>
          </View>
          <View>
            <Text style={styles.docTitle}>PAYSLIP</Text>
            <Text style={styles.docMeta}>
              {formatDate(payslip.periodStart)} — {formatDate(payslip.periodEnd)}
            </Text>
            <Text style={styles.docMeta}>{payslip.payrunName}</Text>
          </View>
        </View>

        <View style={styles.panel}>
          <View style={styles.panelHalf}>
            <Text style={styles.panelLabel}>Employee</Text>
            <Field label="Name" value={payslip.employeeName} />
            <Field label="Code" value={payslip.employeeCode} />
            <Field label="Designation" value={payslip.jobTitle} />
            <Field label="Department" value={payslip.department ?? "—"} />
          </View>
          <View style={[styles.panelHalf, styles.panelDivider]}>
            <Text style={styles.panelLabel}>Pay period</Text>
            <Field label="Worked days" value={payslip.workedDays} />
            <Field label="Leave days" value={payslip.leaveDays} />
            <Field
              label="Contract wage"
              value={
                payslip.monthlyWage
                  ? formatMoney(payslip.monthlyWage, currency)
                  : "—"
              }
            />
            <Field label="Status" value={payslip.status.toUpperCase()} />
          </View>
        </View>

        <LineTable
          title="Earnings"
          lines={earnings}
          currency={currency}
          total={payslip.grossPay}
          totalLabel="Gross Salary"
        />

        <LineTable
          title="Deductions"
          lines={deductions}
          currency={currency}
          total={payslip.totalDeductions}
          totalLabel="Total Deductions"
        />

        <View style={styles.netBox}>
          <Text style={styles.netLabel}>NET SALARY PAYABLE</Text>
          <Text style={styles.netValue}>
            {formatMoney(payslip.netPay, currency)}
          </Text>
        </View>

        <Text style={styles.footer} fixed>
          This is a computer-generated payslip and does not require a signature.
          Generated by PeoplePay360.
        </Text>
      </Page>
    </Document>
  );
}

export async function renderPayslipPdf(payslip: PayslipData) {
  return renderToBuffer(<PayslipDocument payslip={payslip} />);
}

export function payslipFileName(payslip: PayslipData) {
  const period = payslip.periodStart.slice(0, 7);
  return `payslip-${payslip.employeeCode}-${period}.pdf`;
}
