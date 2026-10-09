'use server';

import { redirect } from 'next/navigation';
import { createClient, getUser } from '@/lib/supabase/server';
import { RepositoryError } from '@/lib/supabase/errors';
import { revalidateAll } from '@/lib/revalidate';
import { ensureProfile } from '@/lib/repositories/profiles';
import { signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, fieldErrors } from '@/lib/validation/auth';
import { PROFILE_SETUP_KEY, isProfileSetupComplete, profileSetupMetadata } from '@/lib/profile-setup-state';

export interface FormState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

const siteUrl = () =>
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ?? 'http://localhost:3000';

/** Maps Supabase auth errors onto copy a student can act on. */
function authMessage(error: { message: string; code?: string }): string {
  const msg = error.message.toLowerCase();
  if (msg.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (msg.includes('email not confirmed')) return 'Confirm your email before signing in.';
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'An account with that email already exists.';
  }
  if (msg.includes('password should be')) return 'Password is too weak. Use at least 8 characters.';
  if (msg.includes('rate limit')) return 'Too many attempts. Try again in a moment.';
  if (msg.includes('failed to fetch')) return 'Could not reach the server. Check your connection.';
  return 'Something went wrong. Please try again.';
}

export async function signUpAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signupSchema.safeParse({
    username: formData.get('username'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const { username, email, password } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // username seeds the profile row via the trigger; the second flag marks
      // step 2 of onboarding as not yet done (see lib/profile-setup-state.ts).
      data: { username, [PROFILE_SETUP_KEY]: 'false' },
      emailRedirectTo: `${siteUrl()}/auth/confirm`,
    },
  });

  if (error) return { ok: false, message: authMessage(error) };

  // Email confirmation enabled: no session yet, so stop and wait for the link.
  if (!data.session || !data.user) {
    return { ok: true, message: 'check-inbox' };
  }

  // Confirmation disabled (local dev): the trigger already made the profile row.
  await ensureProfile(data.user.id, username);
  await revalidateAll();
  redirect('/profile-setup');
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return { ok: false, message: authMessage(error) };

  const user = data.user;
  if (!user) return { ok: false, message: 'Sign-in failed. Please try again.' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('user_id', user.id)
    .maybeSingle();

  // A profile row missing here means the signup trigger did not fire; create
  // it so the shell and profile-setup always have a row to read (PLAN.md §7.3).
  if (!profile) {
    await ensureProfile(user.id, user.email?.split('@')[0] ?? 'student');
  }

  // Self-heal the onboarding flag for accounts that predate it: a profile row
  // with a username belongs to someone who already finished step 2.
  const onboarded = isProfileSetupComplete(user) || Boolean(profile?.username?.trim());
  if (onboarded && !isProfileSetupComplete(user)) {
    await supabase.auth.updateUser({ data: profileSetupMetadata() });
  }

  await revalidateAll();
  redirect(onboarded ? '/dashboard' : '/profile-setup');
}

export async function forgotPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get('email') });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/confirm?type=recovery`,
  });

  if (error) return { ok: false, message: authMessage(error) };

  return { ok: true, message: 'Check your inbox for the reset link.' };
}

export async function resetPasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) return { ok: false, message: authMessage(error) };

  await revalidateAll();
  redirect('/dashboard');
}

/** "Skip for now" still writes bio = '' because the column is NOT NULL. */
export async function skipProfileSetupAction(): Promise<void> {
  const supabase = await createClient();
  const user = await getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('profiles')
    .upsert({ user_id: user.id, bio: '' }, { onConflict: 'user_id' });

  if (error) throw new RepositoryError('profiles.skipSetup', error);

  // Mark step 2 done, or the guard would bounce the user back to this page.
  await supabase.auth.updateUser({ data: profileSetupMetadata() });

  await revalidateAll();
  redirect('/dashboard');
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  await revalidateAll();
  redirect('/login');
}