import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getUser } from '@/lib/supabase/server';
import { ResetPasswordForm } from '@/components/features/auth/ResetPasswordForm';

export const metadata: Metadata = { title: 'Reset password — Productivity Manager' };

export default async function ResetPasswordPage() {
  const user = await getUser();
  // /auth/confirm verifies the token_hash and establishes a recovery session;
  // without it there is nothing to reset.
  if (!user) redirect('/login');

  return <ResetPasswordForm />;
}