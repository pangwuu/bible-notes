import React, { useState, useCallback } from 'react';
import { PassageReference, formatPassageDisplay } from '../types/note';
import { createPassageReference } from '../utils/passageParser';
import { findCanonicalBook } from '../constants/bibleData';
import { fetchPassageText } from '../services/bibleService';
import { extractVerseRangeText, extractSelectedVersesText } from '../utils/verseLinkUtils';
import VersePreviewModal from '../components/VersePreviewModal';
import { isInTab } from '../utils/crossReferenceParser';

export interface VersePreviewContext {
  book?: string;
  chapter?: number;
  verses?: number[];
}

import { BibleTranslation } from '../types/user';

export interface PreviewVerseData {
  visible: boolean;
  startVerse: number;
  endVerse: number;
  book?: string;
  chapter?: number;
  verses?: number[];
  verseText: string;
  loading: boolean;
  canJumpToPassage?: boolean;
}

export interface UseVersePreviewOptions {
  passage?: PassageReference | null;
  translation?: BibleTranslation;
  esvApiKey?: string;
  onViewInContext?: (data: PreviewVerseData) => void;
}

export function useVersePreview({
  passage,
  translation = 'ESV',
  esvApiKey,
  onViewInContext,
}: UseVersePreviewOptions = {}) {
  const [previewVerseData, setPreviewVerseData] = useState<PreviewVerseData>({
    visible: false,
    startVerse: 1,
    endVerse: 1,
    verseText: '',
    loading: false,
    canJumpToPassage: true,
  });

  const openVersePreview = useCallback(
    async (
      startVerse: number,
      endVerse: number,
      context?: VersePreviewContext,
      canJumpToPassage?: boolean
    ) => {
      let computedCanJump = canJumpToPassage;
      if (computedCanJump === undefined) {
        if (context?.book && typeof context?.chapter === 'number') {
          const targetVerses =
            context.verses && context.verses.length > 0
              ? context.verses
              : Array.from({ length: endVerse - startVerse + 1 }, (_, i) => startVerse + i);
          computedCanJump = isInTab(
            {
              type: 'simple',
              raw: '',
              segments: [
                {
                  book: context.book,
                  chapter: context.chapter,
                  verses: targetVerses,
                  startVerse,
                  endVerse,
                },
              ],
            },
            passage
          );
        } else {
          // Legacy relative without explicit book/chapter
          computedCanJump = false;
        }
      }

      setPreviewVerseData({
        visible: true,
        startVerse,
        endVerse,
        book: context?.book,
        chapter: context?.chapter,
        verses: context?.verses,
        verseText: '',
        loading: true,
        canJumpToPassage: computedCanJump,
      });

      let targetPassage = passage;
      if (context?.book) {
        const meta = findCanonicalBook(context.book);
        if (meta) {
          const ch =
            typeof context.chapter === 'number' && context.chapter >= 1 && context.chapter <= meta.chapters
              ? context.chapter
              : passage?.segments?.[0]?.startChapter || 1;
          try {
            targetPassage = createPassageReference([
              {
                book: meta.name,
                startChapter: ch,
                startVerse,
                endChapter: ch,
                endVerse,
              },
            ]);
          } catch (createErr) {
            console.warn('Failed to build passage reference for preview:', createErr);
          }
        }
      }

      if (!targetPassage) {
        setPreviewVerseData((prev) => ({ ...prev, loading: false }));
        return;
      }

      try {
        const res = await fetchPassageText(targetPassage, {
          translation,
          esvApiKey,
        });

        const text =
          context?.verses && context.verses.length > 0
            ? extractSelectedVersesText(res.verses || [], context.verses)
            : extractVerseRangeText(res.verses || [], startVerse, endVerse);

        setPreviewVerseData((prev) => ({
          ...prev,
          verseText: text,
          loading: false,
        }));
      } catch (err) {
        console.warn('Failed to load verse preview text:', err);
        setPreviewVerseData((prev) => ({ ...prev, loading: false }));
      }
    },
    [passage, translation, esvApiKey]
  );

  const closeVersePreview = useCallback(() => {
    setPreviewVerseData((prev) => ({ ...prev, visible: false }));
  }, []);

  const handleViewInContext = useCallback(() => {
    if (onViewInContext) {
      onViewInContext(previewVerseData);
    }
  }, [onViewInContext, previewVerseData]);

  const renderVersePreviewModal = useCallback(() => {
    return (
      <VersePreviewModal
        visible={previewVerseData.visible}
        onClose={closeVersePreview}
        passageRef={passage ? formatPassageDisplay(passage) : ''}
        startVerse={previewVerseData.startVerse}
        endVerse={previewVerseData.endVerse}
        book={previewVerseData.book}
        chapter={previewVerseData.chapter}
        verses={previewVerseData.verses}
        verseText={previewVerseData.verseText}
        loading={previewVerseData.loading}
        translation={translation}
        canJumpToPassage={previewVerseData.canJumpToPassage}
        onViewInContext={onViewInContext ? handleViewInContext : undefined}
      />
    );
  }, [previewVerseData, closeVersePreview, passage, translation, onViewInContext, handleViewInContext]);

  return {
    previewVerseData,
    setPreviewVerseData,
    openVersePreview,
    closeVersePreview,
    renderVersePreviewModal,
  };
}
