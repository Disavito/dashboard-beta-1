import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Cuenta } from '@/lib/types';
import { Loader2, TrendingUp, TrendingDown, Wallet, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { formatCurrency, cn } from '@/lib/utils';
import { safeFormatDateLong } from '@/lib/dateUtils';

interface AccountWithBalance extends Cuenta {
  balance: number;
}

interface DailyTransaction {
  date: string;
  amount: number;
}

const AccountDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const { data, isLoading: loading, error } = useQuery({
    queryKey: ['supabaseData', 'account-details', id],
    queryFn: async () => {
      if (!id) throw new Error('ID de cuenta no proporcionado.');

      const { data: accountData, error: accountError } = await supabase
        .from('cuentas')
        .select('id, name, tipo, created_at')
        .eq('id', id)
        .single();

      if (accountError) throw accountError;
      if (!accountData) throw new Error('Cuenta no encontrada.');

      const [ingresosRes, gastosRes] = await Promise.all([
        supabase
          .from('ingresos')
          .select('id, date, amount, transaction_type')
          .is('deleted_at', null)
          .eq('account', accountData.name),
        supabase
          .from('gastos')
          .select('id, date, amount')
          .is('deleted_at', null)
          .eq('account', accountData.name),
      ]);

      if (ingresosRes.error) throw ingresosRes.error;
      if (gastosRes.error) throw gastosRes.error;

      const fetchedIngresos = ingresosRes.data || [];
      const fetchedGastos = gastosRes.data || [];

      // Calcular ingresos diarios
      const dailyIncomeMap = new Map<string, number>();
      fetchedIngresos.forEach(ingreso => {
        const dateKey = ingreso.date?.split('T')[0];
        if (!dateKey) return;
        const amountToAdd = (ingreso.transaction_type === 'Anulación') ? -ingreso.amount : ingreso.amount;
        dailyIncomeMap.set(dateKey, (dailyIncomeMap.get(dateKey) || 0) + amountToAdd);
      });

      const sortedDailyIncomes: DailyTransaction[] = Array.from(dailyIncomeMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => b.date.localeCompare(a.date));

      // Calcular gastos diarios
      const dailyExpenseMap = new Map<string, number>();
      fetchedGastos.forEach(gasto => {
        const dateKey = gasto.date?.split('T')[0];
        if (!dateKey) return;
        dailyExpenseMap.set(dateKey, (dailyExpenseMap.get(dateKey) || 0) + Math.abs(gasto.amount));
      });

      const sortedDailyExpenses: DailyTransaction[] = Array.from(dailyExpenseMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => b.date.localeCompare(a.date));

      // Calcular balance total
      const totalIncome = fetchedIngresos.reduce((acc, i) => {
        return acc + (i.transaction_type === 'Anulación' ? -i.amount : i.amount);
      }, 0);
      const totalExpenses = fetchedGastos.reduce((acc, g) => acc + Math.abs(g.amount), 0);

      const account: AccountWithBalance = { ...accountData as Cuenta, balance: totalIncome - totalExpenses };

      return {
        account,
        dailyIncomes: sortedDailyIncomes,
        dailyExpenses: sortedDailyExpenses,
      };
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
    meta: {
      onError: (err: Error) => {
        toast.error('Error al cargar detalles', { description: err.message });
      }
    }
  });

  const account = data?.account ?? null;
  const dailyIncomes = data?.dailyIncomes ?? [];
  const dailyExpenses = data?.dailyExpenses ?? [];

  if (loading) {
    return (
      <div className="min-h-screen bg-background page-enter flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#4892CC]" />
        <p className="text-muted-foreground mt-4 font-medium">Cargando detalles de la cuenta...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background page-enter flex items-center justify-center">
        <div className="text-center p-8 bg-red-50 dark:bg-red-500/10 dark:text-red-400 rounded-2xl border border-red-100 max-w-md">
          <p className="text-red-600 font-bold text-lg">Error al cargar los detalles de la cuenta.</p>
          <p className="text-red-400 mt-2 text-sm">Por favor, inténtalo de nuevo o contacta soporte.</p>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="min-h-screen bg-background page-enter flex items-center justify-center">
        <p className="text-muted-foreground font-bold">No se encontró la cuenta.</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 bg-[#FFFFFF] min-h-screen space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#4892CC] rounded-2xl shadow-lg shadow-[#4892CC]/20">
            <Wallet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground uppercase">
              {account.name}
            </h1>
            <p className="text-muted-foreground font-medium text-sm">
              Detalle de movimientos y balance de la cuenta
            </p>
          </div>
        </div>
      </header>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card dark:bg-slate-900 border border-border/50 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground/70 font-bold uppercase tracking-widest text-[10px]">Saldo Actual</CardDescription>
            <CardTitle className={cn("text-3xl font-black", account.balance >= 0 ? "text-emerald-600" : "text-red-600")}>
              {formatCurrency(account.balance)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge className="bg-muted text-muted-foreground border-none font-bold text-[10px] uppercase">{account.tipo}</Badge>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-slate-900 border border-border/50 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground/70 font-bold uppercase tracking-widest text-[10px]">Total Ingresos</CardDescription>
            <CardTitle className="text-3xl font-black text-[#4892CC]">
              {formatCurrency(dailyIncomes.reduce((a, d) => a + d.amount, 0))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-muted-foreground/70 text-xs font-medium">
              <TrendingUp className="w-3.5 h-3.5 text-[#4892CC]" />
              <span>{dailyIncomes.length} días con ingresos</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card dark:bg-slate-900 border border-border/50 shadow-sm rounded-2xl">
          <CardHeader className="pb-2">
            <CardDescription className="text-muted-foreground/70 font-bold uppercase tracking-widest text-[10px]">Total Gastos</CardDescription>
            <CardTitle className="text-3xl font-black text-red-500">
              {formatCurrency(dailyExpenses.reduce((a, d) => a + d.amount, 0))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-1 text-muted-foreground/70 text-xs font-medium">
              <TrendingDown className="w-3.5 h-3.5 text-red-400" />
              <span>{dailyExpenses.length} días con gastos</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ingresos Diarios */}
      <Card className="bg-card dark:bg-slate-900 border border-border/50 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-50 p-6">
          <CardTitle className="text-xl font-black text-foreground uppercase tracking-tight">Ingresos Diarios</CardTitle>
          <CardDescription className="text-muted-foreground/70 font-medium">Total de ingresos por día para {account.name}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {dailyIncomes.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground/70 font-bold">No hay ingresos registrados para esta cuenta.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {dailyIncomes.map((daily, index) => (
                <div key={`income-${daily.date}-${index}`} className="px-6 py-4 flex justify-between items-center hover:bg-muted/50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-300" />
                    <span className="font-semibold text-muted-foreground text-sm">{safeFormatDateLong(daily.date)}</span>
                  </div>
                  <span className="text-lg font-black text-emerald-600">{formatCurrency(daily.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gastos Diarios */}
      <Card className="bg-card dark:bg-slate-900 border border-border/50 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-50 p-6">
          <CardTitle className="text-xl font-black text-foreground uppercase tracking-tight">Gastos Diarios</CardTitle>
          <CardDescription className="text-muted-foreground/70 font-medium">Total de gastos por día para {account.name}</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {dailyExpenses.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-muted-foreground/70 font-bold">No hay gastos registrados para esta cuenta.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {dailyExpenses.map((daily, index) => (
                <div key={`expense-${daily.date}-${index}`} className="px-6 py-4 flex justify-between items-center hover:bg-muted/50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-slate-300" />
                    <span className="font-semibold text-muted-foreground text-sm">{safeFormatDateLong(daily.date)}</span>
                  </div>
                  <span className="text-lg font-black text-red-500">{formatCurrency(daily.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountDetails;
