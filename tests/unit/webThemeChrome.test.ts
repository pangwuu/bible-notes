/**
 * Ensures mobile browser chrome (Safari toolbar / overscroll / safe-area edges)
 * uses page base on auth screens and header/tab surface when logged into the app.
 */

import fs from 'fs';
import path from 'path';
import { colors } from '../../src/constants/theme';
import {
  WEB_THEME_CHROME_APP,
  WEB_THEME_CHROME_AUTH,
  applyWebThemeChrome,
  resolveWebThemeChromeColor,
} from '../../src/utils/webThemeChrome';

describe('Web theme chrome (mobile Safari outside safe area)', () => {
  const indexHtmlPath = path.join(__dirname, '../../public/index.html');
  const appJsonPath = path.join(__dirname, '../../app.json');

  test('public/index.html defaults html/body/#root to auth/page base', () => {
    const html = fs.readFileSync(indexHtmlPath, 'utf8');
    expect(html).toContain(`background-color: ${colors.bg.base}`);
    expect(html).toContain('color-scheme: dark');
    expect(html).toContain('name="color-scheme" content="dark"');
    expect(html).toContain('%LANG_ISO_CODE%');
    expect(html).toContain('%WEB_TITLE%');
  });

  test('app.json defaults web.themeColor to auth/page base', () => {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    expect(appJson.expo.web.themeColor).toBe(colors.bg.base);
    expect(appJson.expo.web.backgroundColor).toBe(colors.bg.base);
  });

  test('resolveWebThemeChromeColor uses base on auth and surface when logged in', () => {
    expect(WEB_THEME_CHROME_AUTH).toBe(colors.bg.base);
    expect(WEB_THEME_CHROME_APP).toBe(colors.bg.surface);
    expect(resolveWebThemeChromeColor(false)).toBe(colors.bg.base);
    expect(resolveWebThemeChromeColor(true)).toBe(colors.bg.surface);
  });

  test('applyWebThemeChrome updates theme-color meta and document canvas', () => {
    const created: Array<{ name: string; content?: string; setAttribute: (k: string, v: string) => void }> = [];

    const htmlEl = { style: { backgroundColor: '' } };
    const bodyEl = { style: { backgroundColor: '' } };
    const rootEl = { style: { backgroundColor: '' } };

    const fakeDoc = {
      documentElement: htmlEl,
      body: bodyEl,
      head: {
        appendChild(node: typeof themeMeta) {
          created.push(node);
        },
      },
      getElementById(id: string) {
        return id === 'root' ? rootEl : null;
      },
      querySelector(selector: string) {
        if (selector === 'meta[name="theme-color"]') {
          return created[0] ?? null;
        }
        return null;
      },
      createElement(tag: string) {
        if (tag !== 'meta') {
          throw new Error(`Unexpected element: ${tag}`);
        }
        const node = {
          name: '',
          content: '',
          setAttribute(key: string, value: string) {
            if (key === 'name') this.name = value;
            if (key === 'content') this.content = value;
          },
        };
        return node;
      },
    } as unknown as Document;

    applyWebThemeChrome(colors.bg.surface, fakeDoc);

    expect(htmlEl.style.backgroundColor).toBe(colors.bg.surface);
    expect(bodyEl.style.backgroundColor).toBe(colors.bg.surface);
    expect(rootEl.style.backgroundColor).toBe(colors.bg.surface);
    expect(created).toHaveLength(1);
    expect(created[0].name).toBe('theme-color');
    expect(created[0].content).toBe(colors.bg.surface);

    applyWebThemeChrome(colors.bg.base, fakeDoc);
    expect(created).toHaveLength(1);
    expect(created[0].content).toBe(colors.bg.base);
    expect(htmlEl.style.backgroundColor).toBe(colors.bg.base);
  });
});
