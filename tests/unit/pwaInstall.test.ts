import {
  detectInstallPlatform,
  getInstallGuide,
  getOtherInstallGuides,
} from '../../src/utils/pwaInstall';

const UA = {
  iphoneSafari:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',
  iphoneChrome:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0.6778.73 Mobile/15E148 Safari/604.1',
  ipadOS:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  macSafari:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',
  androidChrome:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  windowsEdge:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36 Edg/131.0.0.0',
  firefoxDesktop: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
};

describe('detectInstallPlatform', () => {
  it.each([
    ['iphoneSafari', 0, 'ios-safari'],
    ['iphoneChrome', 0, 'ios-other'],
    ['ipadOS', 5, 'ios-safari'],
    ['macSafari', 0, 'mac-safari'],
    ['androidChrome', 5, 'android'],
    ['windowsEdge', 0, 'desktop-chromium'],
    ['firefoxDesktop', 0, 'firefox'],
  ] as const)('%s -> %s', (key, touch, expected) => {
    expect(detectInstallPlatform(UA[key], touch)).toBe(expected);
  });

  it('falls back to unknown', () => {
    expect(detectInstallPlatform('SomeBot/1.0')).toBe('unknown');
  });
});

describe('install guides', () => {
  it('gives iOS Safari users the Share then Add to Home Screen steps', () => {
    const steps = getInstallGuide('ios-safari').steps.map((s) => s.text).join(' ');
    expect(steps).toMatch(/Share/);
    expect(steps).toMatch(/Add to Home Screen/);
  });

  it('lists the other platforms without the current one', () => {
    const others = getOtherInstallGuides('android').map((g) => g.platform);
    expect(others).not.toContain('android');
    expect(others).toContain('ios-safari');
  });
});
