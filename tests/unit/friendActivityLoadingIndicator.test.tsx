import React from 'react';
import FriendActivityLoadingIndicator from '../../src/components/FriendActivityLoadingIndicator';

// Helper to recursively collect all text children from a React element tree
function extractText(element: any): string {
  if (!element) return '';
  if (typeof element === 'string' || typeof element === 'number') {
    return String(element);
  }
  if (Array.isArray(element)) {
    return element.map(extractText).join(' ');
  }
  if (element.props && element.props.children) {
    return extractText(element.props.children);
  }
  return '';
}

describe('FriendActivityLoadingIndicator', () => {
  it('renders default message and progressbar accessibility role', () => {
    const tree = FriendActivityLoadingIndicator({} as any) as React.ReactElement<any>;
    expect(tree).toBeTruthy();
    expect(tree.props.accessibilityRole).toBe('progressbar');
    expect(tree.props.accessibilityLabel).toBe('Loading friend activity...');
    const text = extractText(tree);
    expect(text).toContain('Loading friend activity...');
  });

  it('renders custom message', () => {
    const customMessage = 'Checking for friend reflections on this passage...';
    const tree = FriendActivityLoadingIndicator({ message: customMessage } as any) as React.ReactElement<any>;

    expect(tree.props.accessibilityRole).toBe('progressbar');
    expect(tree.props.accessibilityLabel).toBe(customMessage);
    const text = extractText(tree);
    expect(text).toContain(customMessage);
  });

  it('renders compact mode with correct styling and text', () => {
    const compactMessage = 'Checking for friend reflections...';
    const tree = FriendActivityLoadingIndicator({ compact: true, message: compactMessage } as any) as React.ReactElement<any>;

    expect(tree.props.accessibilityRole).toBe('progressbar');
    expect(tree.props.accessibilityLabel).toBe(compactMessage);
    const text = extractText(tree);
    expect(text).toContain(compactMessage);
  });
});
