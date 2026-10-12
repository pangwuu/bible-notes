/**
 * Ensures mobile browser chrome (Safari toolbar / overscroll / safe-area edges)
 * matches the header/tab bar surface color instead of the default white canvas.
 */

import fs from 'fs';
import path from 'path';
import { colors } from '../../src/constants/theme';

describe('Web theme chrome (mobile Safari outside safe area)', () => {
  const indexHtmlPath = path.join(__dirname, '../../public/index.html');
  const appJsonPath = path.join(__dirname, '../../app.json');

  test('public/index.html paints html/body/#root with header/tab bar surface', () => {
    const html = fs.readFileSync(indexHtmlPath, 'utf8');
    expect(html).toContain(`background-color: ${colors.bg.surface}`);
    expect(html).toContain('color-scheme: dark');
    expect(html).toContain('name="color-scheme" content="dark"');
    expect(html).toContain('%LANG_ISO_CODE%');
    expect(html).toContain('%WEB_TITLE%');
  });

  test('app.json keeps web.themeColor aligned with header/tab bar surface', () => {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    expect(appJson.expo.web.themeColor).toBe(colors.bg.surface);
    expect(appJson.expo.web.backgroundColor).toBe(colors.bg.base);
  });
});
