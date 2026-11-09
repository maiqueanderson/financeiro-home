import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Home,
  CreditCard,
  PieChart,
  Plus,
  Eye,
  EyeOff,
  LogOut,
  Wallet,
  TrendingUp,
  LineChart,
} from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';
import { useAuth } from '../contexts/AuthContext';
import ExpenseModal from './ExpenseModal';
import IncomeModal from './IncomeModal';

export default function AppLayout() {
  const { hideValues, toggleHideValues, isQuickExpenseOpen, setIsQuickExpenseOpen } =
    useFinance();
  const { user, logout } = useAuth();
  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-24 sm:pb-8">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-base leading-tight tracking-tight">
                Financeiro Home
              </h1>
              <p className="text-[11px] text-slate-400 truncate max-w-[180px] sm:max-w-xs">
                {user?.email}
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden sm:flex items-center gap-1">
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/cards"
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              Cartões & Faturas
            </NavLink>
            <NavLink
              to="/reports"
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              Relatórios & Metas
            </NavLink>
            <NavLink
              to="/projection"
              className={({ isActive }) =>
                `px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`
              }
            >
              Projeção
            </NavLink>
          </nav>

          {/* Actions: Botão Privacidade ("Olho"), Receita, Novo Gasto Desktop e Logout */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsIncomeModalOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition"
              title="Registrar entrada/receita"
            >
              <TrendingUp className="w-4 h-4" />
              <span>Receita</span>
            </button>

            <button
              onClick={() => setIsQuickExpenseOpen(true)}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              <span>Lançar Gasto</span>
            </button>

            <button
              onClick={toggleHideValues}
              title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              {hideValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            <button
              onClick={logout}
              title="Sair da conta"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-950/80 text-slate-300 hover:text-red-300 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Bottom Navigation Bar (PWA Mobile) */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-6 py-2 flex items-center justify-between shadow-[0_-4px_20px_rgba(15,23,42,0.06)]">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-xs font-semibold transition ${
              isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'
            }`
          }
        >
          <Home className="w-5 h-5" />
          <span>Início</span>
        </NavLink>

        <NavLink
          to="/cards"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-xs font-semibold transition ${
              isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'
            }`
          }
        >
          <CreditCard className="w-5 h-5" />
          <span>Cartões</span>
        </NavLink>

        {/* Botão Central de Destaque "+" (Ação Rápida em menos de 3 cliques) */}
        <div className="-mt-7">
          <button
            onClick={() => setIsQuickExpenseOpen(true)}
            aria-label="Lançar despesa rápida"
            className="w-14 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white shadow-lg shadow-indigo-600/40 flex items-center justify-center border-4 border-slate-50 transition-transform"
          >
            <Plus className="w-7 h-7" />
          </button>
        </div>

        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-xs font-semibold transition ${
              isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'
            }`
          }
        >
          <PieChart className="w-5 h-5" />
          <span>Relatórios</span>
        </NavLink>

        <NavLink
          to="/projection"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl text-xs font-semibold transition ${
              isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-700'
            }`
          }
        >
          <LineChart className="w-5 h-5" />
          <span>Projeção</span>
        </NavLink>
      </nav>

      {/* Modal de Lançamento Rápido de Despesa */}
      <ExpenseModal
        isOpen={isQuickExpenseOpen}
        onClose={() => setIsQuickExpenseOpen(false)}
      />

      {/* Modal de Lançamento de Receita */}
      <IncomeModal
        isOpen={isIncomeModalOpen}
        onClose={() => setIsIncomeModalOpen(false)}
      />
    </div>
  );
}

