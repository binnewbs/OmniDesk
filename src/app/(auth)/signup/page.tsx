import type { Metadata } from 'next';
import { SignupForm } from '@/components/features/auth/SignupForm';

export const metadata: Metadata = { title: 'Sign up — Productivity Manager' };

export default function SignupPage() {
  return <SignupForm />;
}