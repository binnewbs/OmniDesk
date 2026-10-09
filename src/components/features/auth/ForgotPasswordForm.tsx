'use client';

import { useActionState } from 'react';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { forgotPasswordAction, type FormState } from '@/lib/actions/auth';
import s from './LoginForm.module.css';

const initial: FormState = { ok: false };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initial);

  if (state.ok) {
    return (
      <div className={s.form}>
        <header className={s.head}>
          <span className="icon-tile" aria-hidden>
            <MailCheck size={18} strokeWidth={2} />
          </span>
          <h1 className="t-title">Check your email</h1>
          <p className="subtitle">{state.message}</p>
        </header>
        <Link href="/login" className="t-link" style={{ alignSelf: 'center' }}>
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className={s.form} noValidate>
      <header className={s.head}>
        <h1 className="t-title">Reset your password</h1>
        <p className="subtitle">We will email you a link to choose a new one.</p>
      </header>

      {state.message && (
        <div className="alert alert--error" role="alert">
          {state.message}
        </div>
      )}

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
        error={state.errors?.email}
      />

      <Button type="submit" variant="primary" full loading={pending}>
        Send reset link
      </Button>
    </form>
  );
}