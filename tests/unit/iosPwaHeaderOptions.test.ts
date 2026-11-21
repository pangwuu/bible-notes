import {
  IOS_PWA_HEADER_CLEARANCE,
  getIosPwaHeaderOptions,
  isIosStandaloneWeb,
} from '../../src/hooks/useIosPwaHeaderOptions';

describe('iOS home-screen web app header clearance', () => {
  test('detects only iOS standalone web', () => {
    expect(isIosStandaloneWeb({ standalone: true }, 'web')).toBe(true);
    expect(isIosStandaloneWeb({ standalone: false }, 'web')).toBe(false);
    expect(isIosStandaloneWeb({}, 'web')).toBe(false);
    expect(isIosStandaloneWeb(undefined, 'web')).toBe(false);
    expect(isIosStandaloneWeb({ standalone: true }, 'ios')).toBe(false);
  });

  test('pushes header contents below the status bar blur in the iOS PWA', () => {
    expect(getIosPwaHeaderOptions(0, true)).toEqual({ headerStatusBarHeight: IOS_PWA_HEADER_CLEARANCE });
    expect(getIosPwaHeaderOptions(20, true)).toEqual({ headerStatusBarHeight: 20 + IOS_PWA_HEADER_CLEARANCE });
  });

  test('leaves navigator defaults alone everywhere else', () => {
    expect(getIosPwaHeaderOptions(47, false)).toEqual({});
  });
});
