/**
 * Ensures mobile browser chrome (Safari toolbar / overscroll / safe-area edges)
 * inherits the app background instead of the default white document canvas.
 */

import fs from 'fs';
import path from 'path';
import { colors } from '../../src/constants/theme';

describe('Web theme chrome (mobile Safari outside safe area)', () => {
  const indexHtmlPath = path.join(__dirname, '../../public/index.html');
  const appJsonPath = path.join(__dirname, '../../app.json');

  test('public/index.html paints html/body/#root with theme bg base', () => {
    const html = fs.readFileSync(indexHtmlPath, 'utf8');
    expect(html).toContain(`background-color: ${colors.bg.base}`);
    expect(html).toContain('color-scheme: dark');
    expect(html).toContain('name="color-scheme" content="dark"');
    expect(html).toContain('%LANG_ISO_CODE%');
    expect(html).toContain('%WEB_TITLE%');
  });

  test('app.json keeps web.themeColor aligned with theme bg base', () => {
    const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
    expect(appJson.expo.web.themeColor).toBe(colors.bg.base);
    expect(appJson.expo.web.backgroundColor).toBe(colors.bg.base);
  });
});
