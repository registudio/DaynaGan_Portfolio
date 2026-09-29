'use client';

import { useState } from 'react';

export type ContactResult = { ok: true } | { ok: false; error: string; fallback?: string };

export async function sendContact(form: HTMLFormElement): Promise<ContactResult> {
  const data = Object.fromEntries(new FormData(form).entries());
  try {
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (res.ok) return { ok: true };
    return { ok: false, error: json.error || 'Something went wrong.', fallback: json.fallback };
  } catch {
    return { ok: false, error: 'Network error — check your connection.' };
  }
}

/** Shared by Professional mode and the game's Transmission Console. */
export default function ContactForm({
  reasons,
  success,
  email,
  onSent,
  submitLabel = 'Send message',
}: {
  reasons: string[];
  success: string;
  email: string;
  onSent?: () => void;
  submitLabel?: string;
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<ContactResult | null>(null);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus('sending');
    const result = await sendContact(e.currentTarget);
    if (result.ok) {
      setStatus('sent');
      e.currentTarget?.reset?.();
      onSent?.();
    } else {
      setStatus('error');
      setError(result);
    }
  };

  if (status === 'sent')
    return (
      <div role="status" className="form-status ok" style={{ fontSize: 17 }}>
        {success || 'Thanks — message received.'}
      </div>
    );

  return (
    <form className="form" onSubmit={submit}>
      <div className="row">
        <label>
          Name
          <input name="name" required maxLength={100} autoComplete="name" />
        </label>
        <label>
          Email
          <input name="email" type="email" required maxLength={200} autoComplete="email" />
        </label>
      </div>
      <div className="row">
        <label>
          Company <span className="muted">(optional)</span>
          <input name="company" maxLength={120} autoComplete="organization" />
        </label>
        <label>
          Role <span className="muted">(optional)</span>
          <input name="role" maxLength={120} autoComplete="organization-title" />
        </label>
      </div>
      <label>
        Reason
        <select name="reason" defaultValue={reasons[0]}>
          {reasons.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </label>
      <label>
        Message
        <textarea name="message" required minLength={5} maxLength={5000} />
      </label>
      <label className="hp" aria-hidden>
        Website
        <input name="website" tabIndex={-1} autoComplete="off" />
      </label>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <button className="btn primary" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : submitLabel}
        </button>
        {status === 'error' && error && !error.ok && (
          <span className="form-status err" role="alert">
            {error.error}{' '}
            <a href={error.fallback || `mailto:${email}`}>Email instead</a>
          </span>
        )}
      </div>
    </form>
  );
}
