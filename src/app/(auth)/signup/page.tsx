import type { Metadata } from 'next';
import { SignupForm } from '@/components/features/auth/SignupForm';

export const metadata: Metadata = { title: 'Sign up — OmniDesk' };

export default function SignupPage() {
  return <SignupForm />;
}