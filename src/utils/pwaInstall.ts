/**
 * Helpers for guiding web users to install Bible Notes as a home-screen app.
 *
 * Chromium browsers (Chrome, Edge, Samsung Internet; Android and desktop) fire a
 * `beforeinstallprompt` event that lets us open the browser's own install dialog.
 * Safari (iOS and macOS) has no such event, so there we can only explain the
 * manual steps. public/index.html captures the event early into
 * window.__bnInstallPrompt.
 */

import { Platform } from 'react-native';

export type InstallPlatform =
  | 'ios-safari'
  | 'ios-other'
  | 'android'
  | 'desktop-chromium'
  | 'mac-safari'
  | 'firefox'
  | 'unknown';

export interface InstallStep {
  icon?: string;
  text: string;
}

export interface InstallGuide {
  platform: InstallPlatform;
  label: string;
  steps: InstallStep[];
  note?: string;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type InstallWindow = Window & { __bnInstallPrompt?: BeforeInstallPromptEvent | null };

const isWeb = () => Platform.OS === 'web' && typeof window !== 'undefined';

export function detectInstallPlatform(userAgent: string, maxTouchPoints = 0): InstallPlatform {
  const ua = userAgent || '';
  // iPadOS reports a desktop Mac user agent; touch support gives it away.
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && maxTouchPoints > 1);
  if (isIOS) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? 'ios-other' : 'ios-safari';
  if (/Android/.test(ua)) return 'android';
  if (/Firefox\//.test(ua)) return 'firefox';
  if (/Edg\/|Chrome\/|Chromium\//.test(ua)) return 'desktop-chromium';
  if (/Macintosh/.test(ua) && /Safari\//.test(ua)) return 'mac-safari';
  return 'unknown';
}

export function currentInstallPlatform(): InstallPlatform {
  if (!isWeb() || typeof navigator === 'undefined') return 'unknown';
  return detectInstallPlatform(navigator.userAgent, (navigator as any).maxTouchPoints || 0);
}

export function isRunningStandalone(): boolean {
  if (!isWeb()) return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  if (nav.standalone === true) return true;
  if (typeof window.matchMedia !== 'function') return false;
  return ['standalone', 'fullscreen', 'minimal-ui'].some(
    (mode) => window.matchMedia(`(display-mode: ${mode})`).matches
  );
}

export function hasInstallPrompt(): boolean {
  return isWeb() && Boolean((window as InstallWindow).__bnInstallPrompt);
}

/** Calls back when the browser makes its install dialog available or the app gets installed. */
export function subscribeToInstallChanges(callback: () => void): () => void {
  if (!isWeb()) return () => {};
  window.addEventListener('bn-install-prompt-ready', callback);
  window.addEventListener('bn-app-installed', callback);
  return () => {
    window.removeEventListener('bn-install-prompt-ready', callback);
    window.removeEventListener('bn-app-installed', callback);
  };
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!isWeb()) return 'unavailable';
  const win = window as InstallWindow;
  const event = win.__bnInstallPrompt;
  if (!event) return 'unavailable';
  await event.prompt();
  const { outcome } = await event.userChoice;
  // The event can only be used once.
  win.__bnInstallPrompt = null;
  return outcome;
}

const GUIDES: Record<InstallPlatform, InstallGuide> = {
  'ios-safari': {
    platform: 'ios-safari',
    label: 'iPhone and iPad (Safari)',
    steps: [
      { icon: 'share-outline', text: 'Tap the Share button in the Safari toolbar.' },
      { icon: 'add-circle-outline', text: 'Scroll down and tap "Add to Home Screen".' },
      { text: 'Tap "Add", then open Bible Notes from your Home Screen.' },
    ],
  },
  'ios-other': {
    platform: 'ios-other',
    label: 'iPhone and iPad (Chrome, Edge, Firefox)',
    steps: [
      { icon: 'share-outline', text: 'Tap the Share button next to the address bar.' },
      { icon: 'add-circle-outline', text: 'Tap "Add to Home Screen", then "Add".' },
    ],
    note: 'Needs iOS 16.4 or later. On older versions, open this page in Safari instead.',
  },
  android: {
    platform: 'android',
    label: 'Android',
    steps: [
      { icon: 'ellipsis-vertical', text: 'Open the browser menu (the three dots).' },
      { icon: 'download-outline', text: 'Tap "Install app" or "Add to Home screen".' },
      { text: 'Confirm, then open Bible Notes from your home screen.' },
    ],
  },
  'desktop-chromium': {
    platform: 'desktop-chromium',
    label: 'Chrome or Edge on a computer',
    steps: [
      { icon: 'download-outline', text: 'Click the install icon at the right end of the address bar.' },
      { text: 'Or open the browser menu and choose "Install Bible Notes" (Chrome) or "Apps", then "Install this site as an app" (Edge).' },
    ],
  },
  'mac-safari': {
    platform: 'mac-safari',
    label: 'Safari on a Mac',
    steps: [
      { text: 'In the menu bar, choose File, then "Add to Dock".' },
      { text: 'Click "Add". Bible Notes then opens from the Dock like any other app.' },
    ],
    note: 'Needs macOS Sonoma or later.',
  },
  firefox: {
    platform: 'firefox',
    label: 'Firefox on a computer',
    steps: [{ text: 'Firefox on desktop can’t install web apps. Open this page in Chrome, Edge or Safari to install it.' }],
  },
  unknown: {
    platform: 'unknown',
    label: 'Other browsers',
    steps: [
      { text: 'Look in your browser’s menu or share sheet for "Install", "Add to Home Screen" or "Add to Dock".' },
    ],
  },
};

export function getInstallGuide(platform: InstallPlatform): InstallGuide {
  return GUIDES[platform];
}

export function getOtherInstallGuides(platform: InstallPlatform): InstallGuide[] {
  return (Object.keys(GUIDES) as InstallPlatform[])
    .filter((p) => p !== platform && p !== 'unknown')
    .map((p) => GUIDES[p]);
}
