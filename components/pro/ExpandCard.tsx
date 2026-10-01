'use client';

import { useState } from 'react';
import Modal from './Modal';

/** A compact card whose "Read more" opens the full details in a modal (no scrolling inside cards). */
export default function ExpandCard({
  title,
  summary,
  details,
  className = '',
}: {
  title: string;
  summary: React.ReactNode;
  details?: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      {summary}
      {details && (
        <>
          <button className="btn small more-btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
            Read more <span aria-hidden>↗</span>
          </button>
          <Modal open={open} onClose={() => setOpen(false)} label={title} wide>
            {details}
          </Modal>
        </>
      )}
    </div>
  );
}
