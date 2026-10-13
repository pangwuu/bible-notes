import { Platform } from 'react-native';
import { colors } from '../constants/theme';

/** Default document/Safari chrome on auth & loading screens. */
export const WEB_THEME_CHROME_AUTH = colors.bg.base;

/** Safari chrome when logged into the main app (matches header/tab bar). */
export const WEB_THEME_CHROME_APP = colors.bg.surface;

export function resolveWebThemeChromeColor(isLoggedIntoApp: boolean): string {
  return isLoggedIntoApp ? WEB_THEME_CHROME_APP : WEB_THEME_CHROME_AUTH;
}

/**
 * Updates Safari toolbar / overscroll canvas color on web.
 * No-op on native platforms unless an explicit document is passed (tests).
 */
export function applyWebThemeChrome(color: string, doc?: Document | null): void {
  const targetDoc =
    doc !== undefined
      ? doc
      : Platform.OS === 'web' && typeof document !== 'undefined'
        ? document
        : null;

  if (!targetDoc) {
    return;
  }

  const activeDoc = targetDoc;

  const root = activeDoc.documentElement;
  const body = activeDoc.body;
  const appRoot = activeDoc.getElementById('root');

  if (root) {
    root.style.backgroundColor = color;
  }
  if (body) {
    body.style.backgroundColor = color;
  }
  if (appRoot) {
    appRoot.style.backgroundColor = color;
  }

  let themeMeta = activeDoc.querySelector('meta[name="theme-color"]');
  if (!themeMeta) {
    themeMeta = activeDoc.createElement('meta');
    themeMeta.setAttribute('name', 'theme-color');
    activeDoc.head?.appendChild(themeMeta);
  }
  themeMeta.setAttribute('content', color);
}
