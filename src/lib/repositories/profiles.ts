import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { requireUserOrThrow } from '@/lib/supabase/auth';
import { RepositoryError } from '@/lib/supabase/errors';
import { revalidate } from '@/lib/revalidate';
import { AVATAR_BUCKET, AVATAR_MAX_BYTES } from '@/lib/constants';
import { createId } from '@/lib/utils/id';
import type { Profile } from '@/types/domain';
import type { TableInsert, TableUpdate } from '@/lib/supabase/types';

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw new RepositoryError('profiles.get', error);
  return data;
}

/**
 * Safe in both worlds: whether the signup trigger created the row or not, an
 * upsert leaves exactly one profile row behind.
 */
export async function ensureProfile(userId: string, username: string): Promise<Profile> {
  const supabase = await createClient();
  const row: TableInsert<'profiles'> = { user_id: userId, username, bio: '' };

  const { data, error } = await supabase
    .from('profiles')
    .upsert(row, { onConflict: 'user_id' })
    .select()
    .single();

  if (error) throw new RepositoryError('profiles.ensure', error);
  return data;
}

export interface UpdateProfileInput {
  username?: string;
  bio?: string;
  avatar?: string | null;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  const supabase = await createClient();
  await requireUserOrThrow();

  const patch: TableUpdate<'profiles'> = {};
  if (input.username !== undefined) patch.username = input.username;
  // bio is NOT NULL, so "skip" writes an empty string rather than null.
  if (input.bio !== undefined) patch.bio = input.bio;
  if (input.avatar !== undefined) patch.avatar = input.avatar;

  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('user_id', userId)
    .select()
    .single();

  if (error) throw new RepositoryError('profiles.update', error);

  await revalidate(['/profile', '/dashboard', '/']);
  return data;
}

/**
 * Uploads to `avatars/<user_id>/<uuid><ext>` and returns the public URL.
 * The RLS policy on storage.objects only allows writes under your own folder,
 * so a user cannot overwrite another user's avatar.
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = await createClient();
  await requireUserOrThrow();

  if (!file.type.startsWith('image/')) {
    throw new RepositoryError('profiles.uploadAvatar: not an image');
  }
  if (file.size > AVATAR_MAX_BYTES) {
    throw new RepositoryError('profiles.uploadAvatar: file too large');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
  const path = `${userId}/${createId()}.${ext}`;

  const { error } = await supabase.storage
    .from(AVATAR_BUCKET)
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });

  if (error) throw new RepositoryError('profiles.uploadAvatar', error);

  const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Username is display-only: the schema has no unique constraint (PLAN.md §15). */
export async function usernameExistsExcept(userId: string, username: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('username', username)
    .neq('user_id', userId)
    .limit(1);

  if (error) throw new RepositoryError('profiles.usernameExists', error);
  return (data?.length ?? 0) > 0;
}