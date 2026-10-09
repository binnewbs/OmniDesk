'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireUserOrThrow } from '@/lib/supabase/auth';
import { RepositoryError } from '@/lib/supabase/errors';
import { revalidateAll } from '@/lib/revalidate';
import { uploadAvatar } from '@/lib/repositories/profiles';
import { AVATAR_MAX_BYTES } from '@/lib/constants';
import { fieldErrors } from '@/lib/validation/auth';
import { profileSetupMetadata } from '@/lib/profile-setup-state';
import { z } from 'zod';
import { skipProfileSetupAction } from '@/lib/actions/auth';

export { skipProfileSetupAction };

export interface ProfileSetupState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

const schema = z.object({
  bio: z.string().max(280, 'Bio must be at most 280 characters'),
});

/**
 * "Continue to dashboard" for step 2 of signup. Handles the avatar upload in
 * the same action so a single submit covers the whole step.
 */
export async function completeProfileSetupAction(
  _prev: ProfileSetupState,
  formData: FormData,
): Promise<ProfileSetupState> {
  const parsed = schema.safeParse({ bio: formData.get('bio') ?? '' });
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const user = await requireUserOrThrow();
  const supabase = await createClient();

  const patch: { bio: string; avatar?: string | null } = { bio: parsed.data.bio };

  const file = formData.get('avatar');
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith('image/')) {
      return { ok: false, message: 'Choose an image file.' };
    }
    if (file.size > AVATAR_MAX_BYTES) {
      return { ok: false, message: 'Image must be 2 MB or smaller.' };
    }

    try {
      // Compress on the client before it gets here, so this is a small file.
      patch.avatar = await uploadAvatar(user.id, file);
    } catch (error) {
      if (error instanceof RepositoryError) {
        return { ok: false, message: 'Could not upload that photo. Try a different one.' };
      }
      throw error;
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', user.id);

  if (error) return { ok: false, message: 'Could not save your profile. Try again.' };

  // Clear the onboarding flag so the app-shell guard stops redirecting here.
  const { error: metaError } = await supabase.auth.updateUser({ data: profileSetupMetadata() });
  if (metaError) return { ok: false, message: 'Could not finish setup. Try again.' };

  await revalidateAll();
  redirect('/dashboard');
}