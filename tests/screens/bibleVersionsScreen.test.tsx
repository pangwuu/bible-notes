/**
 * Screen Test for BibleVersionsScreen (app/bible-versions.tsx)
 * Validates that each supported translation is listed with its full name and summary,
 * and that the user's preferred version is highlighted.
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import BibleVersionsScreen from '../../app/bible-versions';
import { SUPPORTED_BIBLE_VERSIONS } from '../../src/constants/bibleVersions';

let mockProfile: any = null;

jest.mock('../../src/context/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'versions_user' },
    profile: mockProfile,
  }),
}));

const renderScreen = () =>
  render(
    <PaperProvider>
      <BibleVersionsScreen />
    </PaperProvider>
  );

describe('BibleVersionsScreen', () => {
  beforeEach(() => {
    mockProfile = null;
  });

  test('lists every supported version with its short name, full name, and summary', async () => {
    const { getByText, getAllByText } = await renderScreen();

    for (const version of SUPPORTED_BIBLE_VERSIONS) {
      expect(getAllByText(version.shortName).length).toBeGreaterThan(0);
      expect(getByText(version.fullName)).toBeTruthy();
      expect(getByText(version.summary)).toBeTruthy();
    }
  });

  test('marks public domain versions', async () => {
    const { getAllByText } = await renderScreen();
    const publicDomainCount = SUPPORTED_BIBLE_VERSIONS.filter((v) => v.isPublicDomain).length;

    expect(getAllByText('Public domain')).toHaveLength(publicDomainCount);
  });

  test('highlights the default version (ESV) when no preference is set', async () => {
    const { getByTestId, getAllByText } = await renderScreen();

    expect(getByTestId('bible-version-card-ESV').props.accessibilityState).toEqual({ selected: true });
    expect(getByTestId('bible-version-card-NIV').props.accessibilityState).toEqual({ selected: false });
    expect(getAllByText('Your preferred version')).toHaveLength(1);
  });

  test("highlights the user's preferred version from their profile", async () => {
    mockProfile = { settings: { preferred_version_id: 3034 } };
    const { getByTestId } = await renderScreen();

    expect(getByTestId('bible-version-card-BSB').props.accessibilityState).toEqual({ selected: true });
    expect(getByTestId('bible-version-card-ESV').props.accessibilityState).toEqual({ selected: false });
  });

  test('resolves a legacy preferred_translation abbreviation', async () => {
    mockProfile = { preferred_translation: 'NASB' };
    const { getByTestId } = await renderScreen();

    expect(getByTestId('bible-version-card-NASB').props.accessibilityState).toEqual({ selected: true });
  });
});
