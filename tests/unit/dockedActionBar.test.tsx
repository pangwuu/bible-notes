import React from 'react';
import { Text } from 'react-native';
import { render } from '@testing-library/react-native';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DockedActionBar } from '../../src/components/bibleReader/DockedActionBar';

const wrap = (ui: React.ReactElement) => (
  <SafeAreaProvider
    initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 34 } }}
  >
    <PaperProvider>{ui}</PaperProvider>
  </SafeAreaProvider>
);

describe('DockedActionBar', () => {
  it('renders nothing and reports zero height when hidden', async () => {
    const onHeight = jest.fn();
    const { queryByText } = await render(
      wrap(
        <DockedActionBar visible={false} onHeightChange={onHeight}>
          <Text>bar</Text>
        </DockedActionBar>
      )
    );
    expect(queryByText('bar')).toBeNull();
    expect(onHeight).toHaveBeenCalledWith(0);
  });

  it('renders its children through the portal when visible', async () => {
    const { getByText } = await render(
      wrap(
        <DockedActionBar visible>
          <Text>bar</Text>
        </DockedActionBar>
      )
    );
    expect(getByText('bar')).toBeTruthy();
  });
});
