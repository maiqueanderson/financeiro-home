import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  writeBatch,
  serverTimestamp,
  updateDoc,
  increment,
  deleteDoc,
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from './AuthContext';
import { generateInstallmentSchedule, getMonthKey } from '../utils/finance';

const FinanceContext = createContext(null);

export const DEFAULT_CATEGORIES = [
  { name: 'Moradia & Contas', color: '#6366f1', monthlyBudget: 1500 },
  { name: 'Supermercado', color: '#10b981', monthlyBudget: 1200 },
  { name: 'Transporte', color: '#f59e0b', monthlyBudget: 500 },
  { name: 'Lazer & Restaurantes', color: '#ec4899', monthlyBudget: 600 },
  { name: 'Saúde & Farmácia', color: '#06b6d4', monthlyBudget: 400 },
  { name: 'Outros', color: '#64748b', monthlyBudget: 300 },
];

export function FinanceProvider({ children }) {
  const { user, refreshProfile } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [cards, setCards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [projectedIncome, setProjectedIncome] = useState(0);
  const [hideValues, setHideValues] = useState(() => {
    return localStorage.getItem('finhome_hide_values') === 'true';
  });
  const [isQuickExpenseOpen, setIsQuickExpenseOpen] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  const toggleHideValues = () => {
    setHideValues((prev) => {
      const next = !prev;
      localStorage.setItem('finhome_hide_values', String(next));
      return next;
    });
  };

  useEffect(() => {
    if (!user || !db) {
      setAccounts([]);
      setCards([]);
      setCategories([]);
      setTransactions([]);
      setInvoices([]);
      setProjectedIncome(0);
      setLoadingData(false);
      return;
    }

    setLoadingData(true);
    const uid = user.uid;

    const unsubUser = onSnapshot(doc(db, 'users', uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProjectedIncome(Number(data.projectedIncome) || 0);
      }
    });

    const unsubAccounts = onSnapshot(collection(db, 'users', uid, 'accounts'), (snap) => {
      setAccounts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubCards = onSnapshot(collection(db, 'users', uid, 'cards'), (snap) => {
      setCards(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubCategories = onSnapshot(collection(db, 'users', uid, 'categories'), (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubTransactions = onSnapshot(collection(db, 'users', uid, 'transactions'), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setTransactions(list);
    });

    const unsubInvoices = onSnapshot(collection(db, 'users', uid, 'invoices'), (snap) => {
      setInvoices(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoadingData(false);
    });

    return () => {
      unsubUser();
      unsubAccounts();
      unsubCards();
      unsubCategories();
      unsubTransactions();
      unsubInvoices();
    };
  }, [user]);

  /**
   * Salva todos os dados do Onboarding Wizard em um único Batch atômico
   */
  const completeOnboarding = async ({ accountsList, cardsList, categoriesList }) => {
    if (!user) return;
    const batch = writeBatch(db);
    const uid = user.uid;

    // 1. Bancos / Contas
    accountsList.forEach((acc) => {
      const ref = doc(collection(db, 'users', uid, 'accounts'));
      batch.set(ref, {
        name: acc.name.trim(),
        balance: Number(acc.balance) || 0,
        initialBalance: Number(acc.balance) || 0,
        createdAt: serverTimestamp(),
      });
    });

    // 2. Categorias e Metas
    let defaultCatId = null;
    categoriesList.forEach((cat, idx) => {
      const ref = doc(collection(db, 'users', uid, 'categories'));
      if (idx === 0) defaultCatId = ref.id;
      batch.set(ref, {
        name: cat.name.trim(),
        color: cat.color || '#6366f1',
        monthlyBudget: Number(cat.monthlyBudget) || 0,
        createdAt: serverTimestamp(),
      });
    });

    // 3. Cartões de Crédito + Faturas Iniciais Pré-existentes (por mês)
    cardsList.forEach((card) => {
      const cardRef = doc(collection(db, 'users', uid, 'cards'));
      batch.set(cardRef, {
        name: card.name.trim(),
        limit: Number(card.limit) || 0,
        closingDay: Number(card.closingDay) || 25,
        dueDay: Number(card.dueDay) || 5,
        createdAt: serverTimestamp(),
      });

      if (Array.isArray(card.existingInvoices)) {
        card.existingInvoices.forEach((inv) => {
          const amount = Number(inv.amount) || 0;
          if (amount > 0 && inv.monthKey) {
            const invoiceId = `${cardRef.id}_${inv.monthKey}`;
            const invRef = doc(db, 'users', uid, 'invoices', invoiceId);
            batch.set(invRef, {
              cardId: cardRef.id,
              cardName: card.name.trim(),
              monthKey: inv.monthKey,
              totalAmount: amount,
              status: 'open',
              updatedAt: serverTimestamp(),
            });

            // Cria um lançamento correspondente na fatura para histórico transparente
            const txRef = doc(collection(db, 'users', uid, 'transactions'));
            batch.set(txRef, {
              description: `Saldo anterior da fatura (${card.name.trim()})`,
              amount,
              categoryId: defaultCatId || 'initial',
              categoryName: 'Saldo Inicial Fatura',
              date: `${inv.monthKey}-01`,
              paymentType: 'credit',
              cardId: cardRef.id,
              cardName: card.name.trim(),
              invoiceId,
              invoiceMonth: inv.monthKey,
              installmentNumber: 1,
              totalInstallments: 1,
              status: 'pending',
              competenceMonth: inv.monthKey,
              createdAt: serverTimestamp(),
            });
          }
        });
      }
    });

    // 4. Marca onboarding como concluído no perfil do usuário
    const userRef = doc(db, 'users', uid);
    batch.set(userRef, { onboardingCompleted: true, updatedAt: serverTimestamp() }, { merge: true });

    await batch.commit();
    await refreshProfile();
  };

  /**
   * Adiciona um gasto (Débito à vista, Conta a Pagar futura ou Cartão de Crédito com lógica inteligente de fechamento)
   */
  const addExpense = async ({
    description,
    amount,
    categoryId,
    date,
    paymentType, // 'debit' | 'payable' | 'credit'
    accountId,
    dueDate,
    cardId,
    installments = 1,
  }) => {
    if (!user) return;
    const uid = user.uid;
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      throw new Error('Informe um valor válido maior que zero.');
    }

    const category = categories.find((c) => c.id === categoryId);
    const finalDescription = (description || '').trim() || (category ? category.name : 'Despesa');
    const batch = writeBatch(db);

    if (paymentType === 'debit') {
      const account = accounts.find((a) => a.id === accountId);
      if (!account) throw new Error('Selecione uma conta bancária para debitar.');

      const txRef = doc(collection(db, 'users', uid, 'transactions'));
      const competenceMonth = getMonthKey(date);

      batch.set(txRef, {
        description: finalDescription,
        amount: numericAmount,
        categoryId,
        categoryName: category?.name || 'Outros',
        categoryColor: category?.color || '#6366f1',
        date,
        paymentType: 'debit',
        accountId,
        accountName: account.name,
        status: 'paid',
        competenceMonth,
        createdAt: serverTimestamp(),
      });

      const accRef = doc(db, 'users', uid, 'accounts', accountId);
      batch.update(accRef, {
        balance: increment(-numericAmount),
      });
    } else if (paymentType === 'payable') {
      const targetDueDate = dueDate || date;
      const competenceMonth = getMonthKey(targetDueDate);
      const txRef = doc(collection(db, 'users', uid, 'transactions'));

      batch.set(txRef, {
        description: finalDescription,
        amount: numericAmount,
        categoryId,
        categoryName: category?.name || 'Outros',
        categoryColor: category?.color || '#6366f1',
        date,
        dueDate: targetDueDate,
        paymentType: 'payable',
        status: 'pending',
        competenceMonth,
        createdAt: serverTimestamp(),
      });
    } else if (paymentType === 'credit') {
      const card = cards.find((c) => c.id === cardId);
      if (!card) throw new Error('Selecione um cartão de crédito.');

      const schedule = generateInstallmentSchedule(
        numericAmount,
        installments,
        date,
        card.closingDay
      );
      const purchaseGroupId = `grp_${Date.now()}`;

      schedule.forEach((item) => {
        const invoiceId = `${card.id}_${item.invoiceMonth}`;
        const txRef = doc(collection(db, 'users', uid, 'transactions'));

        batch.set(txRef, {
          description:
            item.totalInstallments > 1
              ? `${finalDescription} (${item.installmentNumber}/${item.totalInstallments})`
              : finalDescription,
          baseDescription: finalDescription,
          amount: item.amount,
          totalPurchaseAmount: numericAmount,
          categoryId,
          categoryName: category?.name || 'Outros',
          categoryColor: category?.color || '#6366f1',
          date,
          paymentType: 'credit',
          cardId: card.id,
          cardName: card.name,
          invoiceId,
          invoiceMonth: item.invoiceMonth,
          installmentNumber: item.installmentNumber,
          totalInstallments: item.totalInstallments,
          purchaseGroupId,
          status: 'pending',
          competenceMonth: item.invoiceMonth,
          createdAt: serverTimestamp(),
        });

        const invRef = doc(db, 'users', uid, 'invoices', invoiceId);
        batch.set(
          invRef,
          {
            cardId: card.id,
            cardName: card.name,
            monthKey: item.invoiceMonth,
            totalAmount: increment(item.amount),
            status: 'open',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });
    }

    await batch.commit();
  };

  /**
   * Marca uma Conta a Pagar ("Para pagar depois") como Paga e debita o saldo do banco escolhido
   */
  const payPendingBill = async (transaction, accountId) => {
    if (!user) return;
    const uid = user.uid;
    const account = accounts.find((a) => a.id === accountId);
    if (!account) throw new Error('Selecione o banco de onde sairá o pagamento.');

    const batch = writeBatch(db);
    const txRef = doc(db, 'users', uid, 'transactions', transaction.id);
    batch.update(txRef, {
      status: 'paid',
      paidAt: serverTimestamp(),
      accountId: account.id,
      accountName: account.name,
    });

    const accRef = doc(db, 'users', uid, 'accounts', account.id);
    batch.update(accRef, {
      balance: increment(-Number(transaction.amount)),
    });

    await batch.commit();
  };

  /**
   * Adiciona uma fatura existente avulsa para um cartão em determinado mês
   */
  const addExistingInvoice = async ({ cardId, monthKey, amount, description }) => {
    if (!user) return;
    const uid = user.uid;
    const card = cards.find((c) => c.id === cardId);
    if (!card) throw new Error('Selecione um cartão de crédito válido.');

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new Error('Informe um valor de fatura maior que zero.');
    }

    const defaultCategory = categories[0];
    const invoiceId = `${card.id}_${monthKey}`;
    const batch = writeBatch(db);

    const invRef = doc(db, 'users', uid, 'invoices', invoiceId);
    batch.set(
      invRef,
      {
        cardId: card.id,
        cardName: card.name,
        monthKey,
        totalAmount: increment(numAmount),
        status: 'open',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    const txRef = doc(collection(db, 'users', uid, 'transactions'));
    const finalDesc = (description || '').trim() || `Saldo / Fatura Existente (${card.name})`;

    batch.set(txRef, {
      description: finalDesc,
      amount: numAmount,
      categoryId: defaultCategory?.id || 'initial',
      categoryName: defaultCategory?.name || 'Saldo de Fatura',
      categoryColor: defaultCategory?.color || '#6366f1',
      date: `${monthKey}-01`,
      paymentType: 'credit',
      cardId: card.id,
      cardName: card.name,
      invoiceId,
      invoiceMonth: monthKey,
      installmentNumber: 1,
      totalInstallments: 1,
      status: 'pending',
      competenceMonth: monthKey,
      createdAt: serverTimestamp(),
    });

    await batch.commit();
  };

  /**
   * Paga a fatura de um cartão de crédito em determinado mês, debitando do banco escolhido
   */
  const payCardInvoice = async ({ cardId, monthKey, totalAmount, accountId }) => {
    if (!user) return;
    const uid = user.uid;
    const account = accounts.find((a) => a.id === accountId);
    if (!account) throw new Error('Selecione o banco para debitar o pagamento da fatura.');

    const invoiceId = `${cardId}_${monthKey}`;
    const batch = writeBatch(db);

    // Atualiza ou cria documento de fatura como paga
    const invRef = doc(db, 'users', uid, 'invoices', invoiceId);
    batch.set(
      invRef,
      {
        cardId,
        monthKey,
        status: 'paid',
        paidAmount: Number(totalAmount),
        paidAccountId: account.id,
        paidAccountName: account.name,
        paidAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Atualiza todas as transações dessa fatura para 'paid'
    const invoiceTxs = transactions.filter(
      (t) => t.paymentType === 'credit' && t.cardId === cardId && t.invoiceMonth === monthKey
    );
    invoiceTxs.forEach((tx) => {
      const txRef = doc(db, 'users', uid, 'transactions', tx.id);
      batch.update(txRef, { status: 'paid' });
    });

    // Debita o valor da conta bancária selecionada
    const accRef = doc(db, 'users', uid, 'accounts', account.id);
    batch.update(accRef, {
      balance: increment(-Number(totalAmount)),
    });

    await batch.commit();
  };

  /**
   * Adiciona receita em uma conta bancária com registro histórico
   */
  const addIncome = async ({ description, amount, accountId, date, category }) => {
    if (!user) return;
    const uid = user.uid;
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      throw new Error('Informe um valor de receita válido.');
    }

    const account = accounts.find((a) => a.id === accountId);
    if (!account) throw new Error('Selecione uma conta bancária para receber o valor.');

    const batch = writeBatch(db);
    const txRef = doc(collection(db, 'users', uid, 'transactions'));
    const finalDesc = (description || '').trim() || category || 'Receita / Depósito';
    const finalDate = date || new Date().toISOString().slice(0, 10);

    batch.set(txRef, {
      description: finalDesc,
      amount: numAmount,
      type: 'income',
      categoryName: category || 'Receita',
      date: finalDate,
      accountId: account.id,
      accountName: account.name,
      status: 'paid',
      competenceMonth: finalDate.slice(0, 7),
      createdAt: serverTimestamp(),
    });

    const accRef = doc(db, 'users', uid, 'accounts', account.id);
    batch.update(accRef, {
      balance: increment(numAmount),
    });

    await batch.commit();
  };

  /**
   * Adiciona receita ou ajuste de saldo em uma conta bancária
   */
  const adjustAccountBalance = async (accountId, newBalance) => {
    if (!user) return;
    const accRef = doc(db, 'users', user.uid, 'accounts', accountId);
    await updateDoc(accRef, { balance: Number(newBalance) });
  };

  /**
   * Adiciona novo banco avulso
   */
  const addAccount = async (name, balance) => {
    if (!user) return;
    const batch = writeBatch(db);
    const ref = doc(collection(db, 'users', user.uid, 'accounts'));
    batch.set(ref, {
      name: name.trim(),
      balance: Number(balance) || 0,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  };

  /**
   * Atualiza dados de um banco (nome e/ou saldo)
   */
  const updateAccount = async (accountId, { name, balance }) => {
    if (!user) return;
    const accRef = doc(db, 'users', user.uid, 'accounts', accountId);
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (balance !== undefined) updates.balance = Number(balance) || 0;
    updates.updatedAt = serverTimestamp();
    await updateDoc(accRef, updates);
  };

  /**
   * Exclui um banco
   */
  const deleteAccount = async (accountId) => {
    if (!user) return;
    const accRef = doc(db, 'users', user.uid, 'accounts', accountId);
    await deleteDoc(accRef);
  };

  /**
   * Atualiza o valor de uma fatura de cartão de crédito em um mês específico
   */
  const updateCardInvoiceAmount = async ({ cardId, monthKey, newAmount }) => {
    if (!user) return;
    const uid = user.uid;
    const card = cards.find((c) => c.id === cardId);
    const numNewAmount = Number(newAmount) || 0;
    const invoiceId = `${cardId}_${monthKey}`;

    // Busca os lançamentos existentes dessa fatura
    const invoiceTxs = transactions.filter(
      (t) => t.paymentType === 'credit' && t.cardId === cardId && t.invoiceMonth === monthKey
    );
    const currentTotal = invoiceTxs.reduce((acc, t) => acc + Number(t.amount), 0);
    const difference = numNewAmount - currentTotal;

    const batch = writeBatch(db);

    // Atualiza o documento consolidado da fatura
    const invRef = doc(db, 'users', uid, 'invoices', invoiceId);
    batch.set(
      invRef,
      {
        cardId,
        cardName: card?.name || 'Cartão',
        monthKey,
        totalAmount: numNewAmount,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Se houver diferença, cria um lançamento de ajuste de saldo na fatura
    if (Math.abs(difference) > 0.001) {
      const txRef = doc(collection(db, 'users', uid, 'transactions'));
      batch.set(txRef, {
        description: `Ajuste manual de fatura (${card?.name || 'Cartão'})`,
        amount: Number(difference.toFixed(2)),
        categoryId: categories[0]?.id || 'adjustment',
        categoryName: 'Ajuste de Fatura',
        categoryColor: '#6366f1',
        date: `${monthKey}-01`,
        paymentType: 'credit',
        cardId,
        cardName: card?.name || 'Cartão',
        invoiceId,
        invoiceMonth: monthKey,
        installmentNumber: 1,
        totalInstallments: 1,
        status: 'pending',
        competenceMonth: monthKey,
        createdAt: serverTimestamp(),
      });
    }

    await batch.commit();
  };

  /**
   * Adiciona novo cartão avulso
   */
  const addCard = async ({ name, limit, closingDay, dueDay }) => {
    if (!user) return;
    const batch = writeBatch(db);
    const ref = doc(collection(db, 'users', user.uid, 'cards'));
    batch.set(ref, {
      name: name.trim(),
      limit: Number(limit) || 0,
      closingDay: Number(closingDay) || 25,
      dueDay: Number(dueDay) || 5,
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  };

  /**
   * Adiciona nova categoria avulsa
   */
  const addCategory = async ({ name, monthlyBudget, color }) => {
    if (!user) return;
    const batch = writeBatch(db);
    const ref = doc(collection(db, 'users', user.uid, 'categories'));
    batch.set(ref, {
      name: name.trim(),
      monthlyBudget: Number(monthlyBudget) || 0,
      color: color || '#6366f1',
      createdAt: serverTimestamp(),
    });
    await batch.commit();
  };

  /**
   * Atualiza dados de uma categoria (nome, meta e cor)
   */
  const updateCategory = async (categoryId, { name, monthlyBudget, color }) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'categories', categoryId);
    const updates = {};
    if (name !== undefined) updates.name = name.trim();
    if (monthlyBudget !== undefined) updates.monthlyBudget = Number(monthlyBudget) || 0;
    if (color !== undefined) updates.color = color;
    updates.updatedAt = serverTimestamp();
    await updateDoc(ref, updates);
  };

  /**
   * Atualiza meta de uma categoria (retrocompatibilidade)
   */
  const updateCategoryBudget = async (categoryId, monthlyBudget) => {
    return updateCategory(categoryId, { monthlyBudget });
  };

  /**
   * Exclui uma categoria
   */
  const deleteCategory = async (categoryId) => {
    if (!user) return;
    const ref = doc(db, 'users', user.uid, 'categories', categoryId);
    await deleteDoc(ref);
  };

  /**
   * Atualiza o Saldo Projetado Mensal do usuário
   */
  const updateProjectedIncome = async (newAmount) => {
    if (!user) return;
    const uid = user.uid;
    const userRef = doc(db, 'users', uid);
    const numeric = Number(newAmount) || 0;
    await updateDoc(userRef, {
      projectedIncome: numeric,
      updatedAt: serverTimestamp(),
    });
    setProjectedIncome(numeric);
  };

  /**
   * Exclui um lançamento (e estorna o saldo se era débito à vista)
   */
  const deleteTransaction = async (tx) => {
    if (!user) return;
    const uid = user.uid;
    const batch = writeBatch(db);
    const txRef = doc(db, 'users', uid, 'transactions', tx.id);
    batch.delete(txRef);

    if (tx.paymentType === 'debit' && tx.accountId) {
      const accRef = doc(db, 'users', uid, 'accounts', tx.accountId);
      batch.update(accRef, { balance: increment(Number(tx.amount)) });
    } else if (tx.paymentType === 'credit' && tx.invoiceId) {
      const invRef = doc(db, 'users', uid, 'invoices', tx.invoiceId);
      batch.set(
        invRef,
        { totalAmount: increment(-Number(tx.amount)), updatedAt: serverTimestamp() },
        { merge: true }
      );
    }

    await batch.commit();
  };

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        cards,
        categories,
        transactions,
        invoices,
        projectedIncome,
        updateProjectedIncome,
        hideValues,
        toggleHideValues,
        isQuickExpenseOpen,
        setIsQuickExpenseOpen,
        loadingData,
        completeOnboarding,
        addExpense,
        addIncome,
        payPendingBill,
        payCardInvoice,
        adjustAccountBalance,
        addAccount,
        updateAccount,
        deleteAccount,
        addCard,
        addExistingInvoice,
        updateCardInvoiceAmount,
        addCategory,
        updateCategory,
        updateCategoryBudget,
        deleteCategory,
        deleteTransaction,
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
}

export function useFinance() {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error('useFinance deve ser usado dentro de um FinanceProvider');
  return ctx;
}

