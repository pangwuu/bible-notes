import JSZip from 'jszip';
import {
  createNotesExportZipBase64,
  resolveExportDirectory,
  writeExportZipFile,
} from '../../src/services/batchNoteExportService';

const mockCreate = jest.fn();
const mockWrite = jest.fn();
const mockFileInstance = {
  exists: false,
  uri: 'file:///cache/bible-notes-export.zip',
  create: mockCreate,
  write: mockWrite,
  delete: jest.fn(),
};

jest.mock('expo-file-system', () => ({
  File: jest.fn(() => mockFileInstance),
  Paths: {
    cache: { uri: 'file:///cache/' },
    document: { uri: 'file:///documents/' },
  },
}));

const mockWriteAsStringAsync = jest.fn();

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: null,
  documentDirectory: 'file:///documents/',
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

describe('batchNoteExportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFileInstance.uri = 'file:///cache/bible-notes-export.zip';
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

  test('resolveExportDirectory prefers cache when available', () => {
    expect(resolveExportDirectory().uri).toBe('file:///cache/');
  });

  test('writeExportZipFile uses modern File API', async () => {
    const bytes = new Uint8Array([1, 2, 3]);
    const uri = await writeExportZipFile('export.zip', bytes, 'AQID');

    expect(mockCreate).toHaveBeenCalledWith({ overwrite: true });
    expect(mockWrite).toHaveBeenCalledWith(bytes);
    expect(uri).toBe('file:///cache/bible-notes-export.zip');
    expect(mockWriteAsStringAsync).not.toHaveBeenCalled();
  });

  test('writeExportZipFile falls back to legacy when modern API fails', async () => {
    mockCreate.mockImplementationOnce(() => {
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
});
