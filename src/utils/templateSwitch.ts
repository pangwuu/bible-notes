import { getSectionColor } from '../constants/templates';
import type { NoteSectionValue } from '../types/note';
import type { NoteTemplate } from '../types/template';

/**
 * Moves a note's writing into a different template without losing anything.
 *
 * 1. A section whose id also exists in the new template moves straight across.
 * 2. Any other section with writing goes into the new section at the same
 *    position (or the last one, if the new template is shorter). With
 *    `labelMovedText` on (the default) it is prefixed with its old title so it's
 *    clear where it came from. If that section already has writing, it is
 *    appended after a blank line.
 *
 * Linked verses travel with the writing they belong to.
 */
export function carrySectionsToTemplate(
  current: NoteSectionValue[],
  target: NoteTemplate,
  { labelMovedText = true }: { labelMovedText?: boolean } = {}
): NoteSectionValue[] {
  const next: NoteSectionValue[] = target.sections.map((sec) => ({
    id: sec.id,
    title: sec.title,
    icon: sec.icon || 'document-text-outline',
    color: sec.color || getSectionColor(sec.id),
    content: '',
  }));
  if (next.length === 0) return next;

  const hasWriting = (s: NoteSectionValue) =>
    (s.content || '').trim().length > 0 || (s.verseReferences?.length ?? 0) > 0;

  const mergeRefs = (into: NoteSectionValue, from: NoteSectionValue) => {
    if (!from.verseReferences?.length) return;
    into.verseReferences = [...(into.verseReferences || []), ...from.verseReferences];
  };

  const leftovers: Array<{ section: NoteSectionValue; index: number }> = [];

  current.forEach((section, index) => {
    if (!hasWriting(section)) return;
    const match = next.find((n) => n.id === section.id);
    if (match) {
      match.content = (section.content || '').trim();
      mergeRefs(match, section);
    } else {
      leftovers.push({ section, index });
    }
  });

  for (const { section, index } of leftovers) {
    const slot = next[Math.min(index, next.length - 1)];
    const text = (section.content || '').trim();
    const sameName = section.title.trim().toLowerCase() === slot.title.trim().toLowerCase();
    const block = text && labelMovedText && !sameName ? `${section.title}:\n${text}` : text;
    if (block) {
      slot.content = slot.content ? `${slot.content}\n\n${block}` : block;
    }
    mergeRefs(slot, section);
  }

  return next;
}
