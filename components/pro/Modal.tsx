'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Centred modal: dimmed backdrop, scale-in card, Esc / backdrop click to close, focus kept
 * inside while open and returned to the trigger afterwards. Rendered into <body>.
 */
export default function Modal({
  open,
  onClose,
  label,
  children,
  wide = false,
  illuminate = false,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
  wide?: boolean;
  /** Illuminate: light beams sweep behind the card (the export's beam-sweep element). */
  illuminate?: boolean;
}) {
  const card = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const back = document.activeElement as HTMLElement | null;
    const el = card.current;
    el?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key !== 'Tab' || !el) return;
      const f = [...el.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex="0"]')];
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    addEventListener('keydown', key);
    document.body.classList.add('modal-open');
    return () => {
      removeEventListener('keydown', key);
      document.body.classList.remove('modal-open');
      back?.focus?.({ preventScroll: true });
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <div className={`modal-scrim${illuminate ? ' illuminate' : ''}`} onClick={onClose}>
      {/* Light beams (Elements/elements/beam-sweep.html) sweep behind the card. */}
      {illuminate && (
        <div className="beams" aria-hidden>
          <i />
          <i />
          <i />
        </div>
      )}
      <div
        className={`modal${wide ? ' wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        ref={card}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal-close icon-btn" onClick={onClose} aria-label="Close">
          ✕
        </button>
        {children}
      </div>
    </div>,
    document.body,
  );
}
