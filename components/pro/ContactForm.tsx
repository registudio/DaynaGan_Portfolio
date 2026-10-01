'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from './Toasts';

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

  if (variant === 'pro') return <ProForm reasons={reasons} success={success} email={email} onSent={onSent} submitLabel={submitLabel} />;

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

const DRAFT = 'dg-contact-draft';
const FIELDS = ['reason', 'name', 'email', 'company', 'role', 'message'] as const;
const MAX = 5000;

/** Checks one field; returns the message to show, or '' when it's fine. */
function check(name: string, value: string): string {
  const v = value.trim();
  if (name === 'name') return v ? '' : 'Please add your name.';
  if (name === 'email') return !v ? 'Please add your email.' : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'That email doesn’t look right.';
  if (name === 'message') return v.length >= 5 ? '' : 'A few more words, please (5 characters minimum).';
  return '';
}

/**
 * Professional-mode form: inquiry chips, floating labels, validation as you leave each field,
 * a character counter, and a draft saved in this browser until it's sent.
 */
function ProForm({
  reasons,
  success,
  email,
  onSent,
  submitLabel,
}: {
  reasons: string[];
  success: string;
  email: string;
  onSent?: () => void;
  submitLabel: string;
}) {
  const form = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [error, setError] = useState<ContactResult | null>(null);
  const [reason, setReason] = useState(reasons[0] ?? '');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [count, setCount] = useState(0);
  const [restored, setRestored] = useState(false);
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore a saved draft (uncontrolled inputs: values are written straight into the form).
  useEffect(() => {
    const f = form.current;
    if (!f) return;
    let draft: Record<string, string> | null = null;
    try {
      draft = JSON.parse(localStorage.getItem(DRAFT) || 'null');
    } catch {}
    if (!draft || !Object.values(draft).some((v) => v && v !== draft!.reason)) return;
    for (const k of FIELDS) {
      if (k === 'reason') {
        if (draft.reason && reasons.includes(draft.reason)) setReason(draft.reason);
        continue;
      }
      const el = f.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${k}"]`);
      if (el && draft[k]) el.value = draft[k];
    }
    setCount((draft.message ?? '').length);
    setRestored(true);
  }, [reasons, status]);

  const save = () => {
    if (saveT.current) clearTimeout(saveT.current);
    saveT.current = setTimeout(() => {
      const f = form.current;
      if (!f) return;
      const data = Object.fromEntries(new FormData(f).entries()) as Record<string, string>;
      const draft = Object.fromEntries(FIELDS.map((k) => [k, data[k] ?? '']));
      try {
        const first = !localStorage.getItem(DRAFT);
        localStorage.setItem(DRAFT, JSON.stringify(draft));
        if (first) toast('Draft saved in this browser');
      } catch {}
    }, 400);
  };
  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT);
    } catch {}
  };

  const onBlur = (e: React.FocusEvent<HTMLFormElement>) => {
    const t = e.target as unknown as HTMLInputElement;
    if (!t.name || !['name', 'email', 'message'].includes(t.name)) return;
    setErrors((x) => ({ ...x, [t.name]: check(t.name, t.value) }));
  };
  const onInput = (e: React.FormEvent<HTMLFormElement>) => {
    const t = e.target as unknown as HTMLInputElement;
    if (t.name === 'message') setCount(t.value.length);
    // Errors clear as soon as the field becomes valid (they only appear on leaving a field).
    if (errors[t.name] && !check(t.name, t.value)) setErrors((x) => ({ ...x, [t.name]: '' }));
    save();
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = e.currentTarget;
    const next: Record<string, string> = {};
    for (const k of ['name', 'email', 'message']) next[k] = check(k, f.querySelector<HTMLInputElement>(`[name="${k}"]`)?.value ?? '');
    setErrors(next);
    const bad = Object.keys(next).find((k) => next[k]);
    if (bad) {
      f.querySelector<HTMLElement>(`[name="${bad}"]`)?.focus();
      return;
    }
    setStatus('sending');
    const result = await sendContact(f);
    if (result.ok) {
      clearDraft();
      toast('Message sent — thank you!');
      setStatus('sent');
      setRestored(false);
      setCount(0);
      onSent?.();
    } else {
      setStatus('error');
      setError(result);
    }
  };

  if (status === 'sent')
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

  return (
    <form
      ref={form}
      className={`form pro-form${status === 'sending' ? ' sending' : ''}`}
      onSubmit={submit}
      onBlur={onBlur}
      onInput={onInput}
      noValidate
    >
      {restored && (
        <p className="draft-note" role="status">
          Draft restored from your last visit.{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              form.current?.reset();
              clearDraft();
              setRestored(false);
              setCount(0);
              setErrors({});
            }}
          >
            Clear it
          </button>
        </p>
      )}
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
        <Float name="name" label="Name" required maxLength={100} autoComplete="name" error={errors.name} />
        <Float name="email" label="Email" type="email" required maxLength={200} autoComplete="email" error={errors.email} />
      </div>
      <div className="row">
        <Float name="company" label="Company (optional)" maxLength={120} autoComplete="organization" />
        <Float name="role" label="Role (optional)" maxLength={120} autoComplete="organization-title" />
      </div>
      <div className="float-wrap">
        <label className="float">
          <textarea
            name="message"
            required
            minLength={5}
            maxLength={MAX}
            placeholder=" "
            aria-invalid={!!errors.message || undefined}
            aria-describedby={`message-count${errors.message ? ' message-err' : ''}`}
          />
          <span>Message</span>
        </label>
        <span id="message-count" className={`char-count mono${count > MAX * 0.9 ? ' near' : ''}`}>
          {count.toLocaleString()} / {MAX.toLocaleString()}
        </span>
        {errors.message && (
          <span id="message-err" className="field-err">
            {errors.message}
          </span>
        )}
      </div>
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
}

function Float({ label, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  const errId = `${props.name}-err`;
  return (
    <div className="float-wrap">
      <label className="float">
        <input {...props} placeholder=" " aria-invalid={!!error || undefined} aria-describedby={error ? errId : undefined} />
        <span>{label}</span>
      </label>
      {error && (
        <span id={errId} className="field-err">
          {error}
        </span>
      )}
    </div>
  );
}
