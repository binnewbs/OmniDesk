import type { Metadata } from 'next';
import { LoginForm } from '@/components/features/auth/LoginForm';

export const metadata: Metadata = { title: 'Sign in — OmniDesk' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message =
    error === 'verification'
      ? 'That confirmation link is invalid or has expired.'
      : undefined;

  return <LoginForm error={message} />;
}