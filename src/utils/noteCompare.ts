/**
 * Helpers for side-by-side / stacked friend note comparison.
 */

import { colors } from '../constants/theme';
import type { Note, NoteSectionValue } from '../types/note';

export interface CompareSection {
  id: string;
  title: string;
  content: string;
  color?: string;
  icon?: string;
}

export function getComparableSections(note: Note | null | undefined): CompareSection[] {
  if (!note) return [];

  if (note.sections && note.sections.length > 0) {
    return note.sections.map((s: NoteSectionValue) => ({
      id: s.id,
      title: s.title || 'Section',
      content: (s.content || '').trim(),
      color: s.color,
      icon: s.icon,
    }));
  }

  return [
    {
      id: 'light',
      title: 'Key Idea',
      content: (note.lightContent || '').trim(),
      color: colors.accent.keyIdea,
      icon: 'bulb-outline',
    },
    {
      id: 'question',
      title: 'Question',
      content: (note.questionContent || '').trim(),
      color: colors.accent.question,
      icon: 'help-circle-outline',
    },
    {
      id: 'arrow',
      title: 'Application',
      content: (note.arrowContent || '').trim(),
      color: colors.accent.application,
      icon: 'footsteps-outline',
    },
  ].filter((s) => s.content.length > 0);
}

/**
 * Aligns section titles across two notes for paired comparison.
 * Unmatched sections append at the end.
 */
export function alignSectionsForCompare(
  mine: CompareSection[],
  theirs: CompareSection[]
): Array<{ title: string; mine?: CompareSection; theirs?: CompareSection }> {
  const rows: Array<{ title: string; mine?: CompareSection; theirs?: CompareSection }> = [];
  const usedTheirs = new Set<number>();

  for (const m of mine) {
    const matchIdx = theirs.findIndex(
      (t, i) => !usedTheirs.has(i) && t.title.toLowerCase() === m.title.toLowerCase()
    );
    if (matchIdx >= 0) {
      usedTheirs.add(matchIdx);
      rows.push({ title: m.title, mine: m, theirs: theirs[matchIdx] });
    } else {
      rows.push({ title: m.title, mine: m });
    }
  }

  theirs.forEach((t, i) => {
    if (!usedTheirs.has(i)) {
      rows.push({ title: t.title, theirs: t });
    }
  });

  return rows;
}
