'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { signUpAction, type FormState } from '@/lib/actions/auth';
import s from './LoginForm.module.css';

const initial: FormState = { ok: false };

export function SignupForm() {
  const [state, action, pending] = useActionState(signUpAction, initial);
  const [showPassword, setShowPassword] = useState(false);

  // Email confirmation is enabled: no session yet, so the user waits for a link.
  if (state.ok && state.message === 'check-inbox') {
    return (
      <div className={s.form}>
        <header className={s.head}>
          <h1 className="t-title">Check your inbox</h1>
          <p className="subtitle">
            We sent a confirmation link to your email. Open it to finish creating your account.
          </p>
        </header>
        <p className={s.switch}>
          Already confirmed?{' '}
          <Link href="/login" className="t-link">
            Sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <form action={action} className={s.form} noValidate>
      <header className={s.head}>
        <h1 className="t-title">Create your account</h1>
        <p className="subtitle">Start organizing money, classes and notes</p>
      </header>

      {state.message && (
        <div className="alert alert--error" role="alert">
          {state.message}
        </div>
      )}

      <Input
        label="Username"
        name="username"
        autoComplete="username"
        placeholder="Username"
        required
        error={state.errors?.username}
        hint="Shown on your sidebar and dashboard greeting."
      />

      <Input
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
        error={state.errors?.email}
      />

      <div className={s.passwordBlock}>
        <Input
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="Password"
          required
          error={state.errors?.password}
          hint="At least 8 characters."
        />
        <button
          type="button"
          className={`icon-btn icon-btn--plain ${s.reveal}`}
          onClick={() => setShowPassword((v) => !v)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff size={18} strokeWidth={2} aria-hidden /> : <Eye size={18} strokeWidth={2} aria-hidden />}
        </button>
      </div>

      <Input
        label="Confirm password"
        name="confirmPassword"
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
        placeholder="Repeat password"
        required
        error={state.errors?.confirmPassword}
      />

      <Button type="submit" variant="primary" full loading={pending}>
        Create account
      </Button>

      <p className={s.switch}>
        Already have an account?{' '}
        <Link href="/login" className="t-link">
          Sign in
        </Link>
      </p>
    </form>
  );
}