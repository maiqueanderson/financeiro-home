/**
 * Formata um número em moeda brasileira (R$ 1.234,56)
 */
export function formatCurrency(value, hideValues = false) {
  if (hideValues) return 'R$ •••••';
  const num = Number(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(num);
}

/**
 * Converte string de input com dígitos para valor numérico em reais
 * Ex: "12550" -> 125.50
 */
export function parseCurrencyInput(rawValue) {
  const digits = String(rawValue).replace(/\D/g, '');
  if (!digits) return 0;
  return parseInt(digits, 10) / 100;
}

/**
 * Formata um valor numérico para exibição em campo de input monetário
 */
export function formatCurrencyInput(numericValue) {
  const num = Number(numericValue) || 0;
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Retorna a chave de mês "YYYY-MM" para uma data (Date ou string ISO YYYY-MM-DD)
 */
export function getMonthKey(dateInput = new Date()) {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}/.test(dateInput)) {
    return dateInput.slice(0, 7);
  }
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Adiciona N meses a uma chave "YYYY-MM" e retorna a nova chave "YYYY-MM"
 */
export function addMonthsToKey(monthKey, monthsToAdd) {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + monthsToAdd, 1);
  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, '0');
  return `${newYear}-${newMonth}`;
}

/**
 * Formata uma chave "YYYY-MM" em texto amigável (Ex: "Novembro 2026")
 */
export function formatMonthLabel(monthKey) {
  if (!monthKey) return '';
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Retorna a data de hoje no formato "YYYY-MM-DD" para inputs type="date"
 */
export function getTodayISO() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * LÓGICA DE FATURA INTELIGENTE:
 * Compara o dia da compra com o dia de fechamento do cartão.
 * - Se o dia da compra for MENOR que o dia de fechamento, cai na fatura do próprio mês da compra.
 * - Se o dia da compra for MAIOR OU IGUAL ao dia de fechamento ("melhor dia de compra"),
 *   cai na fatura do mês subsequente (+1 mês).
 * - Caso o dia de vencimento seja menor que o dia de fechamento (ex: fecha dia 25 e vence dia 05 do mês seguinte),
 *   a referência da fatura também respeita a virada de mês.
 */
export function calculateBaseInvoiceMonth(purchaseDateStr, closingDay) {
  const [year, month, day] = purchaseDateStr.split('-').map(Number);
  const baseMonthKey = `${year}-${String(month).padStart(2, '0')}`;
  if (day >= Number(closingDay)) {
    return addMonthsToKey(baseMonthKey, 1);
  }
  return baseMonthKey;
}

/**
 * Gera a lista de parcelas distribuídas nos meses/anos futuros
 * Ajustando centavos na primeira parcela para bater exatamente o valor total.
 */
export function generateInstallmentSchedule(totalAmount, installmentsCount, purchaseDateStr, closingDay) {
  const count = Math.max(1, parseInt(installmentsCount, 10) || 1);
  const baseInvoiceMonth = calculateBaseInvoiceMonth(purchaseDateStr, closingDay);
  const baseInstallmentValue = Math.floor((totalAmount / count) * 100) / 100;
  const remainder = Number((totalAmount - baseInstallmentValue * count).toFixed(2));

  const schedule = [];
  for (let i = 0; i < count; i++) {
    const amount = i === 0 ? Number((baseInstallmentValue + remainder).toFixed(2)) : baseInstallmentValue;
    const invoiceMonth = addMonthsToKey(baseInvoiceMonth, i);
    schedule.push({
      installmentNumber: i + 1,
      totalInstallments: count,
      amount,
      invoiceMonth,
    });
  }
  return schedule;
}

