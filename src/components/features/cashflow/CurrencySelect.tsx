'use client';

import { CURRENCIES } from '@/lib/constants';
import s from './CurrencySelect.module.css';

/**
 * The small currency selector in the Cashflow header. A plain select rather
 * than the Field-wrapped one, so it can sit next to a label without doubling
 * the vertical rhythm.
 */
export function CurrencySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (currency: string) => void;
}) {
  return (
    <div className={s.wrap}>
      <span className="field__label" id="currency-label">
        Currency
      </span>
      <select
        className={`select ${s.select}`}
        aria-labelledby="currency-label"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {CURRENCIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </div>
  );
}