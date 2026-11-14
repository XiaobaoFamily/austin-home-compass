import type { SupabaseClient } from '@supabase/supabase-js';

// Stable, reserved internal identifiers. No emails are sent to this domain.
// Supabase still owns password hashing, verification, rate limiting and sessions.
const AUTH_DOMAIN = 'accounts.home-compass.invalid';
export const USERNAME_PATTERN = String.raw`[A-Za-z0-9][A-Za-z0-9_\-]{2,31}`;

export function usernameToAuthEmail(username: string): string {
  const normalized = username.trim().toLowerCase();
  if (!new RegExp(`^${USERNAME_PATTERN}$`).test(normalized)) {
    throw new Error('用户名需为 3–32 位英文字母、数字、下划线或短横线，并以字母或数字开头。');
  }
  return `${normalized}@${AUTH_DOMAIN}`;
}

export function signInWithUsername(
  auth: Pick<SupabaseClient['auth'], 'signInWithPassword'>,
  username: string,
  password: string,
) {
  // Never trim, normalize, persist or log passwords in application code.
  return auth.signInWithPassword({ email: usernameToAuthEmail(username), password });
}
