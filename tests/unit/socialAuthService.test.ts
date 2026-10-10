import {
  isAppleAuthAvailable,
  isGoogleAuthConfigured,
} from '../../src/services/socialAuthService';

describe('socialAuthService config helpers', () => {
  test('isGoogleAuthConfigured is false without client ids', () => {
    expect(isGoogleAuthConfigured({})).toBe(false);
  });

  test('isGoogleAuthConfigured is true when a client id is set', () => {
    expect(
      isGoogleAuthConfigured({
        EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: 'web-client.apps.googleusercontent.com',
      })
    ).toBe(true);
  });

  test('isAppleAuthAvailable is true only on iOS', () => {
    expect(isAppleAuthAvailable('ios')).toBe(true);
    expect(isAppleAuthAvailable('android')).toBe(false);
    expect(isAppleAuthAvailable('web')).toBe(false);
  });
});
