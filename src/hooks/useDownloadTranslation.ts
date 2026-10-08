import { useState, useCallback } from 'react';
import { BibleTranslation } from '../types/user';
import { CANONICAL_BOOKS } from '../constants/bibleData';
import { fetchChapterFromFirestore } from '../services/firestoreBibleService';
import { buildBibleCacheKey } from '../services/bibleService';
import safeStorage from '../utils/safeStorage';

export interface DownloadProgress {
  currentBook: string;
  currentChapter: number;
  totalChapters: number;
  completedChapters: number;
  percent: number;
  status: 'idle' | 'downloading' | 'completed' | 'error';
  error?: string;
}

const TOTAL_BIBLE_CHAPTERS = 1189;

/**
 * Hook to trigger and monitor full offline downloading of a Bible translation from Firestore into local safeStorage.
 */
export function useDownloadTranslation() {
  const [progress, setProgress] = useState<Record<string, DownloadProgress>>({});
  const [activeDownload, setActiveDownload] = useState<BibleTranslation | null>(null);

  const downloadTranslation = useCallback(
    async (translation: BibleTranslation) => {
      if (activeDownload) return; // Prevent concurrent downloads

      setActiveDownload(translation);
      let completed = 0;

      setProgress((prev) => ({
        ...prev,
        [String(translation)]: {
          currentBook: CANONICAL_BOOKS[0].name,
          currentChapter: 1,
          totalChapters: TOTAL_BIBLE_CHAPTERS,
          completedChapters: 0,
          percent: 0,
          status: 'downloading',
        },
      }));

      try {
        for (const book of CANONICAL_BOOKS) {
          for (let ch = 1; ch <= book.chapters; ch++) {
            try {
              const verses = await fetchChapterFromFirestore(translation, book.name, ch);
              const text = verses.map((v) => v.text).join(' ').trim();
              const query = `${book.name} ${ch}`;
              const cacheKey = buildBibleCacheKey(translation, query);

              // Cache chapter in safeStorage
              await safeStorage.setItem(
                cacheKey,
                JSON.stringify({
                  verses,
                  text,
                  translation,
                  source: 'firestore',
                  cached: true,
                })
              );
            } catch (err) {
              console.warn(`[useDownloadTranslation] Skipping chapter ${book.name} ${ch}:`, err);
            }

            completed++;
            const pct = Math.round((completed / TOTAL_BIBLE_CHAPTERS) * 100);

            // Update progress state periodically or per chapter
            setProgress((prev) => ({
              ...prev,
              [String(translation)]: {
                currentBook: book.name,
                currentChapter: ch,
                totalChapters: TOTAL_BIBLE_CHAPTERS,
                completedChapters: completed,
                percent: pct,
                status: completed === TOTAL_BIBLE_CHAPTERS ? 'completed' : 'downloading',
              },
            }));
          }
        }

        setProgress((prev) => ({
          ...prev,
          [String(translation)]: {
            currentBook: 'Completed',
            currentChapter: TOTAL_BIBLE_CHAPTERS,
            totalChapters: TOTAL_BIBLE_CHAPTERS,
            completedChapters: TOTAL_BIBLE_CHAPTERS,
            percent: 100,
            status: 'completed',
          },
        }));
      } catch (err: any) {
        setProgress((prev) => ({
          ...prev,
          [String(translation)]: {
            ...prev[String(translation)],
            status: 'error',
            error: err?.message || 'Failed to download translation',
          },
        }));
      } finally {
        setActiveDownload(null);
      }
    },
    [activeDownload]
  );

  return {
    downloadTranslation,
    progress,
    activeDownload,
    isDownloading: activeDownload !== null,
  };
}
