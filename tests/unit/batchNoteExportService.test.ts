import JSZip from 'jszip';
import { createNotesExportZipBase64 } from '../../src/services/batchNoteExportService';

jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  EncodingType: { Base64: 'base64', UTF8: 'utf8' },
  writeAsStringAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn(),
}));

jest.mock('../../src/services/notesService', () => ({
  getUserNotes: jest.fn(),
}));

describe('createNotesExportZipBase64', () => {
  test('builds a zip with README and note markdown files', async () => {
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
});
