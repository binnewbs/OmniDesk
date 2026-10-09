/**
 * Two-step onboarding state lives in auth user metadata, not in the database.
 *
 * The obvious signal — "is profiles.username empty?" — does not work, because
 * the signup trigger already fills username from the signup form. The schema
 * has no "onboarding complete" column and adding one is out of bounds, so the
 * marker is `user_metadata.profile_setup_complete`, which costs no column.
 */

export const PROFILE_SETUP_KEY = 'profile_setup_complete';

export function isProfileSetupComplete(user: {
  user_metadata?: Record<string, unknown> | null;
}): boolean {
  return user.user_metadata?.[PROFILE_SETUP_KEY] === 'true';
}

export function profileSetupMetadata(): Record<string, string> {
  return { [PROFILE_SETUP_KEY]: 'true' };
}