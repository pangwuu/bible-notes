import JSZip from 'jszip';
import { Share } from 'react-native';
import {
  createNotesExportZipBase64,
  exportAllNotesAsZip,
  shareCombinedMarkdownExport,
  writeExportZipFile,
} from '../../src/services/batchNoteExportService';

jest.mock('expo-file-system', () => {
  const instance = {
    exists: false,
    uri: 'file:///cache/bible-notes-export.zip',
    create: jest.fn(),
    write: jest.fn(),
    delete: jest.fn(),
  };
  const File = jest.fn(() => instance) as jest.Mock & { __instance: typeof instance };
  File.__instance = instance;
  return {
    EncodingType: { Base64: 'base64', UTF8: 'utf8' },
    File,
    Paths: {
      cache: { uri: 'file:///cache/' },
      document: { uri: 'file:///documents/' },
    },
  };
});

const mockWriteAsStringAsync = jest.fn();
let mockLegacyCache: string | null = null;
let mockLegacyDocument: string | null = 'file:///documents/';

jest.mock('expo-file-system/legacy', () => ({
  get cacheDirectory() {
    return mockLegacyCache;
  },
  get documentDirectory() {
    return mockLegacyDocument;
  },
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
  writeAsStringAsync: (...args: any[]) => mockWriteAsStringAsync(...args),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn(),
}));

jest.mock('../../src/services/notesService', () => ({
  getUserNotes: jest.fn(),
}));

const getFileInstance = () =>
  (require('expo-file-system').File as jest.Mock & { __instance: any }).__instance;

describe('batchNoteExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLegacyCache = null;
    mockLegacyDocument = 'file:///documents/';
    const instance = getFileInstance();
    instance.uri = 'file:///cache/bible-notes-export.zip';
    instance.create.mockReset();
    instance.write.mockReset();
  });

  test('createNotesExportZipBase64 builds a zip with README and note markdown files', async () => {
    const { base64, filename, noteCount, folderName } = await createNotesExportZipBase64(
      [
        {
          id: 'n1',
          title: 'First',
          sections: [{ id: 'light', title: 'Key Idea', content: 'One' }],
        },
        {
          id: 'n2',
          title: 'Second',
          sections: [{ id: 'light', title: 'Key Idea', content: 'Two' }],
        },
      ],
      new Date('2026-10-12T00:00:00.000Z')
    );

    expect(noteCount).toBe(2);
    expect(folderName).toBe('bible-notes-export-2026-10-12');
    expect(filename).toBe('bible-notes-export-2026-10-12.zip');
    expect(base64.length).toBeGreaterThan(20);

    const zip = await JSZip.loadAsync(base64, { base64: true });
    const paths = Object.keys(zip.files).sort();
    expect(paths.some((p) => p.endsWith('README.md'))).toBe(true);
    expect(paths.some((p) => p.includes('notes/') && p.endsWith('.md'))).toBe(true);

    const readmePath = paths.find((p) => p.endsWith('README.md'))!;
    const readme = await zip.file(readmePath)!.async('string');
    expect(readme).toContain('Notes: 2');
    expect(readme).toContain('First');
  });

  test('writeExportZipFile uses modern File API', async () => {
    const instance = getFileInstance();
    const bytes = new Uint8Array([1, 2, 3]);
    const uri = await writeExportZipFile('export.zip', bytes, 'AQID');

    expect(instance.create).toHaveBeenCalledWith({ overwrite: true, intermediates: true });
    expect(instance.write).toHaveBeenCalledWith(bytes);
    expect(uri).toBe('file:///cache/bible-notes-export.zip');
    expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
  });

  test('writeExportZipFile falls back to legacy when modern API fails', async () => {
    const instance = getFileInstance();
    instance.create.mockImplementation(() => {
      throw new Error('native unavailable');
    });
    mockWriteAsStringAsync.mockResolvedValueOnce(undefined);

    const uri = await writeExportZipFile('export.zip', new Uint8Array([1]), 'AQ==');
    expect(uri).toBe('file:///documents/export.zip');
    expect(mockWriteAsStringAsync).toHaveBeenCalledWith(
      'file:///documents/export.zip',
      'AQ==',
      expect.objectContaining({ encoding: 'base64' })
    );
  });

  test('writeExportZipFile returns null when no filesystem is available', async () => {
    const instance = getFileInstance();
    instance.create.mockImplementation(() => {
      throw new Error('native unavailable');
    });
    mockLegacyCache = null;
    mockLegacyDocument = null;

    const uri = await writeExportZipFile('export.zip', new Uint8Array([1]), 'AQ==');
    expect(uri).toBeNull();
  });

  test('shareCombinedMarkdownExport uses RN Share without filesystem', async () => {
    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
    } as any);

    const result = await shareCombinedMarkdownExport(
      [
        {
          id: 'n1',
          title: 'First',
          sections: [{ id: 'light', title: 'Key Idea', content: 'One' }],
        },
      ],
      new Date('2026-10-12T00:00:00.000Z')
    );

    expect(result.format).toBe('markdown');
    expect(result.filename).toBe('bible-notes-export-2026-10-12.md');
    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Bible Notes export',
        message: expect.stringContaining('# First'),
      })
    );
  });

  test('exportAllNotesAsZip falls back to Markdown share when filesystem is unavailable', async () => {
    const { getUserNotes } = require('../../src/services/notesService');
    getUserNotes.mockResolvedValueOnce([
      {
        id: 'n1',
        title: 'First',
        sections: [{ id: 'light', title: 'Key Idea', content: 'One' }],
      },
    ]);

    const instance = getFileInstance();
    instance.create.mockImplementation(() => {
      throw new Error('native unavailable');
    });
    mockLegacyCache = null;
    mockLegacyDocument = null;

    const shareSpy = jest.spyOn(Share, 'share').mockResolvedValue({
      action: Share.sharedAction,
    } as any);

    const result = await exportAllNotesAsZip('user-1');

    expect(result.format).toBe('markdown');
    expect(result.noteCount).toBe(1);
    expect(result.uri).toBeUndefined();
    expect(shareSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('# First'),
      })
    );
  });
});
