import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { formatCurrency } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
  header: { marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#4892CC', paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1e454a' },
  subtitle: { fontSize: 12, color: '#666', marginTop: 5 },
  section: { marginTop: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 10, color: '#3C9384', textTransform: 'uppercase' },
  tableHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#ccc', paddingVertical: 5, backgroundColor: '#f9f9f9' },
  row: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee', paddingVertical: 6 },
  colHeaderDate: { width: '20%', fontSize: 10, fontWeight: 'bold', color: '#4892CC' },
  colHeaderDesc: { width: '40%', fontSize: 10, fontWeight: 'bold', color: '#4892CC' },
  colHeaderAcc: { width: '20%', fontSize: 10, fontWeight: 'bold', color: '#4892CC' },
  colHeaderAmt: { width: '20%', fontSize: 10, fontWeight: 'bold', color: '#4892CC', textAlign: 'right' },
  colDate: { width: '20%', fontSize: 10, color: '#333' },
  colDesc: { width: '40%', fontSize: 10, color: '#333' },
  colAcc: { width: '20%', fontSize: 10, color: '#333' },
  colAmt: { width: '20%', fontSize: 10, color: '#333', textAlign: 'right' },
  totalBox: { marginTop: 30, backgroundColor: '#f8fafc', padding: 15, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#4892CC' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  totalText: { fontSize: 12, fontWeight: 'bold', color: '#475569' },
  balanceText: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginTop: 10, borderTopWidth: 1, borderTopColor: '#cbd5e1', paddingTop: 10 }
});

export const CierreCajaPDF = ({ transactions }: { transactions: any[] }) => {
  const incomes = transactions.filter(t => t.type === 'income');
  const expenses = transactions.filter(t => t.type === 'expense');
  const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = expenses.reduce((acc, curr) => acc + Math.abs(curr.amount), 0);
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>FIMAGADI - Cierre de Tesorería</Text>
          <Text style={styles.subtitle}>Reporte Vectorial Generado el {format(new Date(), "dd 'de' MMMM, yyyy HH:mm", { locale: es })}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Historial de Movimientos</Text>
          
          <View style={styles.tableHeader}>
            <Text style={styles.colHeaderDate}>FECHA</Text>
            <Text style={styles.colHeaderDesc}>CONCEPTO / REF</Text>
            <Text style={styles.colHeaderAcc}>CUENTA</Text>
            <Text style={styles.colHeaderAmt}>MONTO NETO</Text>
          </View>

          {transactions.map(t => (
            <View key={t.id} style={styles.row}>
              <Text style={styles.colDate}>{t.date ? format(new Date(t.date), 'dd/MM/yyyy') : '—'}</Text>
              <Text style={styles.colDesc}>{t.description.substring(0, 45)}{t.description.length > 45 ? '...' : ''}</Text>
              <Text style={styles.colAcc}>{t.account}</Text>
              <Text style={styles.colAmt}>
                {t.amount > 0 ? '+' : ''}{formatCurrency(t.amount)}
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.totalBox}>
          <View style={styles.totalRow}>
            <Text style={styles.totalText}>Ingresos Totales Registrados:</Text>
            <Text style={styles.totalText}>{formatCurrency(totalIncome)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalText}>Egresos Totales Registrados:</Text>
            <Text style={styles.totalText}>{formatCurrency(totalExpense)}</Text>
          </View>
          <View style={[styles.totalRow, styles.balanceText]}>
            <Text style={{ color: (totalIncome - totalExpense) >= 0 ? '#10b981' : '#ef4444' }}>Balance Neto Operativo:</Text>
            <Text style={{ color: (totalIncome - totalExpense) >= 0 ? '#10b981' : '#ef4444' }}>
              {formatCurrency(totalIncome - totalExpense)}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
};
