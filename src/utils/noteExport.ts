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

/** Sanitize a string for use as a filename segment. */
export function slugifyFilenamePart(value: string, maxLen = 48): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLen)
    .replace(/-+$/g, '');
  return slug || 'note';
}

export interface NoteExportFileEntry {
  /** Path inside the zip, e.g. notes/001-john-3-16.md */
  path: string;
  content: string;
  noteId: string;
}

/**
 * Builds a stable, human-readable markdown filename for a note.
 */
export function buildNoteExportFilename(
  note: NoteExportInput & { id?: string },
  index: number
): string {
  const ordinal = String(index + 1).padStart(3, '0');
  const label = getNoteShareTitle(note);
  const slug = slugifyFilenamePart(label);
  const idSuffix = note.id ? `-${slugifyFilenamePart(note.id, 8)}` : '';
  return `${ordinal}-${slug}${idSuffix}.md`;
}

/**
 * Builds zip file entries for a batch of notes (markdown + index).
 */
export function buildNotesExportEntries(
  notes: Array<NoteExportInput & { id?: string }>,
  options?: { exportedAt?: Date; folderName?: string }
): { folderName: string; entries: NoteExportFileEntry[]; indexContent: string } {
  const exportedAt = options?.exportedAt ?? new Date();
  const dateStamp = exportedAt.toISOString().slice(0, 10);
  const folderName = options?.folderName || `bible-notes-export-${dateStamp}`;

  const entries: NoteExportFileEntry[] = notes.map((note, index) => {
    const filename = buildNoteExportFilename(note, index);
    return {
      path: `notes/${filename}`,
      content: formatNoteAsMarkdown(note),
      noteId: note.id || String(index),
    };
  });

  const indexLines = [
    '# Bible Notes export',
    '',
    `Exported: ${exportedAt.toISOString()}`,
    `Notes: ${notes.length}`,
    '',
    '## Contents',
    '',
  ];

  entries.forEach((entry, i) => {
    const title = getNoteShareTitle(notes[i]);
    indexLines.push(`${i + 1}. [${title}](${entry.path})`);
  });

  indexLines.push('');
  const indexContent = `${indexLines.join('\n')}`;

  return { folderName, entries, indexContent };
}

/**
 * Concatenates every note into one Markdown document (filesystem-free share fallback).
 */
export function buildCombinedNotesMarkdown(
  notes: Array<NoteExportInput & { id?: string }>,
  options?: { exportedAt?: Date }
): string {
  const exportedAt = options?.exportedAt ?? new Date();
  const parts = [
    '# Bible Notes export',
    '',
    `Exported: ${exportedAt.toISOString()}`,
    `Notes: ${notes.length}`,
    '',
  ];

  notes.forEach((note, index) => {
    parts.push('---');
    parts.push('');
    parts.push(`<!-- note ${index + 1} of ${notes.length}${note.id ? ` id=${note.id}` : ''} -->`);
    parts.push('');
    parts.push(formatNoteAsMarkdown(note).trimEnd());
    parts.push('');
  });

  return `${parts.join('\n').trim()}\n`;
}
