import React from 'react';
import { render, act } from '@testing-library/react-native';
import {
  AppLoadingScreen,
  getSlowHint,
  SLOW_HINT_DELAY_MS,
  VERY_SLOW_HINT_DELAY_MS,
} from '../../src/components/AppLoadingScreen';

describe('AppLoadingScreen', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it.each([
    ['starting', 'Opening Bible Notes...'],
    ['signingIn', 'Logging you in...'],
    ['loadingProfile', 'Getting your notes...'],
  ] as const)('shows the %s stage message', async (stage, expected) => {
    const { getByTestId } = await render(<AppLoadingScreen stage={stage} />);
    expect(getByTestId('app-loading-message').props.children).toBe(expected);
  });

  it('adds reassurance hints as loading drags on', async () => {
    const { getByTestId } = await render(<AppLoadingScreen stage="signingIn" />);
    const hint = () => getByTestId('app-loading-hint').props.children;

    expect(hint()).toBe(' ');

    await act(async () => {
      jest.advanceTimersByTime(SLOW_HINT_DELAY_MS);
    });
    expect(hint()).toBe('Still working on it...');

    await act(async () => {
      jest.advanceTimersByTime(VERY_SLOW_HINT_DELAY_MS - SLOW_HINT_DELAY_MS);
    });
    expect(hint()).toMatch(/Hang tight/);
  });

  it('keeps the elapsed timer when the stage changes', async () => {
    const { getByTestId, rerender } = await render(<AppLoadingScreen stage="signingIn" />);
    await act(async () => {
      jest.advanceTimersByTime(SLOW_HINT_DELAY_MS);
    });
    await rerender(<AppLoadingScreen stage="loadingProfile" />);
    expect(getByTestId('app-loading-message').props.children).toBe('Getting your notes...');
    expect(getByTestId('app-loading-hint').props.children).toBe('Still working on it...');
  });
});

describe('getSlowHint', () => {
  it('returns nothing before the first threshold', () => {
    expect(getSlowHint(0)).toBeNull();
    expect(getSlowHint(SLOW_HINT_DELAY_MS - 1)).toBeNull();
  });
});
