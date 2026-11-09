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
  FileText,
  X,
  Wallet,
  Edit2,
  Check,
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
    addExistingInvoice,
    updateCardInvoiceAmount,
    deleteTransaction,
  } = useFinance();
  const { showToast } = useToast();

  const [selectedCardId, setSelectedCardId] = useState('ALL'); // 'ALL' ou card.id
  const [activeMonthKey, setActiveMonthKey] = useState(getMonthKey());
  const [payingInvoice, setPayingInvoice] = useState(null); // { cardId, cardName, monthKey, amount }
  const [selectedPayAccount, setSelectedPayAccount] = useState('');
  
  // Modais
  const [isNewCardModalOpen, setIsNewCardModalOpen] = useState(false);
  const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);

  // Modal para Alterar Valor de Fatura
  const [editingInvoice, setEditingInvoice] = useState(null); // { cardId, cardName, currentAmount }
  const [newInvoiceAmount, setNewInvoiceAmount] = useState(0);
  const [submittingEditInvoice, setSubmittingEditInvoice] = useState(false);

  // Estado do Modal de Adicionar Fatura Existente
  const [targetCardId, setTargetCardId] = useState('');
  const [targetInvoiceAmount, setTargetInvoiceAmount] = useState(0);
  const [targetInvoiceDesc, setTargetInvoiceDesc] = useState('');
  const [submittingInvoice, setSubmittingInvoice] = useState(false);

  // Navegação entre meses
  const handlePrevMonth = () => setActiveMonthKey((prev) => addMonthsToKey(prev, -1));
  const handleNextMonth = () => setActiveMonthKey((prev) => addMonthsToKey(prev, 1));
  const handleResetToCurrent = () => setActiveMonthKey(getMonthKey());

  // Transações de cartão para o mês selecionado
  const monthCardTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.paymentType !== 'credit') return false;
      if (t.invoiceMonth !== activeMonthKey) return false;
      if (selectedCardId !== 'ALL' && t.cardId !== selectedCardId) return false;
      return true;
    });
  }, [transactions, activeMonthKey, selectedCardId]);

  // Total consolidado
  const totalInvoiceAmount = useMemo(() => {
    return monthCardTransactions.reduce((acc, t) => acc + Number(t.amount), 0);
  }, [monthCardTransactions]);

  // Lista dos cartões com faturas no mês selecionado
  const cardInvoicesSummary = useMemo(() => {
    return cards.map((card) => {
      const cardTxs = transactions.filter(
        (t) => t.paymentType === 'credit' && t.cardId === card.id && t.invoiceMonth === activeMonthKey
      );
      const total = cardTxs.reduce((acc, t) => acc + Number(t.amount), 0);
      const invRecord = invoices.find(
        (i) => i.cardId === card.id && i.monthKey === activeMonthKey
      );
      const isPaid = invRecord?.status === 'paid' && total > 0;
      return {
        card,
        total,
        txCount: cardTxs.length,
        isPaid,
      };
    });
  }, [cards, transactions, invoices, activeMonthKey]);

  // Confirmação de Pagamento Individual ou Consolidado
  const handleConfirmPayment = async (e) => {
    e.preventDefault();
    if (!selectedPayAccount) {
      showToast('Selecione uma conta bancária para debitar o valor.', 'error');
      return;
    }

    try {
      if (payingInvoice.cardId === 'ALL') {
        const cardsToPay = cardInvoicesSummary.filter((ci) => ci.total > 0 && !ci.isPaid);
        for (const ci of cardsToPay) {
          await payCardInvoice({
            cardId: ci.card.id,
            monthKey: activeMonthKey,
            totalAmount: ci.total,
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

  // Abrir Modal de Pagamento
  const openPayModal = (cardId, cardName, amount) => {
    if (accounts.length > 0 && !selectedPayAccount) {
      setSelectedPayAccount(accounts[0].id);
    }
    setPayingInvoice({
      cardId,
      cardName,
      monthKey: activeMonthKey,
      amount,
    });
  };

  // Submeter Fatura Existente
  const handleCreateExistingInvoice = async (e) => {
    e.preventDefault();
    const effectiveCardId = targetCardId || (cards[0]?.id || '');
    if (!effectiveCardId) {
      showToast('Cadastre um cartão primeiro.', 'error');
      return;
    }
    if (!targetInvoiceAmount || targetInvoiceAmount <= 0) {
      showToast('Digite um valor de fatura maior que R$ 0,00', 'error');
      return;
    }

    setSubmittingInvoice(true);
    try {
      await addExistingInvoice({
        cardId: effectiveCardId,
        monthKey: activeMonthKey,
        amount: targetInvoiceAmount,
        description: targetInvoiceDesc,
      });
      showToast(`Fatura adicionada a ${formatMonthLabel(activeMonthKey)} com sucesso!`);
      setTargetInvoiceAmount(0);
      setTargetInvoiceDesc('');
      setIsAddInvoiceModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Erro ao adicionar fatura existente.', 'error');
    } finally {
      setSubmittingInvoice(false);
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

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Botão Adicionar Fatura Existente no Mês Selecionado */}
          <button
            onClick={() => {
              if (cards.length > 0 && !targetCardId) {
                setTargetCardId(cards[0].id);
              }
              setIsAddInvoiceModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 transition"
          >
            <FileText className="w-4 h-4" />
            <span>+ Adicionar Fatura Existente</span>
          </button>

          <button
            onClick={() => setIsNewCardModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Cartão</span>
          </button>
        </div>
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

      {/* Seção de Faturas Individuais por Cartão neste Mês com Opção de Pagamento Individual */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500">
            Faturas em {formatMonthLabel(activeMonthKey)}
          </h3>
          <span className="text-xs text-slate-400">
            Você pode pagar cada cartão individualmente
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {cardInvoicesSummary.map(({ card, total, txCount, isPaid }) => (
            <div
              key={card.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                isPaid
                  ? 'bg-emerald-50/40 border-emerald-200'
                  : total > 0
                  ? 'bg-white border-slate-200 shadow-sm hover:border-indigo-300'
                  : 'bg-slate-50/60 border-slate-200/60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <CreditCard className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-900 text-sm">{card.name}</span>
                  </div>
                  {isPaid ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Paga
                    </span>
                  ) : total > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Aberta
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Sem gastos</span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-2">
                  <div className="text-2xl font-black text-slate-900">
                    {formatCurrency(total, hideValues)}
                  </div>
                  <button
                    onClick={() => {
                      setEditingInvoice({
                        cardId: card.id,
                        cardName: card.name,
                        currentAmount: total,
                      });
                      setNewInvoiceAmount(total);
                    }}
                    title="Alterar valor desta fatura"
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 transition flex items-center gap-1 text-[11px] font-semibold"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Ajustar</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Fecha dia {card.closingDay} • Vence dia {card.dueDay} • {txCount} compra(s)
                </p>
              </div>

              {/* Botão Individual de Pagar Fatura Deste Cartão */}
              {total > 0 && !isPaid && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <button
                    onClick={() => openPayModal(card.id, card.name, total)}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Pagar Este Cartão</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Destaque Consolidado (Total de todos os cartões) */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
            Total Consolidado das Faturas ({formatMonthLabel(activeMonthKey)})
          </span>
          <div className="text-3xl sm:text-4xl font-black tracking-tight text-white mt-1">
            {formatCurrency(totalInvoiceAmount, hideValues)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {monthCardTransactions.length} lançamento(s) registrados no período
          </p>
        </div>

        {totalInvoiceAmount > 0 && cardInvoicesSummary.some((ci) => ci.total > 0 && !ci.isPaid) && (
          <button
            onClick={() => openPayModal('ALL', 'Todos os Cartões', totalInvoiceAmount)}
            className="px-6 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition"
          >
            <CheckCircle2 className="w-5 h-5" />
            <span>Pagar Todas as Faturas Abertas</span>
          </button>
        )}
      </div>

      {/* Listagem detalhada das compras que compõem a fatura */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-base">
            Itens da Fatura ({formatMonthLabel(activeMonthKey)})
          </h3>
          <span className="text-xs text-slate-400 font-medium">
            Filtro: {selectedCardId === 'ALL' ? 'Todos os cartões' : cards.find((c) => c.id === selectedCardId)?.name}
          </span>
        </div>

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
                      <span className="font-medium text-slate-600">{tx.cardName}</span>
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

      {/* Modal: Adicionar Fatura Existente no Mês Selecionado */}
      {isAddInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Adicionar Fatura Existente</h3>
                <p className="text-xs text-slate-500">
                  Atribuir fatura para <strong className="text-indigo-600">{formatMonthLabel(activeMonthKey)}</strong>
                </p>
              </div>
              <button
                onClick={() => setIsAddInvoiceModalOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExistingInvoice} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Qual Cartão de Crédito? *
                </label>
                <select
                  value={targetCardId || (cards[0]?.id || '')}
                  onChange={(e) => setTargetCardId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {cards.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} (Fecha dia {c.closingDay})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Valor da Fatura *
                </label>
                <CurrencyInput
                  value={targetInvoiceAmount}
                  onChange={setTargetInvoiceAmount}
                  autoFocus
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Saldo antigo Nubank, Fatura acumulada"
                  value={targetInvoiceDesc}
                  onChange={(e) => setTargetInvoiceDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddInvoiceModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingInvoice}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-100 hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {submittingInvoice ? 'Salvando...' : 'Adicionar Fatura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Pagar Fatura (Individual ou Todas) */}
      {payingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Baixa de Pagamento de Fatura</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cartão: <strong className="text-indigo-600">{payingInvoice.cardName}</strong>
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

      {/* Modal: Alterar Valor da Fatura */}
      {editingInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Alterar Valor da Fatura</h3>
                <p className="text-xs text-slate-500">
                  Cartão: <strong className="text-indigo-600">{editingInvoice.cardName}</strong> • {formatMonthLabel(activeMonthKey)}
                </p>
              </div>
              <button
                onClick={() => setEditingInvoice(null)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setSubmittingEditInvoice(true);
                try {
                  await updateCardInvoiceAmount({
                    cardId: editingInvoice.cardId,
                    monthKey: activeMonthKey,
                    newAmount: newInvoiceAmount,
                  });
                  showToast('Valor da fatura ajustado com sucesso!');
                  setEditingInvoice(null);
                } catch (err) {
                  showToast('Erro ao atualizar valor da fatura.', 'error');
                } finally {
                  setSubmittingEditInvoice(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                  Novo Valor da Fatura *
                </label>
                <CurrencyInput
                  value={newInvoiceAmount}
                  onChange={setNewInvoiceAmount}
                  autoFocus
                  required
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Valor atual: {formatCurrency(editingInvoice.currentAmount, hideValues)}
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingInvoice(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs hover:bg-slate-200 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingEditInvoice}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md shadow-indigo-100 hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {submittingEditInvoice ? 'Salvando...' : 'Confirmar Novo Valor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
