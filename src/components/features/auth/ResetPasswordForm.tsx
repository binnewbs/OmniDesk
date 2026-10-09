'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { resetPasswordAction, type FormState } from '@/lib/actions/auth';
import s from './LoginForm.module.css';

const initial: FormState = { ok: false };

/**
 * Reached only with a recovery session, which /auth/confirm establishes by
 * verifying the token_hash from the reset email.
 */
export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(resetPasswordAction, initial);

  return (
    <form action={action} className={s.form} noValidate>
      <header className={s.head}>
        <h1 className="t-title">Choose a new password</h1>
        <p className="subtitle">You will be signed in once it is saved.</p>
      </header>

      {state.message && (
        <div className="alert alert--error" role="alert">
          {state.message}
        </div>
      )}

      <Input
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Password"
        required
        error={state.errors?.password}
        hint="At least 8 characters."
      />

      <Input
        label="Confirm new password"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        placeholder="Repeat password"
        required
        error={state.errors?.confirmPassword}
      />

      <Button type="submit" variant="primary" full loading={pending}>
        Save password
      </Button>

      <p className={s.switch}>
        <Link href="/login" className="t-link">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}