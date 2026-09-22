import {
  getAuthRedirect,
  isInAuthGroup,
  AUTH_ROUTE,
  TABS_ROUTE,
} from '../../src/utils/authRouting';

describe('Auth Route Protection Redirect Matrix', () => {
  describe('getAuthRedirect', () => {
    test('when loading is true, returns null regardless of auth state or route', () => {
      expect(getAuthRedirect(false, ['(tabs)'], true)).toBeNull();
      expect(getAuthRedirect(true, ['(auth)', 'login'], true)).toBeNull();
      expect(getAuthRedirect(false, ['(auth)', 'login'], true)).toBeNull();
      expect(getAuthRedirect(true, ['(tabs)'], true)).toBeNull();
    });

    test('unauthenticated user outside (auth) redirects to /(auth)/login', () => {
      expect(getAuthRedirect(false, ['(tabs)'])).toBe('/(auth)/login');
      expect(getAuthRedirect(false, ['note', '1'])).toBe('/(auth)/login');
      expect(getAuthRedirect(false, ['notifications'])).toBe('/(auth)/login');
      expect(getAuthRedirect(false, ['friend', 'profile'])).toBe('/(auth)/login');
    });

    test('unauthenticated user inside (auth) does not redirect', () => {
      expect(getAuthRedirect(false, ['(auth)', 'login'])).toBeNull();
      expect(getAuthRedirect(false, ['(auth)', 'register'])).toBeNull();
    });

    test('authenticated user inside (auth) redirects to /(tabs)', () => {
      expect(getAuthRedirect(true, ['(auth)', 'login'])).toBe('/(tabs)');
      expect(getAuthRedirect(true, ['(auth)', 'register'])).toBe('/(tabs)');
    });

    test('authenticated user outside (auth) stays on current route (no redirect)', () => {
      expect(getAuthRedirect(true, ['(tabs)'])).toBeNull();
      expect(getAuthRedirect(true, ['note', '456'])).toBeNull();
      expect(getAuthRedirect(true, ['friend', '789'])).toBeNull();
      expect(getAuthRedirect(true, ['notifications'])).toBeNull();
    });

    test('empty segments array is treated as outside auth group', () => {
      expect(getAuthRedirect(false, [])).toBe('/(auth)/login');
      expect(getAuthRedirect(true, [])).toBeNull();
    });
  });

  describe('isInAuthGroup helper', () => {
    test('correctly identifies (auth) group', () => {
      expect(isInAuthGroup(['(auth)'])).toBe(true);
      expect(isInAuthGroup(['(auth)', 'login'])).toBe(true);
      expect(isInAuthGroup(['(auth)', 'register'])).toBe(true);
    });

    test('returns false for non-auth groups and empty array', () => {
      expect(isInAuthGroup(['(tabs)'])).toBe(false);
      expect(isInAuthGroup(['note', '1'])).toBe(false);
      expect(isInAuthGroup([])).toBe(false);
    });
  });

  describe('Route Constants', () => {
    test('AUTH_ROUTE and TABS_ROUTE match design specification', () => {
      expect(AUTH_ROUTE).toBe('/(auth)/login');
      expect(TABS_ROUTE).toBe('/(tabs)');
    });
  });
});
