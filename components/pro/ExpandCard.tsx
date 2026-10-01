'use client';

import { useState } from 'react';
import Modal from './Modal';

/**
 * A compact card whose "Read more" opens the full details in a modal (no scrolling inside cards).
 * `interactive`: the whole card opens the modal and a border draws itself around it on hover.
 */
export default function ExpandCard({
  title,
  summary,
  details,
  className = '',
  interactive = false,
  illuminate = false,
}: {
  title: string;
  summary: React.ReactNode;
  details?: React.ReactNode;
  className?: string;
  interactive?: boolean;
  illuminate?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const live = interactive && !!details;
  return (
    <div
      className={`${className}${live ? ' expand-live' : ''}`}
      onClick={
        live
          ? (e) => {
              // Links and buttons inside the card keep their own behaviour.
              if ((e.target as Element).closest('a, button')) return;
              setOpen(true);
            }
          : undefined
      }
    >
      {live && (
        <svg className="border-draw" aria-hidden preserveAspectRatio="none">
          <rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="19" pathLength={1} />
        </svg>
      )}
      {summary}
      {details && (
        <>
          <button className="btn small more-btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
            Read more <span aria-hidden>↗</span>
          </button>
          <Modal open={open} onClose={() => setOpen(false)} label={title} wide illuminate={illuminate}>
            {details}
          </Modal>
        </>
      )}
    </div>
  );
}
