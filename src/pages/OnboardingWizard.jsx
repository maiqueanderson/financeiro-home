import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Landmark,
  CreditCard,
  Target,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Plus,
  Trash2,
  Calendar,
} from 'lucide-react';
import { useFinance, DEFAULT_CATEGORIES } from '../contexts/FinanceContext';
import { useToast } from '../contexts/ToastContext';
import CurrencyInput from '../components/CurrencyInput';
import { getMonthKey, addMonthsToKey, formatMonthLabel } from '../utils/finance';

export default function OnboardingWizard() {
  const { completeOnboarding } = useFinance();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  // 1. Bancos / Contas
  const [accounts, setAccounts] = useState([
    { id: '1', name: 'Nubank', balance: 1500 },
    { id: '2', name: 'Itaú', balance: 800 },
  ]);

  // 2. Cartões de Crédito (com suporte a faturas existentes por mês)
  const currentMonth = getMonthKey();
  const nextMonth = addMonthsToKey(currentMonth, 1);

  const [cards, setCards] = useState([
    {
      id: '1',
      name: 'Nubank Mastercard',
      limit: 5000,
      closingDay: 25,
      dueDay: 5,
      existingInvoices: [
        { monthKey: currentMonth, amount: 0 },
        { monthKey: nextMonth, amount: 0 },
      ],
    },
  ]);

  // 3. Categorias & Metas de teto de gasto
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);

  // Ações de Bancos
  const addAccountRow = () => {
    setAccounts((prev) => [
      ...prev,
      { id: String(Date.now()), name: '', balance: 0 },
    ]);
  };

  const removeAccountRow = (idx) => {
    setAccounts((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateAccount = (idx, field, val) => {
    setAccounts((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  // Ações de Cartões
  const addCardRow = () => {
    setCards((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: '',
        limit: 3000,
        closingDay: 25,
        dueDay: 5,
        existingInvoices: [
          { monthKey: currentMonth, amount: 0 },
          { monthKey: nextMonth, amount: 0 },
        ],
      },
    ]);
  };

  const removeCardRow = (idx) => {
    setCards((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateCard = (idx, field, val) => {
    setCards((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const updateCardInvoice = (cardIdx, monthKey, amount) => {
    setCards((prev) => {
      const copy = [...prev];
      const invs = [...copy[cardIdx].existingInvoices];
      const foundIdx = invs.findIndex((i) => i.monthKey === monthKey);
      if (foundIdx >= 0) {
        invs[foundIdx] = { ...invs[foundIdx], amount };
      } else {
        invs.push({ monthKey, amount });
      }
      copy[cardIdx].existingInvoices = invs;
      return copy;
    });
  };

  // Ações de Categorias
  const updateCategoryBudget = (idx, monthlyBudget) => {
    setCategories((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], monthlyBudget };
      return copy;
    });
  };

  const handleFinish = async () => {
    const validAccounts = accounts.filter((a) => a.name.trim().length > 0);
    if (validAccounts.length === 0) {
      showToast('Cadastre pelo menos uma conta bancária com nome.', 'error');
      setStep(1);
      return;
    }

    setSubmitting(true);
    try {
      const validCards = cards.filter((c) => c.name.trim().length > 0);
      await completeOnboarding({
        accountsList: validAccounts,
        cardsList: validCards,
        categoriesList: categories,
      });

      showToast('Configuração concluída com sucesso!');
      navigate('/');
    } catch (err) {
      console.error(err);
      showToast('Erro ao concluir configuração inicial.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-slate-800/90 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Progress Header */}
        <div className="bg-slate-950/60 p-6 border-b border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs font-semibold text-emerald-400 uppercase tracking-widest">
                Passo {step} de 3
              </span>
              <h2 className="text-xl font-bold text-white">
                {step === 1 && 'Suas Contas Bancárias & Saldos'}
                {step === 2 && 'Seus Cartões de Crédito'}
                {step === 3 && 'Categorias & Metas de Gasto'}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-7 h-2 rounded-full transition-all ${
                    step >= s ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-400">
            {step === 1 && 'Informe onde você guarda seu dinheiro e o saldo atual de cada conta.'}
            {step === 2 && 'Cadastre seus cartões, dias de fechamento/vencimento e saldos de faturas já existentes.'}
            {step === 3 && 'Defina limites mensais para cada categoria para acionar alertas no Dashboard.'}
          </p>
        </div>

        {/* Wizard Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {/* STEP 1: BANCOS */}
          {step === 1 && (
            <div className="space-y-3">
              {accounts.map((acc, idx) => (
                <div
                  key={acc.id}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex flex-col sm:flex-row items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-emerald-400 shrink-0">
                    <Landmark className="w-5 h-5" />
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] text-slate-400 mb-1">Nome do Banco / Carteira</label>
                    <input
                      type="text"
                      placeholder="Ex: Nubank, Itaú, Dinheiro Vivo"
                      value={acc.name}
                      onChange={(e) => updateAccount(idx, 'name', e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="w-full sm:w-44">
                    <label className="block text-[11px] text-slate-400 mb-1">Saldo Atual</label>
                    <CurrencyInput
                      value={acc.balance}
                      onChange={(val) => updateAccount(idx, 'balance', val)}
                    />
                  </div>
                  {accounts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeAccountRow(idx)}
                      className="p-2 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800/80 transition self-end sm:self-center"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={addAccountRow}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-700 hover:border-emerald-500 text-slate-400 hover:text-emerald-400 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Outro Banco</span>
              </button>
            </div>
          )}

          {/* STEP 2: CARTÕES */}
          {step === 2 && (
            <div className="space-y-4">
              {cards.map((card, idx) => (
                <div
                  key={card.id}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-slate-700/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-sm">Cartão #{idx + 1}</span>
                    </div>
                    {cards.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeCardRow(idx)}
                        className="text-slate-400 hover:text-red-400 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Nome do Cartão</label>
                      <input
                        type="text"
                        placeholder="Ex: Nubank Ultravioleta"
                        value={card.name}
                        onChange={(e) => updateCard(idx, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Limite Total</label>
                      <CurrencyInput
                        value={card.limit}
                        onChange={(val) => updateCard(idx, 'limit', val)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Dia de Fechamento</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={card.closingDay}
                        onChange={(e) => updateCard(idx, 'closingDay', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Dia de Vencimento</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={card.dueDay}
                        onChange={(e) => updateCard(idx, 'dueDay', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Faturas já existentes (mês atual e próximo mês) */}
                  <div className="pt-2 border-t border-slate-700/60">
                    <span className="block text-[11px] font-semibold text-indigo-300 uppercase tracking-wider mb-2">
                      Faturas Já em Aberto (Opcional):
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {formatMonthLabel(currentMonth)} (Atual)
                        </label>
                        <CurrencyInput
                          value={
                            card.existingInvoices?.find((i) => i.monthKey === currentMonth)?.amount || 0
                          }
                          onChange={(val) => updateCardInvoice(idx, currentMonth, val)}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] text-slate-400 mb-1">
                          {formatMonthLabel(nextMonth)} (Próximo)
                        </label>
                        <CurrencyInput
                          value={
                            card.existingInvoices?.find((i) => i.monthKey === nextMonth)?.amount || 0
                          }
                          onChange={(val) => updateCardInvoice(idx, nextMonth, val)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={addCardRow}
                className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-indigo-400 text-xs font-semibold flex items-center justify-center gap-2 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar Outro Cartão</span>
              </button>
            </div>
          )}

          {/* STEP 3: CATEGORIAS & METAS */}
          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">
                Ajuste os valores máximos mensais que você planeja gastar em cada área:
              </p>
              {categories.map((cat, idx) => (
                <div
                  key={cat.name}
                  className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-700/60 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                    <span className="text-sm font-medium text-white">{cat.name}</span>
                  </div>
                  <div className="w-40">
                    <CurrencyInput
                      value={cat.monthlyBudget}
                      onChange={(val) => updateCategoryBudget(idx, val)}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Wizard Footer Controls */}
        <div className="p-6 bg-slate-950/60 border-t border-slate-700 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-2 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition"
            >
              <span>Próximo Passo</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={handleFinish}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              <span>{submitting ? 'Salvando...' : 'Concluir & Ir ao Dashboard'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

