import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * iOS draws a blur/fade under the status bar of home-screen web apps that
 * reaches a little past the bar itself. Web content can't disable it, so we
 * push header contents below it instead.
 */
export const IOS_PWA_HEADER_CLEARANCE = 12;

type NavigatorLike = { standalone?: boolean } | undefined;

export function isIosStandaloneWeb(
  nav: NavigatorLike = typeof navigator !== 'undefined' ? (navigator as NavigatorLike) : undefined,
  os: string = Platform.OS
): boolean {
  return os === 'web' && nav?.standalone === true;
}

export function getIosPwaHeaderOptions(
  topInset: number,
  isIosPwa: boolean = isIosStandaloneWeb()
): { headerStatusBarHeight?: number } {
  return isIosPwa ? { headerStatusBarHeight: topInset + IOS_PWA_HEADER_CLEARANCE } : {};
}

export function useIosPwaHeaderOptions(): { headerStatusBarHeight?: number } {
  const insets = useSafeAreaInsets();
  return getIosPwaHeaderOptions(insets.top);
}
