import { carrySectionsToTemplate } from '../../src/utils/templateSwitch';
import { BUILT_IN_TEMPLATES } from '../../src/constants/templates';
import type { NoteSectionValue } from '../../src/types/note';

const tpl = (id: string) => BUILT_IN_TEMPLATES.find((t) => t.id === id)!;

const swedish: NoteSectionValue[] = [
  { id: 'light', title: 'Key Idea', content: 'God is faithful' },
  {
    id: 'question',
    title: 'Question',
    content: 'Why wait?',
    verseReferences: [{ startVerse: 3, endVerse: 3, book: 'Romans', chapter: 8 }],
  },
  { id: 'arrow', title: 'Application', content: 'Trust today' },
];

describe('carrySectionsToTemplate', () => {
  it('moves each section into the same position, labelled with where it came from', () => {
    const result = carrySectionsToTemplate(swedish, tpl('soap'));
    expect(result.map((s) => s.id)).toEqual(['scripture', 'observation', 'application', 'prayer']);
    expect(result[0].content).toBe('Key Idea:\nGod is faithful');
    expect(result[1].content).toBe('Question:\nWhy wait?');
    expect(result[1].verseReferences).toHaveLength(1);
  });

  it('skips the label when the destination section has the same name', () => {
    const result = carrySectionsToTemplate(swedish, tpl('soap'));
    expect(result[2].content).toBe('Trust today');
  });

  it('keeps everything when the new template has fewer sections', () => {
    const [notes] = carrySectionsToTemplate(swedish, tpl('blank'));
    expect(notes.content).toContain('God is faithful');
    expect(notes.content).toContain('Question:\nWhy wait?');
    expect(notes.content).toContain('Application:\nTrust today');
    expect(notes.verseReferences).toHaveLength(1);
  });

  it('moves sections with the same id straight across without a label', () => {
    const inductive: NoteSectionValue[] = [
      { id: 'observation', title: 'Observation', content: 'Repetition of "love"' },
      { id: 'interpretation', title: 'Interpretation', content: '' },
      { id: 'application', title: 'Application', content: 'Call Mum' },
    ];
    const result = carrySectionsToTemplate(inductive, tpl('soap'));
    expect(result.find((s) => s.id === 'observation')!.content).toBe('Repetition of "love"');
    expect(result.find((s) => s.id === 'application')!.content).toBe('Call Mum');
    expect(result.find((s) => s.id === 'scripture')!.content).toBe('');
  });

  it('round-trips without losing writing', () => {
    const toSoap = carrySectionsToTemplate(swedish, tpl('soap'));
    const back = carrySectionsToTemplate(toSoap, tpl('swedish'));
    const all = back.map((s) => s.content).join('\n');
    for (const text of ['God is faithful', 'Why wait?', 'Trust today']) {
      expect(all).toContain(text);
    }
  });

  it('leaves out the old section names when labelMovedText is off', () => {
    const [notes] = carrySectionsToTemplate(swedish, tpl('blank'), { labelMovedText: false });
    expect(notes.content).toBe('God is faithful\n\nWhy wait?\n\nTrust today');
    expect(notes.content).not.toContain('Question:');
  });
});
