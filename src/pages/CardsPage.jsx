import React, { useState, useMemo } from 'react';
import {
  CreditCard,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Plus,
  Clock,
  Sparkles,
  ShoppingBag,
  Trash2,
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

export default function CardsPage() {
  const {
    cards,
    accounts,
    transactions,
    invoices,
    hideValues,
    payCardInvoice,
    addCard,
    deleteTransaction,
  } = useFinance();
  const { showToast } = useToast();

  const [selectedCardId, setSelectedCardId] = useState('ALL'); // 'ALL' ou card.id
  const [activeMonthKey, setActiveMonthKey] = useState(getMonthKey());
  const [payingInvoice, setPayingInvoice] = useState(null); // { cardId, monthKey, amount }
  const [selectedPayAccount, setSelectedPayAccount] = useState('');
  const [isNewCardModalOpen, setIsNewCardModalOpen] = useState(false);

  // Navegação entre meses (Mês anterior, atual e futuros sem limite)
  const handlePrevMonth = () => {
    setActiveMonthKey((prev) => addMonthsToKey(prev, -1));
  };
  const handleNextMonth = () => {
    setActiveMonthKey((prev) => addMonthsToKey(prev, 1));
  };
  const handleResetToCurrent = () => {
    setActiveMonthKey(getMonthKey());
  };

  // Filtra transações de cartão para o mês selecionado
  const monthCardTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.paymentType !== 'credit') return false;
      if (t.invoiceMonth !== activeMonthKey) return false;
      if (selectedCardId !== 'ALL' && t.cardId !== selectedCardId) return false;
      return true;
    });
  }, [transactions, activeMonthKey, selectedCardId]);

  // Total da fatura do mês selecionado
  const totalInvoiceAmount = useMemo(() => {
    return monthCardTransactions.reduce((acc, t) => acc + Number(t.amount), 0);
  }, [monthCardTransactions]);

  // Status da fatura para o cartão ou cartões
  const invoiceRecords = useMemo(() => {
    return invoices.filter((i) => i.monthKey === activeMonthKey);
  }, [invoices, activeMonthKey]);

  const isCurrentSelectionPaid = useMemo(() => {
    if (monthCardTransactions.length === 0) return false;
    if (selectedCardId !== 'ALL') {
      const inv = invoiceRecords.find((i) => i.cardId === selectedCardId);
      return inv?.status === 'paid';
    }
    // Visão consolidada: se todas as faturas com valor estão marcadas como pagas
    const activeCardsInMonth = [...new Set(monthCardTransactions.map((t) => t.cardId))];
    return activeCardsInMonth.every((cId) => {
      const inv = invoiceRecords.find((i) => i.cardId === cId);
      return inv?.status === 'paid';
    });
  }, [selectedCardId, monthCardTransactions, invoiceRecords]);

  // Ação de pagamento de fatura
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!selectedPayAccount) {
      showToast('Selecione uma conta bancária para debitar o valor.', 'error');
      return;
    }

    try {
      if (payingInvoice.cardId === 'ALL') {
        // Paga cada cartão individualmente
        const cardsToPay = [...new Set(monthCardTransactions.map((t) => t.cardId))];
        for (const cId of cardsToPay) {
          const cardTotal = monthCardTransactions
            .filter((t) => t.cardId === cId)
            .reduce((acc, t) => acc + Number(t.amount), 0);
          await payCardInvoice({
            cardId: cId,
            monthKey: activeMonthKey,
            totalAmount: cardTotal,
            accountId: selectedPayAccount,
          });
        }
      } else {
        await payCardInvoice({
          cardId: payingInvoice.cardId,
          monthKey: activeMonthKey,
          totalAmount: payingInvoice.amount,
          accountId: selectedPayAccount,
        });
      }

      showToast('Fatura paga com sucesso!');
      setPayingInvoice(null);
    } catch (err) {
      showToast(err.message || 'Erro ao pagar fatura.', 'error');
    }
  };

  // Formulário de Novo Cartão
  const [newCardName, setNewCardName] = useState('');
  const [newCardLimit, setNewCardLimit] = useState(3000);
  const [newCardClosing, setNewCardClosing] = useState(25);
  const [newCardDue, setNewCardDue] = useState(5);

  const handleCreateCard = async (e) => {
    e.preventDefault();
    if (!newCardName.trim()) {
      showToast('Digite o nome do cartão.', 'error');
      return;
    }
    await addCard({
      name: newCardName,
      limit: newCardLimit,
      closingDay: newCardClosing,
      dueDay: newCardDue,
    });
    showToast('Cartão cadastrado!');
    setNewCardName('');
    setIsNewCardModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header com Navegação Mensal */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Gerenciamento de Cartões
          </span>
          <h2 className="text-2xl font-extrabold text-slate-900">
            Faturas & Parcelamentos
          </h2>
        </div>

        <button
          onClick={() => setIsNewCardModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Cartão</span>
        </button>
      </div>

      {/* Seletor de Cartão & Meses */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-sm space-y-4">
        {/* Pills de Cartão */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCardId('ALL')}
            className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
              selectedCardId === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Todos os Cartões (Visão Consolidada)
          </button>
          {cards.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCardId(c.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition flex items-center gap-1.5 ${
                selectedCardId === c.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{c.name}</span>
            </button>
          ))}
        </div>

        {/* Barra de Navegação Temporal (Mês Anterior / Mês Atual / Mês Seguinte) */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            onClick={handlePrevMonth}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 flex items-center gap-1 text-xs font-semibold transition"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Mês Anterior</span>
          </button>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span className="font-extrabold text-slate-900 text-base sm:text-lg">
              {formatMonthLabel(activeMonthKey)}
            </span>
            {activeMonthKey !== getMonthKey() && (
              <button
                onClick={handleResetToCurrent}
                className="text-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded-md"
              >
                Voltar p/ Atual
              </button>
            )}
          </div>

          <button
            onClick={handleNextMonth}
            className="p-2 rounded-xl hover:bg-slate-100 text-slate-600 flex items-center gap-1 text-xs font-semibold transition"
          >
            <span className="hidden sm:inline">Próximo Mês</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Card de Destaque da Fatura do Mês Selecionado */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Valor da Fatura ({formatMonthLabel(activeMonthKey)})
            </span>
            {isCurrentSelectionPaid ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[11px] font-bold border border-emerald-500/30 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Fatura Paga
              </span>
            ) : totalInvoiceAmount > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-bold border border-amber-500/30 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Fatura Aberta
              </span>
            ) : null}
          </div>

          <div className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            {formatCurrency(totalInvoiceAmount, hideValues)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {monthCardTransactions.length} item(ns) lançados nesta fatura
          </p>
        </div>

        {/* Botão de Pagar Fatura */}
        {totalInvoiceAmount > 0 && !isCurrentSelectionPaid && (
          <button
            onClick={() => {
              if (accounts.length > 0 && !selectedPayAccount) {
                setSelectedPayAccount(accounts[0].id);
              }
              setPayingInvoice({
                cardId: selectedCardId,
                monthKey: activeMonthKey,
                amount: totalInvoiceAmount,
              });
            }}
            className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Pagar Fatura Completa</span>
          </button>
        )}
      </div>

      {/* Listagem detalhada das compras que compõem a fatura */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <h3 className="font-bold text-slate-900 text-base">
          Lançamentos na Fatura ({formatMonthLabel(activeMonthKey)})
        </h3>

        {monthCardTransactions.length === 0 ? (
          <div className="py-12 text-center">
            <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-600">Nenhum gasto nesta fatura</p>
            <p className="text-xs text-slate-400">
              Compras feitas neste cartão aparecerão aqui conforme as datas de fechamento.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {monthCardTransactions.map((tx) => (
              <div
                key={tx.id}
                className="py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50/50 px-2 rounded-xl transition"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full shrink-0"
                    style={{ backgroundColor: tx.categoryColor || '#6366f1' }}
                  />
                  <div>
                    <p className="text-sm font-bold text-slate-900 leading-tight">
                      {tx.description}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span>{tx.cardName}</span>
                      <span>•</span>
                      <span>{tx.categoryName}</span>
                      <span>•</span>
                      <span>{tx.date?.split('-').reverse().join('/')}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm font-black text-slate-900">
                    {formatCurrency(tx.amount, hideValues)}
                  </span>
                  <button
                    onClick={() => deleteTransaction(tx)}
                    title="Excluir lançamento"
                    className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg hover:bg-slate-100 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Pagar Fatura (Seleciona o banco para debitar) */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Baixa de Pagamento de Fatura</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                O valor será deduzido do saldo da conta bancária escolhida.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100 space-y-1">
              <span className="text-xs text-indigo-700 font-semibold">Valor Total a Pagar:</span>
              <div className="text-2xl font-black text-indigo-950">
                {formatCurrency(payingInvoice.amount, hideValues)}
              </div>
              <span className="text-xs text-indigo-600">
                Referência: {formatMonthLabel(payingInvoice.monthKey)}
              </span>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Debitar de qual Banco / Conta?
                </label>
                <select
                  value={selectedPayAccount}
                  onChange={(e) => setSelectedPayAccount(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingInvoice(null)}
                  className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition"
                >
                  Confirmar Pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo Cartão */}
      {isNewCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Novo Cartão de Crédito</h3>
            <form onSubmit={handleCreateCard} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Nome do Cartão</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: C6 Carbon"
                  value={newCardName}
                  onChange={(e) => setNewCardName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Limite Total</label>
                <CurrencyInput value={newCardLimit} onChange={setNewCardLimit} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Dia Fechamento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newCardClosing}
                    onChange={(e) => setNewCardClosing(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Dia Vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={newCardDue}
                    onChange={(e) => setNewCardDue(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsNewCardModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md"
                >
                  Salvar Cartão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

