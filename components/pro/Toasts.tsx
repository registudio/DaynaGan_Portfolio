'use client';

import { useEffect, useState } from 'react';

/**
 * Toast stack (Elements/elements/loader-toast.html), placed under the navbar: small
 * confirmations slide in, stack, and fade after a few seconds. Call `toast('…')` from anywhere.
 */
const EVENT = 'dg-toast';

export function toast(message: string) {
  dispatchEvent(new CustomEvent(EVENT, { detail: message }));
}

type Item = { id: number; text: string; out: boolean };

export default function ToastStack() {
  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    let n = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const add = (e: Event) => {
      const id = ++n;
      setItems((xs) => [...xs.slice(-3), { id, text: (e as CustomEvent<string>).detail, out: false }]);
      timers.push(
        setTimeout(() => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, out: true } : x))), 2600),
        setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 2900),
      );
    };
    addEventListener(EVENT, add);
    return () => {
      removeEventListener(EVENT, add);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div className="toasts" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast-item${t.out ? ' out' : ''}`}>
          <i aria-hidden />
          {t.text}
        </div>
      ))}
    </div>
  );
}
