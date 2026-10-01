'use client';

import { useState } from 'react';
import { toast } from './Toasts';

/** The email address as a big button: one click copies it (with a toast), with a mail link beside it. */
export default function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
    } catch {
      const t = document.createElement('textarea');
      t.value = email;
      document.body.append(t);
      t.select();
      document.execCommand('copy');
      t.remove();
    }
    setCopied(true);
    toast('Email copied to clipboard');
    setTimeout(() => setCopied(false), 2200);
  };
  return (
    <div className="copy-email">
      <button className="copy-btn" onClick={copy} aria-label={`Copy ${email}`}>
        <span className="mono">{email}</span>
        <span className="copy-icon" aria-hidden>
          {copied ? '✓' : '⧉'}
        </span>
      </button>
      <a className="btn small" href={`mailto:${email}`}>
        ✉ Open mail app
      </a>
    </div>
  );
}
