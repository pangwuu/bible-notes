/**
 * Route protection and redirect logic for authentication lifecycle.
 * Centralizes redirect decisions between public auth screens and protected app screens.
 */

export const AUTH_ROUTE = '/(auth)/login';
export const TABS_ROUTE = '/(tabs)';
export const COMPLETE_PROFILE_ROUTE = '/(auth)/complete-profile';

/**
 * Checks whether the current route segments belong to the (auth) group.
 *
 * @param segments - Array of route segments from Expo Router's useSegments()
 * @returns true if the root segment is '(auth)', false otherwise
 */
export function isInAuthGroup(segments: readonly string[] | string[]): boolean {
  return Array.isArray(segments) && segments.length > 0 && segments[0] === '(auth)';
}

/**
 * Determines whether an authentication-based redirect is required.
 *
 * Redirect rules:
 * 1. While loading is true, returns null (do not redirect while resolving).
 * 2. If unauthenticated and outside (auth) group, redirect to /(auth)/login.
 * 3. If authenticated without a completed profile (username), redirect to complete-profile
 *    (unless already on register or complete-profile).
 * 4. If authenticated with completed profile and inside (auth) group, redirect to /(tabs).
 * 5. Otherwise, return null (stay on current route).
 */
export function getAuthRedirect(
  isAuthenticated: boolean,
  segments: readonly string[] | string[],
  loading: boolean = false,
  hasCompletedProfile: boolean = true
): string | null {
  if (loading) {
    return null;
  }

  const inAuth = isInAuthGroup(segments);
  const authScreen =
    Array.isArray(segments) && segments.length > 1 ? String(segments[1]) : '';

  if (!isAuthenticated && !inAuth) {
    return AUTH_ROUTE;
  }

  if (isAuthenticated && !hasCompletedProfile) {
    if (authScreen === 'complete-profile' || authScreen === 'register') {
      return null;
    }
    return COMPLETE_PROFILE_ROUTE;
  }

  if (isAuthenticated && inAuth) {
    return TABS_ROUTE;
  }

  return null;
}
