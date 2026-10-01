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
  variant = 'game',
}: {
  reasons: string[];
  success: string;
  email: string;
  onSent?: () => void;
  submitLabel?: string;
  /** `pro` = inquiry chips, floating labels and a send animation. */
  variant?: 'game' | 'pro';
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<ContactResult | null>(null);
  const [reason, setReason] = useState(reasons[0] ?? '');

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

  if (status === 'sent' && variant === 'pro')
    return (
      <div role="status" className="sent-card">
        <svg className="plane-send" viewBox="0 0 64 64" aria-hidden>
          <path d="M6 30 58 8 44 56 30 38z" />
          <path d="M30 38 58 8" />
        </svg>
        <b>Message sent.</b>
        <p>{success || 'Thanks — message received.'}</p>
        <button className="btn small" onClick={() => setStatus('idle')}>
          Send another
        </button>
      </div>
    );

  if (variant === 'pro')
    return (
      <form className={`form pro-form${status === 'sending' ? ' sending' : ''}`} onSubmit={submit}>
        <fieldset className="inquiry">
          <legend>What&apos;s it about?</legend>
          <div className="chips">
            {reasons.map((r) => (
              <label key={r} className={`fchip${reason === r ? ' on' : ''}`}>
                <input type="radio" name="reason" value={r} checked={reason === r} onChange={() => setReason(r)} />
                {r}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="row">
          <Float name="name" label="Name" required maxLength={100} autoComplete="name" />
          <Float name="email" label="Email" type="email" required maxLength={200} autoComplete="email" />
        </div>
        <div className="row">
          <Float name="company" label="Company (optional)" maxLength={120} autoComplete="organization" />
          <Float name="role" label="Role (optional)" maxLength={120} autoComplete="organization-title" />
        </div>
        <label className="float">
          <textarea name="message" required minLength={5} maxLength={5000} placeholder=" " />
          <span>Message</span>
        </label>
        <label className="hp" aria-hidden>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn primary send-btn" disabled={status === 'sending'}>
            <span>{status === 'sending' ? 'Sending…' : `${submitLabel} ↗`}</span>
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

function Float({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="float">
      <input {...props} placeholder=" " />
      <span>{label}</span>
    </label>
  );
}
