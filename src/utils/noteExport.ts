/**
 * Formats a note as Markdown suitable for the system share sheet / export.
 */

import { Note, NoteSectionValue, formatPassageDisplay } from '../types/note';

export interface NoteExportInput {
  title?: string | null;
  passage?: Note['passage'] | null;
  templateName?: string | null;
  sections?: NoteSectionValue[] | null;
  lightContent?: string | null;
  questionContent?: string | null;
  arrowContent?: string | null;
  content?: string | null;
  tags?: string[] | null;
}

function resolvePassageLabel(passage?: Note['passage'] | null): string {
  if (!passage) return '';
  const display = (passage.display || passage.displayString || '').trim();
  if (display) return display;
  try {
    return formatPassageDisplay(passage);
  } catch {
    return '';
  }
}

function resolveSections(note: NoteExportInput): Array<{ title: string; content: string }> {
  if (note.sections && note.sections.length > 0) {
    return note.sections
      .map((s) => ({
        title: (s.title || '').trim() || 'Section',
        content: (s.content || '').trim(),
      }))
      .filter((s) => s.content.length > 0);
  }

  const legacy: Array<{ title: string; content: string }> = [
    { title: 'Key Idea', content: (note.lightContent || '').trim() },
    { title: 'Question', content: (note.questionContent || '').trim() },
    { title: 'Application', content: (note.arrowContent || '').trim() },
  ].filter((s) => s.content.length > 0);

  if (legacy.length > 0) return legacy;

  const body = (note.content || '').trim();
  if (body) return [{ title: 'Note', content: body }];
  return [];
}

/**
 * Builds a Markdown string for sharing or exporting a note.
 */
export function formatNoteAsMarkdown(note: NoteExportInput): string {
  const lines: string[] = [];

  const title = (note.title || '').trim();
  const passage = resolvePassageLabel(note.passage);
  const templateName = (note.templateName || '').trim();
  const tags = (note.tags || []).map((t) => t.trim()).filter(Boolean);

  if (title) {
    lines.push(`# ${title}`);
  } else if (passage) {
    lines.push(`# ${passage}`);
  } else {
    lines.push('# Bible Note');
  }

  if (passage && title) {
    lines.push('');
    lines.push(`**Passage:** ${passage}`);
  }

  if (templateName) {
    lines.push('');
    lines.push(`**Template:** ${templateName}`);
  }

  if (tags.length > 0) {
    lines.push('');
    lines.push(`**Tags:** ${tags.map((t) => `#${t}`).join(' ')}`);
  }

  const sections = resolveSections(note);
  for (const section of sections) {
    lines.push('');
    lines.push(`## ${section.title}`);
    lines.push('');
    lines.push(section.content);
  }

  return `${lines.join('\n').trim()}\n`;
}

/**
 * Derives a short subject/title line for the share sheet.
 */
export function getNoteShareTitle(note: NoteExportInput): string {
  const title = (note.title || '').trim();
  if (title) return title;
  const passage = resolvePassageLabel(note.passage);
  if (passage) return passage;
  return 'Bible Note';
}
