'use server';

import { createClient } from '@/lib/supabase/server';
import { requireUserOrThrow } from '@/lib/supabase/auth';
import { RepositoryError } from '@/lib/supabase/errors';
import { revalidate } from '@/lib/revalidate';
import { uploadAvatar } from '@/lib/repositories/profiles';
import { AVATAR_MAX_BYTES } from '@/lib/constants';
import { fieldErrors, profileSchema } from '@/lib/validation/auth';

export interface ActionState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

/** Saves the profile screen: username, bio, and an optional avatar upload. */
export async function saveProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = profileSchema.safeParse({
    username: formData.get('username'),
    bio: formData.get('bio') ?? '',
  });

  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };

  const user = await requireUserOrThrow();
  const supabase = await createClient();

  const patch: { username: string; bio: string; avatar?: string } = {
    username: parsed.data.username,
    bio: parsed.data.bio,
  };

  const file = formData.get('avatar');
  if (file instanceof File && file.size > 0) {
    if (!file.type.startsWith('image/')) {
      return { ok: false, errors: { avatar: 'Choose an image file.' } };
    }
    if (file.size > AVATAR_MAX_BYTES) {
      return { ok: false, errors: { avatar: 'Image must be 2 MB or smaller.' } };
    }

    try {
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

  if (error) {
    return { ok: false, message: 'Could not save your profile. Try again.' };
  }

  // '/' is included because the sidebar renders the avatar and username.
  await revalidate(['/profile', '/dashboard', '/']);
  return { ok: true };
}