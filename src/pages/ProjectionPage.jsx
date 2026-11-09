import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  CreditCard,
  Target,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Edit2,
  Check,
  X,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  DollarSign,
  PieChart,
} from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { useToast } from '../contexts/ToastContext';
import {
  formatCurrency,
  getMonthKey,
  addMonthsToKey,
  formatMonthLabel,
} from '../utils/finance';
import CurrencyInput from '../components/CurrencyInput';

export default function ProjectionPage() {
  const {
    categories,
    transactions,
    cards,
    projectedIncome,
    updateProjectedIncome,
    hideValues,
  } = useFinance();
  const { showToast } = useToast();

  const [activeMonthKey, setActiveMonthKey] = useState(getMonthKey());
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [tempIncome, setTempIncome] = useState(projectedIncome);

  // Navegação entre meses
  const handlePrevMonth = () => setActiveMonthKey((p) => addMonthsToKey(p, -1));
  const handleNextMonth = () => setActiveMonthKey((p) => addMonthsToKey(p, 1));
  const handleResetToCurrent = () => setActiveMonthKey(getMonthKey());

  // 1. Soma das Metas das Categorias
  const totalCategoriesBudget = useMemo(() => {
    return categories.reduce((acc, cat) => acc + (Number(cat.monthlyBudget) || 0), 0);
  }, [categories]);

  // 2. Soma de Todas as Faturas de Cartão de Crédito no Mês Selecionado
  const monthCardTxs = useMemo(() => {
    return transactions.filter(
      (tx) => tx.paymentType === 'credit' && tx.invoiceMonth === activeMonthKey
    );
  }, [transactions, activeMonthKey]);

  const totalInvoicesAmount = useMemo(() => {
    return monthCardTxs.reduce((acc, tx) => acc + Number(tx.amount), 0);
  }, [monthCardTxs]);

  // Detalhamento das faturas por cartão no mês selecionado
  const cardBreakdown = useMemo(() => {
    return cards.map((c) => {
      const cardTotal = monthCardTxs
        .filter((tx) => tx.cardId === c.id)
        .reduce((acc, tx) => acc + Number(tx.amount), 0);
      return {
        card: c,
        total: cardTotal,
      };
    });
  }, [cards, monthCardTxs]);

  // 3. Soma desses dois juntos (Total Projetado de Gastos)
  const totalProjectedExpenses = totalCategoriesBudget + totalInvoicesAmount;

  // 4. Saldo Projetado (Receita esperada no mês)
  const currentProjectedIncome = Number(projectedIncome) || 0;

  // 5. Diferença (Saldo que irá sobrar) = Saldo Projetado - Gastos Projetados
  const remainingDifference = currentProjectedIncome - totalProjectedExpenses;
  const isPositive = remainingDifference >= 0;

  // Ação de Salvar Saldo Projetado
  const handleSaveIncome = async (e) => {
    e.preventDefault();
    try {
      await updateProjectedIncome(tempIncome);
      showToast('Saldo projetado mensal atualizado com sucesso!');
      setIsEditingIncome(false);
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar saldo projetado.', 'error');
    }
  };

  const handleStartEditIncome = () => {
    setTempIncome(currentProjectedIncome);
    setIsEditingIncome(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header com Navegação Mensal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Planejamento & Previsibilidade
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Projeção Mensal
          </h2>
        </div>

        {/* Barra de Navegação Temporal */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-sm self-start sm:self-auto">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5 px-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-extrabold text-slate-800 min-w-[120px] text-center">
              {formatMonthLabel(activeMonthKey)}
            </span>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600 transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Card Principal: Diferença / Resultado Projetado (Verde se Positivo, Vermelho se Negativo) */}
      <div
        className={`p-6 sm:p-8 rounded-3xl text-white shadow-xl transition-all duration-300 ${
          isPositive
            ? 'bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 shadow-emerald-900/20'
            : 'bg-gradient-to-br from-rose-600 via-red-700 to-slate-900 shadow-rose-900/20'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-white/80">
                Resultado Projetado ({formatMonthLabel(activeMonthKey)})
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase flex items-center gap-1 ${
                  isPositive
                    ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
                    : 'bg-rose-400/20 text-rose-200 border border-rose-400/30'
                }`}
              >
                {isPositive ? (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Sobra Prevista
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Déficit / Atenção
                  </>
                )}
              </span>
            </div>

            <div className="text-3xl sm:text-5xl font-black tracking-tight text-white">
              {formatCurrency(remainingDifference, hideValues)}
            </div>

            <p className="text-xs text-white/80 mt-2 max-w-lg leading-relaxed">
              {isPositive ? (
                <span>
                  Com base no seu <strong>Saldo Projetado</strong> ({formatCurrency(currentProjectedIncome, hideValues)}) menos todos os seus gastos projetados ({formatCurrency(totalProjectedExpenses, hideValues)}), sobrará esse montante para reserva ou investimentos.
                </span>
              ) : (
                <span>
                  Atenção: seus gastos projetados somam <strong>{formatCurrency(totalProjectedExpenses, hideValues)}</strong> e superam a receita esperada de <strong>{formatCurrency(currentProjectedIncome, hideValues)}</strong>.
                </span>
              )}
            </p>
          </div>

          {/* Mini resumo lateral */}
          <div className="bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/10 shrink-0 space-y-2 min-w-[200px]">
            <div className="text-xs text-white/70 flex justify-between">
              <span>Saldo Projetado:</span>
              <span className="font-bold text-white">{formatCurrency(currentProjectedIncome, hideValues)}</span>
            </div>
            <div className="text-xs text-white/70 flex justify-between">
              <span>Total de Gastos:</span>
              <span className="font-bold text-white">-{formatCurrency(totalProjectedExpenses, hideValues)}</span>
            </div>
            <div className="border-t border-white/20 pt-2 text-xs font-bold flex justify-between">
              <span>Diferença:</span>
              <span className={isPositive ? 'text-emerald-300 font-black' : 'text-rose-300 font-black'}>
                {formatCurrency(remainingDifference, hideValues)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Os Três Pilares da Projeção */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pilar 1: Saldo Projetado (Editável) */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Saldo Projetado (Mensal)
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            {isEditingIncome ? (
              <form onSubmit={handleSaveIncome} className="space-y-2 mt-2">
                <CurrencyInput
                  value={tempIncome}
                  onChange={setTempIncome}
                  autoFocus
                />
                <div className="flex items-center gap-1.5">
                  <button
                    type="submit"
                    className="flex-1 py-1.5 px-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salvar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingIncome(false)}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-1">
                <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {formatCurrency(currentProjectedIncome, hideValues)}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[11px] text-slate-400">
                    Sua receita estimada mensal
                  </p>
                  <button
                    onClick={handleStartEditIncome}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-lg transition"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Alterar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Pilar 2: Metas de Categorias */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Metas das Categorias
              </span>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-indigo-600 tracking-tight mt-1">
              {formatCurrency(totalCategoriesBudget, hideValues)}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Soma dos tetos de {categories.length} categoria(s)
            </p>
          </div>
        </div>

        {/* Pilar 3: Faturas de Cartão de Crédito */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Faturas de Cartão ({formatMonthLabel(activeMonthKey)})
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <CreditCard className="w-4 h-4" />
              </div>
            </div>

            <div className="text-2xl sm:text-3xl font-black text-amber-600 tracking-tight mt-1">
              {formatCurrency(totalInvoicesAmount, hideValues)}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              {monthCardTxs.length} lançamento(s) previstos na fatura
            </p>
          </div>
        </div>
      </div>

      {/* Card da Soma Total dos Gastos Projetados */}
      <div className="p-5 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-300 shrink-0">
            <PieChart className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">
              Soma Total de Gastos Projetados em {formatMonthLabel(activeMonthKey)}
            </h4>
            <p className="text-xs text-slate-400">
              Metas das Categorias ({formatCurrency(totalCategoriesBudget, hideValues)}) + Faturas de Cartão ({formatCurrency(totalInvoicesAmount, hideValues)})
            </p>
          </div>
        </div>

        <div className="text-2xl sm:text-3xl font-black text-indigo-300 self-end sm:self-auto">
          {formatCurrency(totalProjectedExpenses, hideValues)}
        </div>
      </div>

      {/* Detalhamento dos Componentes do Mês */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Detalhe 1: Metas por Categoria */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">Metas das Categorias</h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Total: {formatCurrency(totalCategoriesBudget, hideValues)}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-xs font-bold text-slate-800">{cat.name}</span>
                </div>
                <span className="text-xs font-extrabold text-slate-900">
                  {formatCurrency(cat.monthlyBudget, hideValues)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Detalhe 2: Faturas por Cartão de Crédito no Mês */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <h3 className="font-bold text-slate-900 text-base">
                Faturas em {formatMonthLabel(activeMonthKey)}
              </h3>
            </div>
            <span className="text-xs font-bold text-slate-500">
              Total: {formatCurrency(totalInvoicesAmount, hideValues)}
            </span>
          </div>

          <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
            {cardBreakdown.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4 text-center">
                Nenhum cartão cadastrado.
              </p>
            ) : (
              cardBreakdown.map(({ card, total }) => (
                <div
                  key={card.id}
                  className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">{card.name}</span>
                    <span className="text-[10px] text-slate-400">
                      Fecha dia {card.closingDay} • Vence dia {card.dueDay}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-slate-900">
                    {formatCurrency(total, hideValues)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

