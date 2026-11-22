import React, { useCallback, useContext, useEffect, useState } from 'react';
import { View, StyleSheet, Keyboard } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { colors, spacing, radius } from '../../constants/theme';
import { BibleReaderProps, SYSTEM_FONTS, buildScriptureHtml, SectionOption } from './types';
import { useBibleReader } from './useBibleReader';
import { BibleReaderHeader } from './BibleReaderHeader';
import { TranslationSheet } from './TranslationSheet';
import { getVersionMetadata } from '../../constants/bibleVersions';
import { VerseActionBar } from './VerseActionBar';
import { DockedActionBar } from './DockedActionBar';
import { ScriptureView } from './ScriptureView';
import { CrossReferencesSheet, versesForTarget } from './CrossReferencesSheet';
import FontSizeControls from '../FontSizeControls';
import { CrossReferenceTarget, segmentContains } from '../../services/crossReferenceService';
import { PassageSegment } from '../../types/note';

export { SYSTEM_FONTS, buildScriptureHtml, SectionOption, BibleReaderProps };

const BibleReaderComponent: React.FC<BibleReaderProps> = (props) => {
  const {
    style,
    targetHighlightedVerse,
    linkedVerseMap,
    onAttachToSection,
    onJumpToSection,
    onFontSizeChange,
    onOpenVersionGuide,
    actionBarPlacement = 'inline',
    onDockedActionBarHeightChange,
  } = props;
  const isDocked = actionBarPlacement === 'docked';
  const [translationSheetOpen, setTranslationSheetOpen] = useState(false);
  const [textSizeOpen, setTextSizeOpen] = useState(false);

  const {
    selectedVersionId,
    setSelectedVersionId,
    selectedTranslation,
    passageResult,
    loading,
    collapsed,
    setCollapsed,
    showVerseNumbers,
    fontSize,
    selectedVerses,
    sortedSelectedVerses,
    activeContext,
    targetPassage,
    passageDisplay,
    isOfflineEmpty,
    linkedSectionsToJump,
    availableSections,
    handleToggleVerse,
    clearSelectedVerses,
    handleShareSelected,
    handleRetry,
    handleOpenCrossReferencesForSelection,
    selectedCrossReferenceCount,
    crossRefSheetVisible,
    crossRefSourceLabel,
    crossRefTargets,
    closeCrossReferences,
  } = useBibleReader(props);

  // A docked bar lives at the app root, so it must not outlive this screen's focus.
  const navigation = useContext(NavigationContext);
  useEffect(() => {
    if (!isDocked || !navigation) return;
    return navigation.addListener('blur', clearSelectedVerses);
  }, [isDocked, navigation, clearSelectedVerses]);

  const hasSelection = sortedSelectedVerses.length > 0;
  useEffect(() => {
    if (isDocked && hasSelection) Keyboard.dismiss();
  }, [isDocked, hasSelection]);

  const actionBar = (
    <VerseActionBar
      variant={isDocked ? 'docked' : 'inline'}
      sortedSelectedVerses={sortedSelectedVerses}
      linkedSectionsToJump={linkedSectionsToJump}
      availableSections={availableSections}
      targetPassage={targetPassage}
      activeContext={activeContext}
      onClearSelection={clearSelectedVerses}
      onShareSelected={handleShareSelected}
      onJumpToSection={onJumpToSection}
      onAttachToSection={onAttachToSection}
      onOpenCrossReferences={handleOpenCrossReferencesForSelection}
      crossReferenceCount={selectedCrossReferenceCount}
    />
  );

  const handleAttachCrossReference = useCallback(
    (target: CrossReferenceTarget, sectionId: string) => {
      if (!onAttachToSection) return;
      const verses = versesForTarget(target);
      onAttachToSection(verses, sectionId, {
        book: target.book,
        chapter: target.startChapter,
      });
      closeCrossReferences();
    },
    [onAttachToSection, closeCrossReferences]
  );

  const isPassageIncluded = useCallback(
    (segment: PassageSegment) =>
      (props.passage?.segments || []).some((existing) => segmentContains(existing, segment)),
    [props.passage]
  );

  return (
    <>
      <View style={[styles.container, style]}>
        <BibleReaderHeader
          passageDisplay={passageDisplay}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed(!collapsed)}
          translationLabel={getVersionMetadata(selectedVersionId).shortName}
          onOpenTranslations={() => setTranslationSheetOpen(true)}
          onToggleTextSize={onFontSizeChange ? () => setTextSizeOpen((open) => !open) : undefined}
          textSizeOpen={textSizeOpen}
        />

        {!collapsed && (
          <View style={styles.contentBody}>
            {onFontSizeChange && textSizeOpen && (
              <View style={styles.readerControlsRow}>
                <FontSizeControls initialSize={fontSize} onSizeChange={onFontSizeChange} />
              </View>
            )}

            <ScriptureView
              loading={loading}
              isOfflineEmpty={isOfflineEmpty}
              passageResult={passageResult}
              selectedTranslation={selectedTranslation}
              targetPassage={targetPassage}
              fontSize={fontSize}
              showVerseNumbers={showVerseNumbers}
              selectedVerses={selectedVerses}
              activeContext={activeContext}
              targetHighlightedVerse={targetHighlightedVerse}
              linkedVerseMap={linkedVerseMap}
              onToggleVerse={handleToggleVerse}
              onRetry={handleRetry}
              onVerseLayout={props.onVerseLayout}
              actionSlot={isDocked ? null : actionBar}
            />
          </View>
        )}
      </View>

      {isDocked && (
        <DockedActionBar
          visible={hasSelection && !collapsed && !crossRefSheetVisible}
          onHeightChange={onDockedActionBarHeightChange}
        >
          {actionBar}
        </DockedActionBar>
      )}

      <TranslationSheet
        visible={translationSheetOpen}
        selectedVersionId={selectedVersionId}
        onSelect={setSelectedVersionId}
        onClose={() => setTranslationSheetOpen(false)}
        onOpenVersionGuide={onOpenVersionGuide}
      />

      <CrossReferencesSheet
        visible={crossRefSheetVisible}
        onClose={closeCrossReferences}
        sourceLabel={crossRefSourceLabel}
        references={crossRefTargets}
        versionId={selectedVersionId}
        translationLabel={String(selectedTranslation)}
        availableSections={onAttachToSection ? availableSections : []}
        onAttachReference={onAttachToSection ? handleAttachCrossReference : undefined}
        onAddPassage={props.onAddPassageSegment}
        isPassageIncluded={isPassageIncluded}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.bg.surface,
    borderRadius: radius.content,
    borderWidth: 1,
    borderColor: colors.border.hairline,
    marginBottom: spacing.md,
    overflow: 'hidden',
  },
  contentBody: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.hairline,
  },
  readerControlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: spacing.sm,
  },
});

export const BibleReader = React.memo(BibleReaderComponent);
export default BibleReader;
