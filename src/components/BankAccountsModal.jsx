import React, { useState } from 'react';
import {
  Landmark,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  Wallet,
} from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { useToast } from '../contexts/ToastContext';
import { formatCurrency } from '../utils/finance';
import CurrencyInput from './CurrencyInput';

export default function BankAccountsModal({ isOpen, onClose }) {
  const { accounts, addAccount, updateAccount, deleteAccount, hideValues } = useFinance();
  const { showToast } = useToast();

  const [isAdding, setIsAdding] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankBalance, setNewBankBalance] = useState(0);

  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editBalance, setEditBalance] = useState(0);

  if (!isOpen) return null;

  const handleStartEdit = (acc) => {
    setEditingId(acc.id);
    setEditName(acc.name);
    setEditBalance(acc.balance);
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      showToast('O nome do banco não pode ficar vazio.', 'error');
      return;
    }
    try {
      await updateAccount(editingId, {
        name: editName,
        balance: editBalance,
      });
      showToast('Conta bancária atualizada com sucesso!');
      setEditingId(null);
    } catch (err) {
      showToast('Erro ao atualizar conta.', 'error');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newBankName.trim()) {
      showToast('Digite o nome do banco.', 'error');
      return;
    }
    try {
      await addAccount(newBankName, newBankBalance);
      showToast('Banco adicionado com sucesso!');
      setNewBankName('');
      setNewBankBalance(0);
      setIsAdding(false);
    } catch (err) {
      showToast('Erro ao adicionar banco.', 'error');
    }
  };

  const handleDelete = async (accId, accName) => {
    if (confirm(`Tem certeza que deseja remover o banco "${accName}"?`)) {
      try {
        await deleteAccount(accId);
        showToast('Banco removido com sucesso!');
      } catch (err) {
        showToast('Erro ao remover banco.', 'error');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in duration-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Landmark className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base">Gerenciar Contas & Bancos</h3>
              <p className="text-xs text-slate-400">Adicione, edite ou exclua suas contas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {/* Botão Adicionar Banco */}
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="w-full py-2.5 rounded-2xl border-2 border-dashed border-slate-300 hover:border-emerald-500 text-slate-600 hover:text-emerald-600 text-xs font-bold flex items-center justify-center gap-2 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Adicionar Novo Banco / Conta</span>
            </button>
          )}

          {/* Form Novo Banco */}
          {isAdding && (
            <form onSubmit={handleCreate} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Novo Banco
                </span>
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Nome do Banco *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Santander, Inter, Carteira"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                  Saldo Inicial
                </label>
                <CurrencyInput value={newBankBalance} onChange={setNewBankBalance} />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAdding(false)}
                  className="flex-1 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 text-xs font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm"
                >
                  Salvar Banco
                </button>
              </div>
            </form>
          )}

          {/* Lista de Bancos Existentes */}
          <div className="space-y-2.5">
            {accounts.map((acc) => {
              const isEditing = editingId === acc.id;

              if (isEditing) {
                return (
                  <div
                    key={acc.id}
                    className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200 space-y-3 animate-in fade-in duration-150"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Nome do Banco
                        </label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-sm font-semibold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Saldo Atual
                        </label>
                        <CurrencyInput value={editBalance} onChange={setEditBalance} />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(acc.id, acc.name)}
                        className="text-xs text-red-600 hover:text-red-700 font-semibold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Excluir</span>
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1.5 rounded-xl bg-white text-slate-600 text-xs font-semibold border border-slate-200"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-4 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Salvar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={acc.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-emerald-600">
                      <Wallet className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 leading-tight">
                        {acc.name}
                      </h4>
                      <span className="text-xs font-bold text-emerald-600">
                        {formatCurrency(acc.balance, hideValues)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleStartEdit(acc)}
                      title="Editar banco e saldo"
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(acc.id, acc.name)}
                      title="Excluir banco"
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

