import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Wallet,
  Clock,
  CreditCard,
  Calendar,
  Sparkles,
  Check,
  Tag,
} from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { useToast } from '../contexts/ToastContext';
import CurrencyInput from './CurrencyInput';
import {
  calculateBaseInvoiceMonth,
  formatCurrency,
  formatMonthLabel,
  getTodayISO,
} from '../utils/finance';

export default function ExpenseModal({ isOpen, onClose }) {
  const { accounts, cards, categories, addExpense } = useFinance();
  const { showToast } = useToast();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [paymentType, setPaymentType] = useState('debit'); // 'debit' | 'payable' | 'credit'
  const [accountId, setAccountId] = useState('');
  const [dueDate, setDueDate] = useState(getTodayISO());
  const [cardId, setCardId] = useState('');
  const [installments, setInstallments] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDescription('');
      setAmount(0);
      setDate(getTodayISO());
      setDueDate(getTodayISO());
      setInstallments(1);
      if (categories.length > 0 && !categoryId) {
        setCategoryId(categories[0].id);
      }
      if (accounts.length > 0 && !accountId) {
        setAccountId(accounts[0].id);
      }
      if (cards.length > 0 && !cardId) {
        setCardId(cards[0].id);
      }
    }
  }, [isOpen, categories, accounts, cards]);

  const selectedCard = useMemo(
    () => cards.find((c) => c.id === cardId),
    [cards, cardId]
  );

  const invoicePreview = useMemo(() => {
    if (paymentType !== 'credit' || !selectedCard || !date) return null;
    const targetMonthKey = calculateBaseInvoiceMonth(date, selectedCard.closingDay);
    const dayOfPurchase = Number(date.split('-')[2]);
    const isAfterClosing = dayOfPurchase >= Number(selectedCard.closingDay);
    return {
      monthLabel: formatMonthLabel(targetMonthKey),
      isAfterClosing,
      closingDay: selectedCard.closingDay,
    };
  }, [paymentType, selectedCard, date]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      showToast('Digite um valor maior que R$ 0,00', 'error');
      return;
    }

    setSubmitting(true);
    try {
      await addExpense({
        description,
        amount,
        categoryId: categoryId || categories[0]?.id,
        date,
        paymentType,
        accountId: accountId || accounts[0]?.id,
        dueDate,
        cardId: cardId || cards[0]?.id,
        installments: Number(installments) || 1,
      });

      showToast('Despesa registrada com sucesso!');
      onClose();
    } catch (err) {
      showToast(err.message || 'Erro ao salvar despesa.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">Novo Lançamento</h2>
            <p className="text-xs text-slate-400">Registre um gasto em segundos</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Valor principal */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Valor da Despesa *
            </label>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              autoFocus
              required
              placeholder="0,00"
            />
          </div>

          {/* Tipo de Pagamento (Tabs rápidas) */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Como será pago?
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentType('debit')}
                className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${
                  paymentType === 'debit'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Wallet className="w-4 h-4" />
                <span>À Vista / Débito</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('credit')}
                className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${
                  paymentType === 'credit'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Cartão Crédito</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentType('payable')}
                className={`flex flex-col items-center justify-center gap-1 py-3 px-2 rounded-xl border text-xs font-semibold transition-all ${
                  paymentType === 'payable'
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Pagar Depois</span>
              </button>
            </div>
          </div>

          {/* Categoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Categoria
              </label>
              <div className="relative">
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Data do Lançamento
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* Descrição opcional */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Descrição <span className="text-slate-400 font-normal">(opcional)</span>
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Se vazio, usará o nome da categoria"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
          </div>

          {/* Campos Condicionais por Tipo de Pagamento */}
          {paymentType === 'debit' && (
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-emerald-800">
                Debitar imediatamente do Banco:
              </label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-emerald-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.balance)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {paymentType === 'payable' && (
            <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-900">
                Data de Vencimento da Conta (Água, Luz, Internet, etc.)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-600"
              />
              <p className="text-xs text-amber-700">
                O valor ficará listado em "Contas a Pagar" e só descontará do seu banco quando você marcar como pago.
              </p>
            </div>
          )}

          {paymentType === 'credit' && (
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3">
              {cards.length === 0 ? (
                <p className="text-xs text-red-600 font-medium">
                  Você ainda não cadastrou nenhum cartão de crédito. Acesse a aba Cartões para adicionar um.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-900 mb-1">
                        Cartão de Crédito
                      </label>
                      <select
                        value={cardId}
                        onChange={(e) => setCardId(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      >
                        {cards.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} (Fecha dia {c.closingDay})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-900 mb-1">
                        Parcelamento
                      </label>
                      <select
                        value={installments}
                        onChange={(e) => setInstallments(Number(e.target.value))}
                        className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                      >
                        {Array.from({ length: 18 }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}x {amount > 0 ? `de ${formatCurrency(amount / n)}` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {invoicePreview && (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-white/90 border border-indigo-100 text-xs text-indigo-950">
                      <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold">Fatura Inteligente: </span>
                        {invoicePreview.isAfterClosing ? (
                          <span>
                            Compra feita no dia ou após o fechamento (dia {invoicePreview.closingDay}). A 1ª parcela irá para a fatura de{' '}
                            <strong className="text-indigo-700">{invoicePreview.monthLabel}</strong>.
                          </span>
                        ) : (
                          <span>
                            Compra antes do fechamento (dia {invoicePreview.closingDay}). A 1ª parcela entrará na fatura de{' '}
                            <strong className="text-indigo-700">{invoicePreview.monthLabel}</strong>.
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || (paymentType === 'credit' && cards.length === 0)}
            className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all"
          >
            <Check className="w-5 h-5" />
            <span>{submitting ? 'Salvando lançamento...' : 'Confirmar Lançamento'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

