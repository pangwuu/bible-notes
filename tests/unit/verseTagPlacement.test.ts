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

import { insertVerseTag, removeVerseTag } from '../../src/utils/verseLinkUtils';

describe('insertVerseTag', () => {
  const tag = '[John 3:16]';

  it('newline placement keeps the existing own-line behaviour', () => {
    expect(insertVerseTag('A thought.', tag, 'newline').content).toBe('A thought.\n[John 3:16]');
    expect(insertVerseTag('', tag, 'newline').content).toBe(tag);
  });

  it('inline placement continues the last line after one space', () => {
    expect(insertVerseTag('A thought.', tag, 'inline').content).toBe('A thought. [John 3:16]');
    expect(insertVerseTag('A thought.   ', tag, 'inline').content).toBe('A thought. [John 3:16]');
    expect(insertVerseTag('', tag, 'inline').content).toBe(tag);
  });

  it('inline placement respects a deliberately started new line', () => {
    expect(insertVerseTag('A thought.\n', tag, 'inline').content).toBe('A thought.\n[John 3:16]');
  });

  it('cursor placement inserts at the caret with single spaces on each side', () => {
    const result = insertVerseTag('God gives freely not grudgingly.', tag, 'cursor', 16);
    expect(result.content).toBe('God gives freely [John 3:16] not grudgingly.');
    expect(result.content.slice(0, result.cursorAfter)).toBe('God gives freely [John 3:16]');
  });

  it('cursor placement does not double up existing whitespace', () => {
    expect(insertVerseTag('God gives ', tag, 'cursor', 10).content).toBe('God gives [John 3:16]');
    expect(insertVerseTag('Line one\nLine two', tag, 'cursor', 9).content).toBe('Line one\n[John 3:16] Line two');
  });

  it('cursor placement falls back to inline without a valid caret', () => {
    expect(insertVerseTag('A thought.', tag, 'cursor').content).toBe('A thought. [John 3:16]');
    expect(insertVerseTag('A thought.', tag, 'cursor', 999).content).toBe('A thought. [John 3:16]');
  });

  it('successive cursor inserts stay in reading order', () => {
    const first = insertVerseTag('Start end', '[A]', 'cursor', 5);
    const second = insertVerseTag(first.content, '[B]', 'cursor', first.cursorAfter);
    expect(second.content).toBe('Start [A] [B] end');
  });
});

describe('removeVerseTag', () => {
  it('returns null when the tag is absent', () => {
    expect(removeVerseTag('No tags here', '[John 3:16]')).toBeNull();
  });

  it('removes an inline tag without leaving a double space', () => {
    expect(removeVerseTag('God gives [John 3:16] freely', '[John 3:16]')).toBe('God gives freely');
    expect(removeVerseTag('God gives freely [John 3:16]', '[John 3:16]')).toBe('God gives freely');
    expect(removeVerseTag('[John 3:16] God gives', '[John 3:16]')).toBe('God gives');
  });

  it('removes an own-line tag without leaving a blank line', () => {
    expect(removeVerseTag('Line one\n[John 3:16]\nLine two', '[John 3:16]')).toBe('Line one\nLine two');
    expect(removeVerseTag('Line one\n[John 3:16]', '[John 3:16]')).toBe('Line one');
  });
});
