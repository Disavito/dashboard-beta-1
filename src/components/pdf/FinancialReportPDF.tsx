import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: 'column',
    backgroundColor: '#FFFFFF',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: '#4892CC',
    paddingBottom: 10,
  },
  logo: {
    width: 60,
    height: 60,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  titleContainer: {
    flex: 1,
    marginLeft: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  dateText: {
    fontSize: 10,
    color: '#94a3b8',
    textAlign: 'right',
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4892CC',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  kpiContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  kpiBox: {
    width: '30%',
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  kpiLabel: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 5,
  },
  kpiValuePositive: {
    color: '#10b981',
  },
  kpiValueNegative: {
    color: '#ef4444',
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    backgroundColor: '#f1f5f9',
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCellHeader: {
    margin: 5,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#334155',
  },
  tableCell: {
    margin: 5,
    fontSize: 9,
    color: '#475569',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  }
});

interface FinancialReportPDFProps {
  label: string;
  stats: {
    totalIngresos: number;
    totalGastos: number;
    balance: number;
    topIngresos: any[];
    topGastos: any[];
  };
}

export const FinancialReportPDF: React.FC<FinancialReportPDFProps> = ({ label, stats }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.title}>Reporte Financiero</Text>
          <Text style={styles.subtitle}>Periodo: {label.toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.dateText}>Generado el:</Text>
          <Text style={styles.dateText}>{format(new Date(), 'dd/MM/yyyy HH:mm')}</Text>
        </View>
      </View>

      {/* KPIs */}
      <View style={styles.kpiContainer}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Total Ingresos</Text>
          <Text style={[styles.kpiValue, styles.kpiValuePositive]}>
            S/. {stats.totalIngresos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Total Gastos</Text>
          <Text style={[styles.kpiValue, styles.kpiValueNegative]}>
            S/. {stats.totalGastos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Balance Neto</Text>
          <Text style={[styles.kpiValue, stats.balance >= 0 ? styles.kpiValuePositive : styles.kpiValueNegative]}>
            S/. {stats.balance.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
          </Text>
        </View>
      </View>

      {/* TOP INGRESOS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mayores Ingresos</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={[styles.tableColHeader, { width: '20%' }]}><Text style={styles.tableCellHeader}>Fecha</Text></View>
            <View style={[styles.tableColHeader, { width: '40%' }]}><Text style={styles.tableCellHeader}>Socio / Concepto</Text></View>
            <View style={[styles.tableColHeader, { width: '20%' }]}><Text style={styles.tableCellHeader}>Recibo</Text></View>
            <View style={[styles.tableColHeader, { width: '20%' }]}><Text style={styles.tableCellHeader}>Monto</Text></View>
          </View>
          {stats.topIngresos.slice(0, 5).map((i, idx) => (
            <View style={styles.tableRow} key={idx}>
              <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>{i.date?.split('T')[0]}</Text></View>
              <View style={[styles.tableCol, { width: '40%' }]}><Text style={styles.tableCell}>{i.full_name || 'N/A'}</Text></View>
              <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>{i.receipt_number}</Text></View>
              <View style={[styles.tableCol, { width: '20%' }]}><Text style={[styles.tableCell, { color: '#10b981', fontWeight: 'bold' }]}>S/. {i.amount.toLocaleString('es-PE')}</Text></View>
            </View>
          ))}
          {stats.topIngresos.length === 0 && (
            <View style={styles.tableRow}>
              <View style={[styles.tableCol, { width: '100%' }]}><Text style={[styles.tableCell, { textAlign: 'center' }]}>No hay ingresos registrados en este periodo.</Text></View>
            </View>
          )}
        </View>
      </View>

      {/* TOP GASTOS */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Mayores Gastos</Text>
        <View style={styles.table}>
          <View style={styles.tableRow}>
            <View style={[styles.tableColHeader, { width: '20%' }]}><Text style={styles.tableCellHeader}>Fecha</Text></View>
            <View style={[styles.tableColHeader, { width: '40%' }]}><Text style={styles.tableCellHeader}>Descripción</Text></View>
            <View style={[styles.tableColHeader, { width: '20%' }]}><Text style={styles.tableCellHeader}>Categoría</Text></View>
            <View style={[styles.tableColHeader, { width: '20%' }]}><Text style={styles.tableCellHeader}>Monto</Text></View>
          </View>
          {stats.topGastos.slice(0, 5).map((g, idx) => (
            <View style={styles.tableRow} key={idx}>
              <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>{g.date?.split('T')[0]}</Text></View>
              <View style={[styles.tableCol, { width: '40%' }]}><Text style={styles.tableCell}>{g.description}</Text></View>
              <View style={[styles.tableCol, { width: '20%' }]}><Text style={styles.tableCell}>{g.category}</Text></View>
              <View style={[styles.tableCol, { width: '20%' }]}><Text style={[styles.tableCell, { color: '#ef4444', fontWeight: 'bold' }]}>S/. {Math.abs(g.amount).toLocaleString('es-PE')}</Text></View>
            </View>
          ))}
          {stats.topGastos.length === 0 && (
            <View style={styles.tableRow}>
              <View style={[styles.tableCol, { width: '100%' }]}><Text style={[styles.tableCell, { textAlign: 'center' }]}>No hay gastos registrados en este periodo.</Text></View>
            </View>
          )}
        </View>
      </View>

      <Text style={styles.footer}>
        Documento generado automáticamente por el Sistema FIMAGADI. Para uso interno y auditoría.
      </Text>
    </Page>
  </Document>
);
