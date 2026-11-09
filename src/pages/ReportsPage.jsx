import React, { useState, useMemo } from 'react';
import {
  PieChart as PieIcon,
  ChevronLeft,
  ChevronRight,
  Target,
  Edit2,
  Check,
  TrendingDown,
  Calendar,
  AlertTriangle,
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

export default function ReportsPage() {
  const { categories, transactions, hideValues, updateCategoryBudget } = useFinance();
  const { showToast } = useToast();

  const [activeMonthKey, setActiveMonthKey] = useState(getMonthKey());
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [tempBudget, setTempBudget] = useState(0);

  // Navegação de mês
  const handlePrevMonth = () => setActiveMonthKey((p) => addMonthsToKey(p, -1));
  const handleNextMonth = () => setActiveMonthKey((p) => addMonthsToKey(p, 1));

  // Gasto por categoria no mês ativo
  const categoryStats = useMemo(() => {
    const map = {};
    categories.forEach((c) => {
      map[c.id] = 0;
    });

    transactions.forEach((tx) => {
      const matchMonth =
        tx.paymentType === 'credit'
          ? tx.invoiceMonth === activeMonthKey
          : tx.competenceMonth === activeMonthKey;

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
  }, [categories, transactions, activeMonthKey]);

  const totalSpentInMonth = useMemo(() => {
    return categoryStats.reduce((acc, c) => acc + c.spent, 0);
  }, [categoryStats]);

  const totalBudgetInMonth = useMemo(() => {
    return categoryStats.reduce((acc, c) => acc + c.budget, 0);
  }, [categoryStats]);

  const handleStartEdit = (cat) => {
    setEditingCategoryId(cat.id);
    setTempBudget(cat.budget);
  };

  const handleSaveBudget = async (catId) => {
    try {
      await updateCategoryBudget(catId, tempBudget);
      showToast('Meta mensal atualizada com sucesso!');
      setEditingCategoryId(null);
    } catch (err) {
      showToast('Erro ao atualizar meta.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Relatórios & Planejamento
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Metas & Análise de Gastos
          </h2>
        </div>

        {/* Seletor de Mês */}
        <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-sm self-start sm:self-auto">
          <button
            onClick={handlePrevMonth}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-800 min-w-[120px] text-center">
            {formatMonthLabel(activeMonthKey)}
          </span>
          <button
            onClick={handleNextMonth}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-600"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Resumo Consolidado do Mês */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Gasto no Período
          </span>
          <div className="text-3xl font-black text-slate-900 mt-2">
            {formatCurrency(totalSpentInMonth, hideValues)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Consumo apurado em {formatMonthLabel(activeMonthKey)}
          </p>
        </div>

        <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Teto Total Orçado
          </span>
          <div className="text-3xl font-black text-indigo-600 mt-2">
            {formatCurrency(totalBudgetInMonth, hideValues)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Soma de todas as metas definidas
          </p>
        </div>
      </div>

      {/* Gráfico Visual Percentual de Gastos */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Composição dos Gastos</h3>
            <p className="text-xs text-slate-400">
              Distribuição percentual por categoria no mês de {formatMonthLabel(activeMonthKey)}
            </p>
          </div>
        </div>

        {totalSpentInMonth === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 italic">
            Sem despesas registradas para este mês.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Barra Horizontal Visual de Distribuição */}
            <div className="w-full h-5 rounded-full overflow-hidden flex bg-slate-100">
              {categoryStats
                .filter((c) => c.spent > 0)
                .map((cat) => {
                  const pct = (cat.spent / totalSpentInMonth) * 100;
                  return (
                    <div
                      key={cat.id}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: cat.color,
                      }}
                      className="h-full transition-all"
                      title={`${cat.name}: ${pct.toFixed(1)}%`}
                    />
                  );
                })}
            </div>

            {/* Grid com percentuais detalhados */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {categoryStats
                .filter((c) => c.spent > 0)
                .map((cat) => {
                  const pct = (cat.spent / totalSpentInMonth) * 100;
                  return (
                    <div
                      key={cat.id}
                      className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="text-xs font-bold text-slate-800">{cat.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-slate-900 block">
                          {pct.toFixed(1)}%
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatCurrency(cat.spent, hideValues)}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      {/* Gestão e Ajuste de Metas por Categoria */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div>
          <h3 className="font-bold text-slate-900 text-base">Metas Mensais por Categoria</h3>
          <p className="text-xs text-slate-400">
            Ajuste o valor do teto mensal clicando no ícone de edição ao lado de cada categoria
          </p>
        </div>

        <div className="space-y-3">
          {categoryStats.map((cat) => {
            const isEditing = editingCategoryId === cat.id;
            const progress = Math.min(100, cat.percentage);

            return (
              <div
                key={cat.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-bold text-sm text-slate-900">{cat.name}</span>
                  </div>

                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-32">
                        <CurrencyInput value={tempBudget} onChange={setTempBudget} />
                      </div>
                      <button
                        onClick={() => handleSaveBudget(cat.id)}
                        className="p-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-500"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">
                        Meta: <strong className="text-slate-900">{formatCurrency(cat.budget, hideValues)}</strong>
                      </span>
                      <button
                        onClick={() => handleStartEdit(cat)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-white transition"
                        title="Editar teto mensal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Barra de Progresso com Alerta de estouro de 100% */}
                <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      cat.isExceeded ? 'bg-red-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    Gasto: <strong className="text-slate-800">{formatCurrency(cat.spent, hideValues)}</strong> ({cat.percentage.toFixed(0)}%)
                  </span>
                  {cat.isExceeded ? (
                    <span className="text-red-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Estourou {formatCurrency(cat.excessAmount, hideValues)}
                    </span>
                  ) : (
                    <span className="text-emerald-600 font-semibold">
                      Restam {formatCurrency(cat.remainingAmount, hideValues)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

