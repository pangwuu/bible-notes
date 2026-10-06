import { appendVerseTagOnNearestClearLine } from '../../src/utils/verseLinkUtils';

describe('appendVerseTagOnNearestClearLine', () => {
  it('returns the tag when currentContent is empty or falsy', () => {
    expect(appendVerseTagOnNearestClearLine('', '[Matt 1:1]')).toBe('[Matt 1:1]');
    expect(appendVerseTagOnNearestClearLine(null as any, '[Matt 1:1]')).toBe('[Matt 1:1]');
    expect(appendVerseTagOnNearestClearLine(undefined as any, '[Matt 1:1]')).toBe('[Matt 1:1]');
  });

  it('appends tag directly when currentContent already ends with a newline', () => {
    const text = 'Here is a thought.\n';
    expect(appendVerseTagOnNearestClearLine(text, '[Matt 1:1]')).toBe('Here is a thought.\n[Matt 1:1]');

    const multiLine = 'Line 1\nLine 2\n';
    expect(appendVerseTagOnNearestClearLine(multiLine, '[Rom 8:28]')).toBe('Line 1\nLine 2\n[Rom 8:28]');
  });

  it('appends a newline before tag when currentContent does not end with a newline', () => {
    const text = 'Here is a thought.';
    expect(appendVerseTagOnNearestClearLine(text, '[Matt 1:1]')).toBe('Here is a thought.\n[Matt 1:1]');

    const withTrailingSpace = 'Here is a thought. ';
    expect(appendVerseTagOnNearestClearLine(withTrailingSpace, '[Matt 1:1]')).toBe('Here is a thought. \n[Matt 1:1]');
  });

  it('returns currentContent unmodified if tag is empty', () => {
    expect(appendVerseTagOnNearestClearLine('Hello', '')).toBe('Hello');
  });
});
