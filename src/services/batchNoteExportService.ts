/**
 * Batch-export all of a user's notes as a Markdown zip archive and open the share sheet.
 * Falls back to sharing a single combined Markdown document when no writable FS is available.
 */

import { Platform, Share } from 'react-native';
import JSZip from 'jszip';
import { EncodingType, File, Paths, type Directory } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getUserNotes } from './notesService';
import {
  buildCombinedNotesMarkdown,
  buildNotesExportEntries,
} from '../utils/noteExport';

export interface BatchExportResult {
  noteCount: number;
  uri?: string;
  filename: string;
  format: 'zip' | 'markdown';
}

/**
 * Creates an in-memory zip containing every note as Markdown plus an index.
 */
export async function createNotesExportZip(
  notes: Parameters<typeof buildNotesExportEntries>[0],
  exportedAt: Date = new Date()
): Promise<{
  bytes: Uint8Array;
  base64: string;
  folderName: string;
  filename: string;
  noteCount: number;
}> {
  const { folderName, entries, indexContent } = buildNotesExportEntries(notes, { exportedAt });
  const zip = new JSZip();
  const root = zip.folder(folderName);
  if (!root) {
    throw new Error('Failed to create export archive');
  }

  root.file('README.md', indexContent);
  for (const entry of entries) {
    root.file(entry.path, entry.content);
  }

  const [bytes, base64] = await Promise.all([
    zip.generateAsync({
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    }),
    zip.generateAsync({
      type: 'base64',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    }),
  ]);

  return {
    bytes,
    base64,
    folderName,
    filename: `${folderName}.zip`,
    noteCount: notes.length,
  };
}

/** @deprecated Prefer createNotesExportZip — kept for existing unit tests. */
export async function createNotesExportZipBase64(
  notes: Parameters<typeof buildNotesExportEntries>[0],
  exportedAt: Date = new Date()
): Promise<{ base64: string; folderName: string; filename: string; noteCount: number }> {
  const { base64, folderName, filename, noteCount } = await createNotesExportZip(
    notes,
    exportedAt
  );
  return { base64, folderName, filename, noteCount };
}

function tryGetDirectory(getter: () => Directory): Directory | null {
  try {
    const dir = getter();
    if (!dir) return null;
    // Some runtimes expose an empty uri until first write; still attempt the write.
    return dir;
  } catch {
    return null;
  }
}

function writeWithModernApi(
  dir: Directory,
  filename: string,
  bytes: Uint8Array,
  base64: string
): string {
  const file = new File(dir, filename);
  file.create({ overwrite: true, intermediates: true });

  try {
    file.write(bytes);
  } catch {
    // Some native builds accept base64 strings more reliably than Uint8Array.
    file.write(base64, { encoding: EncodingType.Base64 });
  }

  if (!file.uri) {
    throw new Error('Wrote export file but received an empty URI');
  }
  return file.uri;
}

async function writeWithLegacyApi(
  directory: string | null | undefined,
  filename: string,
  base64: string
): Promise<string | null> {
  if (!directory) return null;
  const uri = `${directory}${filename}`;
  await FileSystemLegacy.writeAsStringAsync(uri, base64, {
    encoding: FileSystemLegacy.EncodingType.Base64,
  });
  return uri;
}

/**
 * Writes zip bytes using several filesystem strategies.
 * Returns null when no strategy succeeds (caller should use Markdown share fallback).
 */
export async function writeExportZipFile(
  filename: string,
  bytes: Uint8Array,
  base64: string
): Promise<string | null> {
  const modernDirs = [
    tryGetDirectory(() => Paths.cache),
    tryGetDirectory(() => Paths.document),
  ].filter(Boolean) as Directory[];

  for (const dir of modernDirs) {
    try {
      return writeWithModernApi(dir, filename, bytes, base64);
    } catch (err) {
      console.warn('[BatchExport] Modern File API write failed:', err);
    }
  }

  const legacyDirs = [
    FileSystemLegacy.cacheDirectory,
    FileSystemLegacy.documentDirectory,
  ];
  for (const dir of legacyDirs) {
    try {
      const uri = await writeWithLegacyApi(dir, filename, base64);
      if (uri) return uri;
    } catch (err) {
      console.warn('[BatchExport] Legacy FileSystem write failed:', err);
    }
  }

  return null;
}

/**
 * Shares a single combined Markdown document via the RN Share API (no filesystem).
 */
export async function shareCombinedMarkdownExport(
  notes: Parameters<typeof buildNotesExportEntries>[0],
  exportedAt: Date = new Date()
): Promise<BatchExportResult> {
  const markdown = buildCombinedNotesMarkdown(notes, { exportedAt });
  const dateStamp = exportedAt.toISOString().slice(0, 10);
  const filename = `bible-notes-export-${dateStamp}.md`;

  const result = await Share.share({
    title: 'Bible Notes export',
    message: markdown,
  });

  if (result.action === Share.dismissedAction) {
    // User dismissed — still treat as soft success so UI doesn't show a hard error.
  }

  return {
    noteCount: notes.length,
    filename,
    format: 'markdown',
  };
}

/**
 * Fetches all notes for the user and exports them.
 * Prefers a zip file share; falls back to combined Markdown via Share when FS is unavailable.
 */
export async function exportAllNotesAsZip(userId: string): Promise<BatchExportResult> {
  if (!userId) {
    throw new Error('You must be signed in to export notes.');
  }

  const notes = await getUserNotes(userId);
  if (notes.length === 0) {
    throw new Error('You have no notes to export yet.');
  }

  try {
    const { bytes, base64, filename, noteCount } = await createNotesExportZip(notes);
    const uri = await writeExportZipFile(filename, bytes, base64);

    if (uri) {
      if (Platform.OS !== 'web') {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/zip',
            dialogTitle: 'Export Bible Notes',
            UTI: 'public.zip-archive',
          });
        } else {
          // File written but Sharing unavailable — still return success with uri.
        }
      }

      return { noteCount, uri, filename, format: 'zip' };
    }
  } catch (err) {
    console.warn('[BatchExport] Zip export failed, falling back to Markdown share:', err);
  }

  return shareCombinedMarkdownExport(notes);
}
