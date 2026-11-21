import React from 'react';
import { StyleSheet, View } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { TemplateIcon } from '../../src/components/TemplateIcon';

const mockIonicons = jest.fn((_props: object) => null);
const mockMaterialCommunityIcons = jest.fn((_props: object) => null);

jest.mock('@expo/vector-icons', () => ({
  Ionicons: (props: object) => mockIonicons(props),
  MaterialCommunityIcons: (props: object) => mockMaterialCommunityIcons(props),
}));

function renderIcon(name: string, size = 16) {
  let tree: renderer.ReactTestRenderer | undefined;
  act(() => {
    tree = renderer.create(<TemplateIcon name={name} size={size} color="#7A4E1D" />);
  });
  return tree!;
}

const filledRects = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(View)
    .filter((v) => StyleSheet.flatten(v.props.style)?.backgroundColor === '#7A4E1D');

describe('TemplateIcon', () => {
  beforeEach(() => {
    mockIonicons.mockClear();
    mockMaterialCommunityIcons.mockClear();
  });

  it.each([
    ['cross', 2],
    ['cross-outline', 12],
  ])('draws %s itself instead of loading the MaterialCommunityIcons font', (name, rectCount) => {
    const tree = renderIcon(name, 14);

    expect(mockMaterialCommunityIcons).not.toHaveBeenCalled();
    expect(mockIonicons).not.toHaveBeenCalled();
    expect(filledRects(tree)).toHaveLength(rectCount);
    expect(StyleSheet.flatten(tree.root.findAllByType(View)[0].props.style)).toMatchObject({ width: 14, height: 14 });
  });

  it.each(['book-outline', 'constructor', 'toString'])('renders %s through Ionicons', (name) => {
    renderIcon(name);

    expect(mockIonicons).toHaveBeenCalledWith(expect.objectContaining({ name, size: 16, color: '#7A4E1D' }));
  });

  it('falls back to the default Ionicons glyph for an empty name', () => {
    renderIcon('');

    expect(mockIonicons).toHaveBeenCalledWith(expect.objectContaining({ name: 'document-text-outline' }));
  });
});
