import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  Lock,
  Mail,
  User,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  PieChart,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';

export default function AuthPage() {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { signIn, signUp, isFirebaseConfigured } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFirebaseConfigured) {
      showToast(
        'Configure suas credenciais do Firebase no arquivo .env antes de autenticar.',
        'error'
      );
      return;
    }

    setSubmitting(true);
    try {
      if (isRegister) {
        await signUp(email, password, name);
        showToast('Conta criada com sucesso! Bem-vindo.');
        navigate('/onboarding');
      } else {
        await signIn(email, password);
        showToast('Login realizado com sucesso!');
        navigate('/');
      }
    } catch (err) {
      console.error(err);
      let msg = 'Falha ao autenticar. Verifique seus dados.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'E-mail ou senha incorretos.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'Este e-mail já está em uso.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'A senha deve conter no mínimo 6 caracteres.';
      } else if (err.code === 'auth/invalid-credential') {
        msg = 'Credenciais inválidas. Verifique seu e-mail e senha.';
      }
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center items-center p-4 selection:bg-emerald-500 selection:text-slate-900">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/20 mb-4">
            <Wallet className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Financeiro Home
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Gestão financeira familiar, inteligente e sem complicações
          </p>
        </div>

        {!isFirebaseConfigured && (
          <div className="mb-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs">
            <strong className="block text-amber-300 font-semibold mb-1">
              Atenção: Firebase não configurado
            </strong>
            Preencha as variáveis de ambiente no arquivo <code className="bg-amber-950/60 px-1 py-0.5 rounded">.env</code> para conectar seu banco de dados e autenticação.
          </div>
        )}

        {/* Form Card */}
        <div className="bg-slate-800/80 backdrop-blur-xl border border-slate-700 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="flex rounded-xl bg-slate-900/60 p-1 mb-6 border border-slate-700/50">
            <button
              type="button"
              onClick={() => setIsRegister(false)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                !isRegister
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                isRegister
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Seu Nome
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Como quer ser chamado?"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900/70 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                E-mail
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/70 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-900/70 border border-slate-700 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <span>{submitting ? 'Aguarde...' : isRegister ? 'Cadastrar e Começar' : 'Entrar no FinHome'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Destaques rápidos */}
          <div className="mt-8 pt-6 border-t border-slate-700/60 grid grid-cols-3 gap-2 text-center">
            <div className="flex flex-col items-center">
              <ShieldCheck className="w-4 h-4 text-emerald-400 mb-1" />
              <span className="text-[11px] text-slate-400">100% Seguro</span>
            </div>
            <div className="flex flex-col items-center">
              <Smartphone className="w-4 h-4 text-sky-400 mb-1" />
              <span className="text-[11px] text-slate-400">Instala como App</span>
            </div>
            <div className="flex flex-col items-center">
              <PieChart className="w-4 h-4 text-indigo-400 mb-1" />
              <span className="text-[11px] text-slate-400">Metas & Faturas</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

