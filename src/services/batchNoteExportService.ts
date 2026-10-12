/**
 * Batch-export all of a user's notes as a Markdown zip archive and open the share sheet.
 */

import { Platform } from 'react-native';
import JSZip from 'jszip';
import { File, Paths, type Directory } from 'expo-file-system';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getUserNotes } from './notesService';
import { buildNotesExportEntries } from '../utils/noteExport';

export interface BatchExportResult {
  noteCount: number;
  uri: string;
  filename: string;
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

/**
 * Picks a writable app directory. Prefer cache, then documents.
 */
export function resolveExportDirectory(): Directory {
  const cacheUri = Paths.cache?.uri;
  if (typeof cacheUri === 'string' && cacheUri.length > 0) {
    return Paths.cache;
  }
  const docUri = Paths.document?.uri;
  if (typeof docUri === 'string' && docUri.length > 0) {
    return Paths.document;
  }
  throw new Error('No writable app directory is available on this device.');
}

/**
 * Writes zip bytes using the modern File API, with a legacy FileSystem fallback.
 */
export async function writeExportZipFile(
  filename: string,
  bytes: Uint8Array,
  base64: string
): Promise<string> {
  // Modern SDK 57+ File / Paths API (works in Expo Go / native builds)
  try {
    const dir = resolveExportDirectory();
    const file = new File(dir, filename);
    file.create({ overwrite: true });
    file.write(bytes);
    if (file.uri) {
      return file.uri;
    }
  } catch (err) {
    console.warn('[BatchExport] Modern File API write failed, trying legacy:', err);
  }

  // Legacy fallback for environments where Paths.* is unavailable
  const legacyDir = FileSystemLegacy.cacheDirectory || FileSystemLegacy.documentDirectory;
  if (!legacyDir) {
    throw new Error('File system storage is unavailable on this device.');
  }
  const uri = `${legacyDir}${filename}`;
  await FileSystemLegacy.writeAsStringAsync(uri, base64, {
    encoding: FileSystemLegacy.EncodingType.Base64,
  });
  return uri;
}

/**
 * Fetches all notes for the user, writes a zip, and shares it.
 */
export async function exportAllNotesAsZip(userId: string): Promise<BatchExportResult> {
  if (!userId) {
    throw new Error('You must be signed in to export notes.');
  }

  const notes = await getUserNotes(userId);
  if (notes.length === 0) {
    throw new Error('You have no notes to export yet.');
  }

  const { bytes, base64, filename, noteCount } = await createNotesExportZip(notes);
  const uri = await writeExportZipFile(filename, bytes, base64);

  if (Platform.OS === 'web') {
    return { noteCount, uri, filename };
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing is not available on this device.');
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/zip',
    dialogTitle: 'Export Bible Notes',
    UTI: 'public.zip-archive',
  });

  return { noteCount, uri, filename };
}
