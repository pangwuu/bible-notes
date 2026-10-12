/**
 * Batch-export all of a user's notes as a Markdown zip archive and open the share sheet.
 */

import { Platform } from 'react-native';
import JSZip from 'jszip';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { getUserNotes } from './notesService';
import { buildNotesExportEntries } from '../utils/noteExport';

export interface BatchExportResult {
  noteCount: number;
  uri: string;
  filename: string;
}

/**
 * Creates an in-memory zip (base64) containing every note as Markdown plus an index.
 */
export async function createNotesExportZipBase64(
  notes: Parameters<typeof buildNotesExportEntries>[0],
  exportedAt: Date = new Date()
): Promise<{ base64: string; folderName: string; filename: string; noteCount: number }> {
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

  const base64 = await zip.generateAsync({
    type: 'base64',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return {
    base64,
    folderName,
    filename: `${folderName}.zip`,
    noteCount: notes.length,
  };
}

/**
 * Fetches all notes for the user, writes a zip to the cache directory, and shares it.
 */
export async function exportAllNotesAsZip(userId: string): Promise<BatchExportResult> {
  if (!userId) {
    throw new Error('You must be signed in to export notes.');
  }

  const notes = await getUserNotes(userId);
  if (notes.length === 0) {
    throw new Error('You have no notes to export yet.');
  }

  const { base64, filename, noteCount } = await createNotesExportZipBase64(notes);

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('File system cache is unavailable on this device.');
  }

  const uri = `${cacheDir}${filename}`;
  await FileSystem.writeAsStringAsync(uri, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  if (Platform.OS === 'web') {
    // Sharing API is limited on web; still return the written URI for callers.
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
