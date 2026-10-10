'use server';

import { requireUserOrThrow } from '@/lib/supabase/auth';
import { RepositoryError } from '@/lib/supabase/errors';
import { revalidate } from '@/lib/revalidate';
import { updateProfile, uploadAvatar, type UpdateProfileInput } from '@/lib/repositories/profiles';
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

  const patch: UpdateProfileInput = {
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

  // Goes through the repository so the write carries the RepositoryError
  // wrapper like every other mutation, rather than reaching around it.
  try {
    await updateProfile(user.id, patch);
  } catch (error) {
    if (error instanceof RepositoryError) {
      return { ok: false, message: 'Could not save your profile. Try again.' };
    }
    throw error;
  }

  // '/' is included because the sidebar renders the avatar and username.
  await revalidate(['/profile', '/dashboard', '/']);
  return { ok: true };
}