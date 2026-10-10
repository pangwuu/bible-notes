import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '../../constants/theme';
import { BibleReaderProps, SYSTEM_FONTS, buildScriptureHtml, SectionOption } from './types';
import { useBibleReader } from './useBibleReader';
import { BibleReaderHeader } from './BibleReaderHeader';
import { TranslationSelector } from './TranslationSelector';
import { VerseActionBar } from './VerseActionBar';
import { ScriptureView } from './ScriptureView';
import FontSizeControls from '../FontSizeControls';

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
  } = props;

  const {
    selectedVersionId,
    setSelectedVersionId,
    selectedTranslation,
    setSelectedTranslation,
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
  } = useBibleReader(props);

  return (
    <View style={[styles.container, style]}>
      <BibleReaderHeader
        passageDisplay={passageDisplay}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {!collapsed && (
        <View style={styles.contentBody}>
          <View style={styles.translationRow}>
            <View style={styles.translationSelectorWrapper}>
              <TranslationSelector
                selectedTranslation={selectedTranslation}
                selectedVersionId={selectedVersionId}
                onSelectTranslation={setSelectedTranslation}
                onSelectVersion={setSelectedVersionId}
              />
            </View>
            {onOpenVersionGuide && (
              <Pressable
                onPress={onOpenVersionGuide}
                style={styles.versionGuideButton}
                accessibilityRole="button"
                accessibilityLabel="About Bible versions"
                hitSlop={8}
              >
                <Ionicons name="information-circle-outline" size={20} color={colors.text.secondary} />
              </Pressable>
            )}
          </View>

          {onFontSizeChange && (
            <View style={styles.readerControlsRow}>
              <FontSizeControls
                initialSize={fontSize}
                onSizeChange={onFontSizeChange}
              />
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
            actionSlot={
              <VerseActionBar
                sortedSelectedVerses={sortedSelectedVerses}
                linkedSectionsToJump={linkedSectionsToJump}
                availableSections={availableSections}
                targetPassage={targetPassage}
                activeContext={activeContext}
                onClearSelection={clearSelectedVerses}
                onShareSelected={handleShareSelected}
                onJumpToSection={onJumpToSection}
                onAttachToSection={onAttachToSection}
              />
            }
          />
        </View>
      )}
    </View>
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
  translationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  translationSelectorWrapper: {
    flex: 1,
  },
  versionGuideButton: {
    padding: spacing.xs,
  },
  readerControlsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
});

export const BibleReader = React.memo(BibleReaderComponent);
export default BibleReader;
