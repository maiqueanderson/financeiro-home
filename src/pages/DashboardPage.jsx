import React, { useMemo } from 'react';
import {
  Wallet,
  TrendingDown,
  CalendarClock,
  AlertTriangle,
  ArrowUpRight,
  CreditCard,
  CheckCircle2,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { formatCurrency, getMonthKey, formatMonthLabel } from '../utils/finance';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const {
    accounts,
    cards,
    categories,
    transactions,
    invoices,
    hideValues,
    setIsQuickExpenseOpen,
    payPendingBill,
  } = useFinance();

  const currentMonthKey = getMonthKey();

  // 1. Saldo Total Consolidado (soma de todas as contas bancárias)
  const totalBalance = useMemo(() => {
    return accounts.reduce((acc, a) => acc + (Number(a.balance) || 0), 0);
  }, [accounts]);

  // 2. Gastos do Mês Atual (Consolidado já pago ou consumido no mês)
  // Inclui débito à vista no mês + compras no crédito cuja fatura é do mês + contas a pagar que já foram pagas no mês
  const currentMonthExpenses = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      // Débito no mês
      if (tx.paymentType === 'debit' && tx.competenceMonth === currentMonthKey) {
        return acc + Number(tx.amount);
      }
      // Cartão com competência da fatura do mês atual
      if (tx.paymentType === 'credit' && tx.invoiceMonth === currentMonthKey) {
        return acc + Number(tx.amount);
      }
      // Contas a pagar que foram baixadas no mês
      if (tx.paymentType === 'payable' && tx.status === 'paid' && tx.competenceMonth === currentMonthKey) {
        return acc + Number(tx.amount);
      }
      return acc;
    }, 0);
  }, [transactions, currentMonthKey]);

  // 3. Contas a Pagar no Mês Atual:
  // Contas avulsas pendentes com vencimento no mês corrente + faturas de cartão em aberto para este mês
  const pendingBills = useMemo(() => {
    return transactions.filter(
      (tx) => tx.paymentType === 'payable' && tx.status === 'pending' && tx.competenceMonth === currentMonthKey
    );
  }, [transactions, currentMonthKey]);

  const currentMonthInvoices = useMemo(() => {
    return invoices.filter(
      (inv) => inv.monthKey === currentMonthKey && inv.status !== 'paid' && Number(inv.totalAmount) > 0
    );
  }, [invoices, currentMonthKey]);

  const totalPayablesAmount = useMemo(() => {
    const billsTotal = pendingBills.reduce((acc, b) => acc + Number(b.amount), 0);
    const invoicesTotal = currentMonthInvoices.reduce((acc, i) => acc + Number(i.totalAmount), 0);
    return billsTotal + invoicesTotal;
  }, [pendingBills, currentMonthInvoices]);

  // 4. Monitoramento de Metas por Categoria no mês atual
  const categorySpending = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.id] = 0;
    });

    transactions.forEach((tx) => {
      const matchMonth =
        tx.paymentType === 'credit'
          ? tx.invoiceMonth === currentMonthKey
          : tx.competenceMonth === currentMonthKey;

      if (matchMonth && tx.categoryId && map[tx.categoryId] !== undefined) {
        map[tx.categoryId] += Number(tx.amount);
      }
    });

    return categories.map((cat) => {
      const spent = map[cat.id] || 0;
      const budget = Number(cat.monthlyBudget) || 0;
      const percentage = budget > 0 ? (spent / budget) * 100 : 0;
      const isExceeded = spent > budget && budget > 0;
      const excessAmount = isExceeded ? spent - budget : 0;
      const remainingAmount = Math.max(0, budget - spent);

      return {
        ...cat,
        spent,
        budget,
        percentage,
        isExceeded,
        excessAmount,
        remainingAmount,
      };
    });
  }, [categories, transactions, currentMonthKey]);

  // 5. Total de gastos por categoria para gráfico visual proporcional
  const totalCategorySpent = useMemo(() => {
    return categorySpending.reduce((acc, c) => acc + c.spent, 0);
  }, [categorySpending]);

  return (
    <div className="space-y-6">
      {/* Resumo do Período */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Visão Geral
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900">
            {formatMonthLabel(currentMonthKey)}
          </h2>
        </div>
        <button
          onClick={() => setIsQuickExpenseOpen(true)}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-200 transition"
        >
          <Sparkles className="w-4 h-4" />
          <span>Lançar Despesa Rápida</span>
        </button>
      </div>

      {/* Cards de Resumo Principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Saldo Consolidado */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-lg shadow-emerald-700/20 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wider">
              Saldo Consolidado
            </span>
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black tracking-tight">
              {formatCurrency(totalBalance, hideValues)}
            </div>
            <p className="text-xs text-emerald-100 mt-1">
              Soma de {accounts.length} conta(s) bancária(s)
            </p>
          </div>
        </div>

        {/* Card 2: Gastos do Mês Atual */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Gastos do Mês
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatCurrency(currentMonthExpenses, hideValues)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Débitos + Fatura do mês corrente
            </p>
          </div>
        </div>

        {/* Card 3: Contas a Pagar no Mês */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Contas a Pagar no Mês
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CalendarClock className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight">
              {formatCurrency(totalPayablesAmount, hideValues)}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {pendingBills.length} boleto(s) + {currentMonthInvoices.length} fatura(s)
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Metas por Categoria & Contas Pendentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Monitoramento de Metas por Categoria */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Metas de Gastos do Mês</h3>
              <p className="text-xs text-slate-400">
                Acompanhe o limite e o consumo de cada categoria
              </p>
            </div>
            <Link
              to="/reports"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
            >
              <span>Ver Gráficos</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="space-y-4">
            {categorySpending.map((cat) => {
              const progressWidth = Math.min(100, cat.percentage);
              return (
                <div key={cat.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-bold text-slate-800">{cat.name}</span>
                    </div>

                    <div className="text-right">
                      {cat.isExceeded ? (
                        <span className="font-bold text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 inline" />
                          Ultrapassou em {formatCurrency(cat.excessAmount, hideValues)}
                        </span>
                      ) : (
                        <span className="text-slate-500 font-medium">
                          Restam <strong className="text-emerald-600">{formatCurrency(cat.remainingAmount, hideValues)}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Barra de Progresso com Alerta Visual vermelho ao ultrapassar 100% */}
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden relative">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        cat.isExceeded ? 'bg-red-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${progressWidth}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>Gasto: {formatCurrency(cat.spent, hideValues)}</span>
                    <span>Teto: {formatCurrency(cat.budget, hideValues)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Coluna 3: Contas a Pagar e Ações Imediatas */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Contas do Mês</h3>
                <p className="text-xs text-slate-400">Boletos e vencimentos</p>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                {pendingBills.length} pendente(s)
              </span>
            </div>

            {pendingBills.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">Tudo em dia!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Nenhuma conta avulsa pendente neste mês.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                {pendingBills.map((bill) => (
                  <div
                    key={bill.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                  >
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {bill.description}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Vence: {bill.dueDate?.split('-').reverse().join('/')}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="block text-xs font-bold text-rose-600">
                        {formatCurrency(bill.amount, hideValues)}
                      </span>
                      <button
                        onClick={() => {
                          if (accounts.length > 0) {
                            payPendingBill(bill, accounts[0].id);
                          }
                        }}
                        className="mt-1 text-[10px] font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200"
                      >
                        Pagar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Atalho para faturas */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-indigo-950">Faturas de Cartão</p>
                <p className="text-[11px] text-indigo-600">
                  {cards.length} cartão(ões) cadastrado(s)
                </p>
              </div>
            </div>
            <Link
              to="/cards"
              className="p-2 rounded-xl bg-white text-indigo-600 shadow-sm hover:bg-indigo-50"
            >
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Divisão Percentual dos Gastos por Categoria (Barras Horizontais Coloridas) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Divisão Percentual por Categoria</h3>
            <p className="text-xs text-slate-400">
              Distribuição proporcional dos gastos realizados em {formatMonthLabel(currentMonthKey)}
            </p>
          </div>
          <span className="text-xs font-bold text-slate-600">
            Total: {formatCurrency(totalCategorySpent, hideValues)}
          </span>
        </div>

        {totalCategorySpent === 0 ? (
          <p className="text-xs text-slate-400 italic py-2">
            Nenhum lançamento registrado neste mês ainda. Lance um gasto para ver o gráfico.
          </p>
        ) : (
          <>
            {/* Barra multi-segmento proporcional */}
            <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-100">
              {categorySpending
                .filter((c) => c.spent > 0)
                .map((cat) => {
                  const share = (cat.spent / totalCategorySpent) * 100;
                  return (
                    <div
                      key={cat.id}
                      title={`${cat.name}: ${share.toFixed(1)}%`}
                      style={{
                        width: `${share}%`,
                        backgroundColor: cat.color,
                      }}
                      className="h-full hover:opacity-90 transition-all"
                    />
                  );
                })}
            </div>

            {/* Legenda de proporções */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
              {categorySpending
                .filter((c) => c.spent > 0)
                .map((cat) => {
                  const share = (cat.spent / totalCategorySpent) * 100;
                  return (
                    <div key={cat.id} className="flex flex-col">
                      <div className="flex items-center gap-1.5 text-xs text-slate-600">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="truncate font-semibold">{cat.name}</span>
                      </div>
                      <span className="text-xs font-bold text-slate-900 mt-0.5">
                        {share.toFixed(1)}%
                      </span>
                    </div>
                  );
                })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

