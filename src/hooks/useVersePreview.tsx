import React, { useState, useCallback } from 'react';
import { PassageReference, formatPassageDisplay } from '../types/note';
import { createPassageReference } from '../utils/passageParser';
import { findCanonicalBook } from '../constants/bibleData';
import { fetchPassageText } from '../services/bibleService';
import { extractVerseRangeText, extractSelectedVersesText, formatVerseRangeLabel } from '../utils/verseLinkUtils';
import VersePreviewModal from '../components/VersePreviewModal';
import { isInTab } from '../utils/crossReferenceParser';
import { BibleTranslation } from '../types/user';
import { resolveVersionId, getVersionMetadata } from '../constants/bibleVersions';

export interface VersePreviewContext {
  book?: string;
  chapter?: number;
  verses?: number[];
  segments?: Array<{
    book: string;
    chapter: number;
    verses: number[];
    startVerse: number;
    endVerse: number;
  }>;
  customTitle?: string;
}

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
  customTitle?: string;
  attribution?: string;
}

export interface UseVersePreviewOptions {
  passage?: PassageReference | null;
  translation?: BibleTranslation;
  versionId?: number;
  esvApiKey?: string;
  onViewInContext?: (data: PreviewVerseData) => void;
}

export function useVersePreview({
  passage,
  translation = 'NIV',
  versionId: propVersionId,
  esvApiKey,
  onViewInContext,
}: UseVersePreviewOptions = {}) {
  const effectiveVersionId = propVersionId ?? resolveVersionId(translation);
  const versionMeta = getVersionMetadata(effectiveVersionId);

  const [previewVerseData, setPreviewVerseData] = useState<PreviewVerseData>({
    visible: false,
    startVerse: 1,
    endVerse: 1,
    verseText: '',
    loading: false,
    canJumpToPassage: true,
    attribution: versionMeta.fullName,
  });

  const openVersePreview = useCallback(
    async (
      startVerse: number,
      endVerse: number,
      context?: VersePreviewContext,
      canJumpToPassage?: boolean
    ) => {
      let computedCanJump = canJumpToPassage;
      const isCompound = context?.segments && context.segments.length > 1;

      if (computedCanJump === undefined) {
        if (isCompound) {
          computedCanJump = false;
        } else if (context?.book && typeof context?.chapter === 'number') {
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
        customTitle: context?.customTitle,
        attribution: versionMeta.fullName,
      });

      // Handle Compound Multi-Segment Fetching
      if (isCompound && context?.segments) {
        try {
          const segmentBlocks: string[] = [];
          let lastAttribution = versionMeta.fullName;

          for (const seg of context.segments) {
            const meta = findCanonicalBook(seg.book);
            const bookName = meta ? meta.name : seg.book;
            const heading = `${bookName} ${seg.chapter}:${formatVerseRangeLabel(seg.startVerse, seg.endVerse, undefined, seg.verses)}`;
            try {
              const segPassage = createPassageReference([
                {
                  book: bookName,
                  startChapter: seg.chapter,
                  startVerse: seg.startVerse,
                  endChapter: seg.chapter,
                  endVerse: seg.endVerse,
                },
              ]);
              const res = await fetchPassageText(segPassage, { versionId: effectiveVersionId });
              if (res.attribution) lastAttribution = res.attribution;

              const segText = seg.verses && seg.verses.length > 0
                ? extractSelectedVersesText(res.verses || [], seg.verses)
                : extractVerseRangeText(res.verses || [], seg.startVerse, seg.endVerse);
              segmentBlocks.push(`${heading}\n${segText || 'No Scripture text available.'}`);
            } catch (segErr) {
              console.warn(`Failed to fetch segment ${heading}:`, segErr);
              segmentBlocks.push(`${heading}\nCould not load [${heading}].`);
            }
          }

          setPreviewVerseData((prev) => ({
            ...prev,
            verseText: segmentBlocks.join('\n\n'),
            loading: false,
            attribution: lastAttribution,
          }));
        } catch (err) {
          console.warn('Failed to load compound verse preview text:', err);
          setPreviewVerseData((prev) => ({ ...prev, loading: false }));
        }
        return;
      }

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
          versionId: effectiveVersionId,
        });

        const text =
          context?.verses && context.verses.length > 0
            ? extractSelectedVersesText(res.verses || [], context.verses)
            : extractVerseRangeText(res.verses || [], startVerse, endVerse);

        setPreviewVerseData((prev) => ({
          ...prev,
          verseText: text,
          loading: false,
          attribution: res.attribution || versionMeta.fullName,
        }));
      } catch (err) {
        console.warn('Failed to load verse preview text:', err);
        setPreviewVerseData((prev) => ({ ...prev, loading: false }));
      }
    },
    [passage, effectiveVersionId, versionMeta]
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
        translation={versionMeta.shortName}
        attribution={previewVerseData.attribution}
        canJumpToPassage={previewVerseData.canJumpToPassage}
        customTitle={previewVerseData.customTitle}
        onViewInContext={onViewInContext ? handleViewInContext : undefined}
      />
    );
  }, [previewVerseData, closeVersePreview, passage, versionMeta, onViewInContext, handleViewInContext]);

  return {
    previewVerseData,
    setPreviewVerseData,
    openVersePreview,
    closeVersePreview,
    renderVersePreviewModal,
  };
}
