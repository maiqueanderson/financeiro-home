import React, { useState } from 'react';
import {
  TrendingUp,
  Landmark,
  X,
  Check,
  Calendar,
} from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { useToast } from '../contexts/ToastContext';
import CurrencyInput from './CurrencyInput';
import { getTodayISO } from '../utils/finance';
import { doc, collection, writeBatch, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

export default function IncomeModal({ isOpen, onClose }) {
  const { accounts } = useFinance();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState(0);
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(getTodayISO());
  const [category, setCategory] = useState('Salário');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      showToast('Digite um valor maior que R$ 0,00', 'error');
      return;
    }

    const targetAccount = accounts.find((a) => a.id === (accountId || accounts[0]?.id));
    if (!targetAccount) {
      showToast('Selecione uma conta bancária para receber o valor.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const batch = writeBatch(db);
      const txRef = doc(collection(db, 'users', user.uid, 'transactions'));
      const desc = description.trim() || category || 'Receita';

      batch.set(txRef, {
        description: desc,
        amount: Number(amount),
        type: 'income',
        categoryName: category,
        date,
        accountId: targetAccount.id,
        accountName: targetAccount.name,
        status: 'paid',
        competenceMonth: date.slice(0, 7),
        createdAt: serverTimestamp(),
      });

      const accRef = doc(db, 'users', user.uid, 'accounts', targetAccount.id);
      batch.update(accRef, {
        balance: increment(Number(amount)),
      });

      await batch.commit();
      showToast('Receita creditada com sucesso!');
      onClose();
    } catch (err) {
      console.error(err);
      showToast('Erro ao registrar receita.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-sm p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom duration-200">
        <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Nova Receita / Entrada</h2>
              <p className="text-xs text-emerald-100">Adicione dinheiro ao seu saldo</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-emerald-800 text-emerald-200 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Valor da Receita *
            </label>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              autoFocus
              required
              placeholder="0,00"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Depositar em qual Conta?
            </label>
            <select
              value={accountId || (accounts[0]?.id || '')}
              onChange={(e) => setAccountId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Tipo / Origem
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              >
                <option value="Salário">Salário</option>
                <option value="Rendimento / Extra">Rendimento / Extra</option>
                <option value="Reembolso">Reembolso</option>
                <option value="Transferência Recebida">Transferência</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                Data
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
              Descrição (Opcional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Adiantamento salarial, Venda de item"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-600"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 transition-all"
          >
            <Check className="w-5 h-5" />
            <span>{submitting ? 'Creditando...' : 'Adicionar ao Saldo'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}

