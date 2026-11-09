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
  Plus,
  Trash2,
  X,
  Palette,
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

const PRESET_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#8b5cf6', // Purple
  '#ef4444', // Red
  '#14b8a6', // Teal
  '#3b82f6', // Blue
  '#f97316', // Orange
  '#64748b', // Slate
];

export default function ReportsPage() {
  const {
    categories,
    transactions,
    hideValues,
    addCategory,
    updateCategory,
    deleteCategory,
  } = useFinance();
  const { showToast } = useToast();

  const [activeMonthKey, setActiveMonthKey] = useState(getMonthKey());

  // Estado para Edição de Categoria
  const [editingCategory, setEditingCategory] = useState(null); // { id, name, monthlyBudget, color }

  // Estado para Modal de Nova Categoria
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState(500);
  const [newCatColor, setNewCatColor] = useState('#6366f1');
  const [submitting, setSubmitting] = useState(false);

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

  // Iniciar edição
  const handleStartEdit = (cat) => {
    setEditingCategory({
      id: cat.id,
      name: cat.name,
      monthlyBudget: cat.budget,
      color: cat.color || '#6366f1',
    });
  };

  // Salvar edição
  const handleSaveEdit = async () => {
    if (!editingCategory) return;
    if (!editingCategory.name.trim()) {
      showToast('O nome da categoria não pode ficar vazio.', 'error');
      return;
    }

    try {
      await updateCategory(editingCategory.id, {
        name: editingCategory.name,
        monthlyBudget: editingCategory.monthlyBudget,
        color: editingCategory.color,
      });
      showToast('Categoria atualizada com sucesso!');
      setEditingCategory(null);
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar categoria.', 'error');
    }
  };

  // Criar nova categoria
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      showToast('Digite o nome da categoria.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await addCategory({
        name: newCatName,
        monthlyBudget: newCatBudget,
        color: newCatColor,
      });
      showToast('Nova categoria criada com sucesso!');
      setNewCatName('');
      setNewCatBudget(500);
      setIsAddModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Erro ao criar categoria.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Excluir categoria
  const handleDeleteCategory = async (catId, catName) => {
    if (confirm(`Tem certeza que deseja excluir a categoria "${catName}"?`)) {
      try {
        await deleteCategory(catId);
        showToast('Categoria excluída!');
        if (editingCategory?.id === catId) setEditingCategory(null);
      } catch (err) {
        showToast('Erro ao excluir categoria.', 'error');
      }
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

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {/* Seletor de Mês */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-2xl border border-slate-200 shadow-sm">
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

          {/* Botão Nova Categoria */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-100 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Categoria</span>
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

      {/* Gestão, Edição de Nome/Meta e Criação de Categorias */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Metas Mensais & Categorias</h3>
            <p className="text-xs text-slate-400">
              Personalize o nome, a cor ou a meta mensal clicando no ícone de edição
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Categoria</span>
          </button>
        </div>

        <div className="space-y-3">
          {categoryStats.map((cat) => {
            const isEditing = editingCategory?.id === cat.id;
            const progress = Math.min(100, cat.percentage);

            if (isEditing) {
              return (
                <div
                  key={cat.id}
                  className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200 space-y-3 animate-in fade-in duration-150"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                      Editar Categoria
                    </span>
                    <button
                      onClick={() => setEditingCategory(null)}
                      className="text-slate-400 hover:text-slate-600 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Nome da Categoria
                      </label>
                      <input
                        type="text"
                        value={editingCategory.name}
                        onChange={(e) =>
                          setEditingCategory((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Meta Mensal (Teto)
                      </label>
                      <CurrencyInput
                        value={editingCategory.monthlyBudget}
                        onChange={(val) =>
                          setEditingCategory((prev) => ({ ...prev, monthlyBudget: val }))
                        }
                      />
                    </div>
                  </div>

                  {/* Seletor de Cores */}
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                      Cor da Categoria
                    </label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setEditingCategory((prev) => ({ ...prev, color: c }))}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full transition-transform ${
                            editingCategory.color === c
                              ? 'scale-125 ring-2 ring-offset-2 ring-indigo-600'
                              : 'hover:scale-110'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Excluir Categoria</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingCategory(null)}
                        className="px-3 py-1.5 rounded-xl bg-white text-slate-600 font-semibold text-xs border border-slate-200 hover:bg-slate-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow hover:bg-indigo-700 flex items-center gap-1"
                      >
                        <Check className="w-4 h-4" />
                        <span>Salvar</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={cat.id}
                className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="font-bold text-sm text-slate-900">{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      Meta: <strong className="text-slate-900">{formatCurrency(cat.budget, hideValues)}</strong>
                    </span>
                    <button
                      onClick={() => handleStartEdit(cat)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-white transition"
                      title="Editar nome, cor ou meta"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
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

      {/* Modal: Nova Categoria */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Nova Categoria</h3>
                <p className="text-xs text-slate-500">Adicione uma área para gerenciar seus gastos</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Nome da Categoria *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Ex: Pets, Educação, Assinaturas"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Meta Mensal de Gastos (Teto)
                </label>
                <CurrencyInput value={newCatBudget} onChange={setNewCatBudget} />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Escolha uma Cor
                </label>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewCatColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-7 h-7 rounded-full transition-transform ${
                        newCatColor === c
                          ? 'scale-125 ring-2 ring-offset-2 ring-indigo-600 shadow'
                          : 'hover:scale-110'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-100 hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Criar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
