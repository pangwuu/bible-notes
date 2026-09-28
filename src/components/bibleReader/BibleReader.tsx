import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../constants/theme';
import { BibleReaderProps, SYSTEM_FONTS, buildScriptureHtml, SectionOption } from './types';
import { useBibleReader } from './useBibleReader';
import { BibleReaderHeader } from './BibleReaderHeader';
import { TranslationSelector } from './TranslationSelector';
import { VerseActionBar } from './VerseActionBar';
import { ScriptureView } from './ScriptureView';

export { SYSTEM_FONTS, buildScriptureHtml, SectionOption, BibleReaderProps };

const BibleReaderComponent: React.FC<BibleReaderProps> = (props) => {
  const {
    style,
    targetHighlightedVerse,
    linkedVerseMap,
    onAttachToSection,
    onJumpToSection,
  } = props;

  const {
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
          <TranslationSelector
            selectedTranslation={selectedTranslation}
            onSelectTranslation={setSelectedTranslation}
          />

          <ScriptureView
            loading={loading}
            isOfflineEmpty={isOfflineEmpty}
            passageResult={passageResult}
            selectedTranslation={selectedTranslation}
            targetPassage={targetPassage}
            fontSize={fontSize}
            showVerseNumbers={showVerseNumbers}
            selectedVerses={selectedVerses}
            targetHighlightedVerse={targetHighlightedVerse}
            linkedVerseMap={linkedVerseMap}
            onToggleVerse={handleToggleVerse}
            onRetry={handleRetry}
            actionSlot={
              <VerseActionBar
                sortedSelectedVerses={sortedSelectedVerses}
                linkedSectionsToJump={linkedSectionsToJump}
                availableSections={availableSections}
                targetPassage={targetPassage}
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
});

export const BibleReader = React.memo(BibleReaderComponent);
export default BibleReader;
