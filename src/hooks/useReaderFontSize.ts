import { useState, useEffect, useCallback } from 'react';
import safeStorage from '../utils/safeStorage';

const STORAGE_KEY = 'bible_font_size';
const MIN_FONT_SIZE = 12;
const MAX_FONT_SIZE = 26;
const DEFAULT_FONT_SIZE = 16;
const FONT_STEP = 2;

export function useReaderFontSize(initialDefault: number = DEFAULT_FONT_SIZE) {
  const [readerFontSize, setReaderFontSize] = useState<number>(initialDefault);

  useEffect(() => {
    let isMounted = true;
    safeStorage.getItem(STORAGE_KEY).then((stored) => {
      if (isMounted && stored !== null) {
        const parsed = parseInt(stored, 10);
        if (!isNaN(parsed) && parsed >= MIN_FONT_SIZE && parsed <= MAX_FONT_SIZE) {
          setReaderFontSize(parsed);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const persistFontSize = useCallback((size: number) => {
    const clamped = Math.max(MIN_FONT_SIZE, Math.min(MAX_FONT_SIZE, size));
    setReaderFontSize(clamped);
    safeStorage.setItem(STORAGE_KEY, String(clamped)).catch(() => {});
  }, []);

  const increaseFontSize = useCallback(() => {
    setReaderFontSize((prev) => {
      const next = Math.min(MAX_FONT_SIZE, prev + FONT_STEP);
      safeStorage.setItem(STORAGE_KEY, String(next)).catch(() => {});
      return next;
    });
  }, []);

  const decreaseFontSize = useCallback(() => {
    setReaderFontSize((prev) => {
      const next = Math.max(MIN_FONT_SIZE, prev - FONT_STEP);
      safeStorage.setItem(STORAGE_KEY, String(next)).catch(() => {});
      return next;
    });
  }, []);

  return {
    readerFontSize,
    setReaderFontSize: persistFontSize,
    increaseFontSize,
    decreaseFontSize,
    minFontSize: MIN_FONT_SIZE,
    maxFontSize: MAX_FONT_SIZE,
  };
}
