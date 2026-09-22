/**
 * Adversarial Challenger 2 Test Suite (Milestone 1)
 * Empirically tests:
 * 1. Prohibited color tokens and ungrounded AI colors
 * 2. Drop shadows and elevation violations
 * 3. Typography anti-patterns (ALL-CAPS, arrows, middle dots)
 * 4. Route completeness & React component exports
 * 5. HeaderNotificationBell routing to /notifications
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import { colors, radii, spacing, paperTheme, navigationTheme } from '../../src/constants/theme';

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({ id: 'mock-id' }),
  useNavigation: () => ({
    setOptions: jest.fn(),
  }),
  Stack: Object.assign(() => null, { Screen: () => null }),
  Tabs: Object.assign(() => null, { Screen: () => null }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('expo-splash-screen', () => ({
  preventAutoHideAsync: jest.fn().mockResolvedValue(true),
  hideAsync: jest.fn().mockResolvedValue(true),
}));

jest.mock('@expo-google-fonts/source-serif-pro', () => ({
  useFonts: () => [true, null],
  SourceSerifPro_400Regular: 'SourceSerifPro_400Regular',
  SourceSerifPro_600SemiBold: 'SourceSerifPro_600SemiBold',
  SourceSerifPro_700Bold: 'SourceSerifPro_700Bold',
  SourceSerifPro_400Regular_Italic: 'SourceSerifPro_400Regular_Italic',
}));

const ROOT_DIR = path.resolve(__dirname, '../..');
const APP_DIR = path.join(ROOT_DIR, 'app');
const SRC_DIR = path.join(ROOT_DIR, 'src');

function getAllSourceFiles(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllSourceFiles(filePath));
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      results.push(filePath);
    }
  }
  return results;
}

const allAppFiles = getAllSourceFiles(APP_DIR);
const allSrcFiles = getAllSourceFiles(SRC_DIR);
const allFiles = [...allAppFiles, ...allSrcFiles];

describe('Adversarial Challenge 1: Banned Color Tokens & Anti-Patterns', () => {
  const BANNED_PATTERNS = [
    { pattern: /#000000/i, name: 'pure black #000000' },
    { pattern: /#0b0b0b/i, name: 'near-black #0B0B0B' },
    { pattern: /#111111/i, name: 'near-black #111111' },
    { pattern: /#d97757/i, name: 'AI-default terracotta #D97757' },
  ];

  test('No executable code in app/ or src/ assigns banned hex codes', () => {
    const violations: { file: string; match: string }[] = [];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      // Strip comments to focus on actual code assignments
      const strippedContent = content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '');

      for (const banned of BANNED_PATTERNS) {
        if (banned.pattern.test(strippedContent)) {
          violations.push({
            file: path.relative(ROOT_DIR, filePath),
            match: banned.name,
          });
        }
      }
    }

    expect(violations).toEqual([]);
  });

  test('Check for ungrounded hardcoded pure white #FFFFFF', () => {
    // DESIGN.md states: "Warm parchment white, not pure #FFFFFF"
    // Let's inspect which files use #FFFFFF in non-comment code
    const whiteUsages: string[] = [];
    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const strippedContent = content
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\/\/.*/g, '');

      if (/#ffffff/i.test(strippedContent)) {
        whiteUsages.push(path.relative(ROOT_DIR, filePath));
      }
    }
    // Strict DESIGN.md compliance: zero hardcoded #FFFFFF in non-comment source code
    expect(whiteUsages).toEqual([]);
  });

  test('No generic drop shadows or positive elevation on cards', () => {
    const shadowViolations: { file: string; line: string }[] = [];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const trimmed = line.trim();
        const isComment = trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*');
        if (
          !isComment &&
          (trimmed.includes('shadowColor') ||
            (trimmed.includes('elevation:') && !trimmed.includes('elevation: 0') && !trimmed.includes('elevation: {')) ||
            (trimmed.includes('shadowOpacity:') && !trimmed.includes('shadowOpacity: 0')))
        ) {
          shadowViolations.push({
            file: `${path.relative(ROOT_DIR, filePath)}:${index + 1}`,
            line: trimmed,
          });
        }
      });
    }

    expect(shadowViolations).toEqual([]);
  });

  test('No trailing arrows (→) appended to button or link labels', () => {
    const arrowViolations: { file: string; line: string }[] = [];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        if (line.includes('→') || line.includes('&rarr;') || line.includes('->')) {
          // Allow TS arrow functions like () => or imports
          if (!line.includes('=>') && !line.includes('-> void') && !line.includes('-> Promise')) {
            arrowViolations.push({
              file: `${path.relative(ROOT_DIR, filePath)}:${index + 1}`,
              line: line.trim(),
            });
          }
        }
      });
    }

    expect(arrowViolations).toEqual([]);
  });

  test('No middle-dot-joined metadata strings (· or •)', () => {
    const dotViolations: { file: string; line: string }[] = [];

    for (const filePath of allFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        // Exclude markdown bullet lists or comment bullets
        const isComment = line.trim().startsWith('*') || line.trim().startsWith('//');
        if (!isComment && (line.includes('·') || line.includes('•') || line.includes('&middot;'))) {
          dotViolations.push({
            file: `${path.relative(ROOT_DIR, filePath)}:${index + 1}`,
            line: line.trim(),
          });
        }
      });
    }

    expect(dotViolations).toEqual([]);
  });
});

describe('Adversarial Challenge 2: Route Completeness & Component Validity', () => {
  const REQUIRED_ROUTES = [
    'app/_layout.tsx',
    'app/(auth)/_layout.tsx',
    'app/(auth)/login.tsx',
    'app/(auth)/register.tsx',
    'app/(tabs)/_layout.tsx',
    'app/(tabs)/index.tsx',
    'app/(tabs)/notes.tsx',
    'app/(tabs)/friends.tsx',
    'app/(tabs)/settings.tsx',
    'app/note/[id].tsx',
    'app/note/edit.tsx',
    'app/friend/[id].tsx',
    'app/notifications.tsx',
  ];

  test.each(REQUIRED_ROUTES)('Route file exists: %s', (routePath) => {
    const fullPath = path.join(ROOT_DIR, routePath);
    expect(fs.existsSync(fullPath)).toBe(true);
  });

  test.each(REQUIRED_ROUTES)('Route exports a valid default React component: %s', (routePath) => {
    const relativeModulePath = '../../' + routePath.replace(/\.tsx?$/, '');
    const module = require(relativeModulePath);

    expect(module).toBeDefined();
    expect(module.default).toBeDefined();
    // React components are functions or forwardRef objects
    const isComponent =
      typeof module.default === 'function' ||
      (typeof module.default === 'object' && module.default !== null);
    expect(isComponent).toBe(true);
  });
});

describe('Adversarial Challenge 3: HeaderNotificationBell & Notifications Routing', () => {
  test('HeaderNotificationBell component file exists and exports valid default component', () => {
    const module = require('../../src/components/HeaderNotificationBell');
    expect(module.default).toBeDefined();
    expect(typeof module.default).toBe('function');
  });

  test('HeaderNotificationBell source routes to /notifications via useRouter push', () => {
    const bellPath = path.join(SRC_DIR, 'components/HeaderNotificationBell.tsx');
    const content = fs.readFileSync(bellPath, 'utf-8');

    expect(content).toContain("router.push('/notifications')");
  });

  test('/notifications route is registered in root stack layout', () => {
    const rootLayoutPath = path.join(APP_DIR, '_layout.tsx');
    const content = fs.readFileSync(rootLayoutPath, 'utf-8');

    expect(content).toContain('name="notifications"');
    expect(content).toContain("presentation: 'modal'");
  });

  test('Tabs layout configures HeaderNotificationBell in headerRight', () => {
    const tabsLayoutPath = path.join(APP_DIR, '(tabs)/_layout.tsx');
    const content = fs.readFileSync(tabsLayoutPath, 'utf-8');

    expect(content).toContain('HeaderNotificationBell');
    expect(content).toContain('headerRight: () => <HeaderNotificationBell />');
  });
});

describe('Adversarial Challenge 4: Route Targets Integrity Across Screens', () => {
  test('All router navigation targets in app code resolve to existing routes', () => {
    const routeRegex = /router\.(push|replace)\((['"`][^'"`]+['"`]|\{[^}]+\})\)/g;
    const detectedTargets: { file: string; target: string }[] = [];

    for (const filePath of allAppFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      let match;
      while ((match = routeRegex.exec(content)) !== null) {
        detectedTargets.push({
          file: path.relative(ROOT_DIR, filePath),
          target: match[2],
        });
      }
    }

    expect(detectedTargets.length).toBeGreaterThan(0);

    for (const { file, target } of detectedTargets) {
      if (target.includes('/note/edit')) {
        expect(fs.existsSync(path.join(APP_DIR, 'note/edit.tsx'))).toBe(true);
      } else if (target.includes('/note/[id]')) {
        expect(fs.existsSync(path.join(APP_DIR, 'note/[id].tsx'))).toBe(true);
      } else if (target.includes('/friend/[id]')) {
        expect(fs.existsSync(path.join(APP_DIR, 'friend/[id].tsx'))).toBe(true);
      } else if (target.includes('/notifications')) {
        expect(fs.existsSync(path.join(APP_DIR, 'notifications.tsx'))).toBe(true);
      } else if (target.includes('/(auth)/login')) {
        expect(fs.existsSync(path.join(APP_DIR, '(auth)/login.tsx'))).toBe(true);
      } else if (target.includes('/(auth)/register')) {
        expect(fs.existsSync(path.join(APP_DIR, '(auth)/register.tsx'))).toBe(true);
      } else if (target.includes('/(tabs)')) {
        expect(fs.existsSync(path.join(APP_DIR, '(tabs)/_layout.tsx'))).toBe(true);
      }
    }
  });
});
