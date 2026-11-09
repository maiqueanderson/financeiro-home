import React from 'react';
import { formatCurrencyInput, parseCurrencyInput } from '../utils/finance';

export default function CurrencyInput({
  value,
  onChange,
  placeholder = '0,00',
  className = '',
  required = false,
  autoFocus = false,
}) {
  const handleChange = (e) => {
    const numeric = parseCurrencyInput(e.target.value);
    onChange(numeric);
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <span className="absolute left-3.5 text-slate-400 font-semibold text-sm pointer-events-none">
        R$
      </span>
      <input
        type="text"
        inputMode="numeric"
        required={required}
        autoFocus={autoFocus}
        value={value === 0 ? '' : formatCurrencyInput(value)}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all"
      />
    </div>
  );
}

