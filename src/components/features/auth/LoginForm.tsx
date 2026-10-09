'use client';

import { useActionState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { signInAction, type FormState } from '@/lib/actions/auth';
import s from './LoginForm.module.css';

const initial: FormState = { ok: false };

export function LoginForm({ error }: { error?: string }) {
  const [state, action, pending] = useActionState(signInAction, initial);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={action} className={s.form} noValidate>
      <header className={s.head}>
        <h1 className="t-title">Welcome back</h1>
        <p className="subtitle">Sign in to your account to continue</p>
      </header>

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}
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

      <div className={s.passwordBlock}>
        <Input
          label="Password"
          name="password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="Password"
          required
          error={state.errors?.password}
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

      <Link href="/forgot-password" className={`t-link ${s.forgot}`}>
        Forgot password?
      </Link>

      <Button type="submit" variant="primary" full loading={pending}>
        Sign in
      </Button>

      <p className={s.switch}>
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="t-link">
          Create account
        </Link>
      </p>
    </form>
  );
}