/**
 * Route protection and redirect logic for authentication lifecycle.
 * Centralizes redirect decisions between public auth screens and protected app screens.
 */

export const AUTH_ROUTE = '/(auth)/login';
export const TABS_ROUTE = '/(tabs)';

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
 * 3. If authenticated and inside (auth) group, redirect to /(tabs).
 * 4. Otherwise, return null (stay on current route).
 *
 * @param isAuthenticated - Whether the user is currently authenticated
 * @param segments - Array of route segments from Expo Router's useSegments()
 * @param loading - Optional flag indicating if auth state is resolving (defaults to false)
 * @returns Target route string if redirect is needed, or null if no redirect
 */
export function getAuthRedirect(
  isAuthenticated: boolean,
  segments: readonly string[] | string[],
  loading: boolean = false
): string | null {
  if (loading) {
    return null;
  }

  const inAuth = isInAuthGroup(segments);

  if (!isAuthenticated && !inAuth) {
    return AUTH_ROUTE;
  }

  if (isAuthenticated && inAuth) {
    return TABS_ROUTE;
  }

  return null;
}
