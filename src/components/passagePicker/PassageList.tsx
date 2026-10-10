import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { PassageSegment } from '../../types/note';
import { formatSegmentDisplay } from '../../utils/passageParser';
import { styles } from './styles';

interface PassageListProps {
  segments: PassageSegment[];
  editingIndex: number | null;
  liveLabel: string | null;
  onMove: (index: number, direction: 'up' | 'down') => void;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
}

export const PassageList: React.FC<PassageListProps> = ({
  segments,
  editingIndex,
  liveLabel,
  onMove,
  onEdit,
  onDelete,
}) => {
  const canReorder = segments.length > 1;

  return (
    <ScrollView
      style={styles.passageList}
      contentContainerStyle={styles.passageListContent}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
    >
      {segments.map((segment, index) => {
        const isEditing = editingIndex === index;
        const label = isEditing && liveLabel ? liveLabel : formatSegmentDisplay(segment);
        const isFirst = index === 0;
        const isLast = index === segments.length - 1;

        return (
          <View
            key={`${segment.book}-${segment.startChapter}-${segment.startVerse}-${segment.endChapter}-${segment.endVerse}-${index}`}
            style={[styles.passageRow, isEditing && styles.passageRowEditing]}
          >
            <Text style={styles.passageReference}>{label}</Text>
            {isEditing && <Text style={styles.editingCaption}>Editing</Text>}
            <View style={styles.passageActions}>
              {canReorder && (
                <Pressable
                  style={[styles.textAction, isFirst && styles.textActionDisabled]}
                  disabled={isFirst}
                  onPress={() => onMove(index, 'up')}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isFirst }}
                  accessibilityLabel={`Move ${label} up`}
                >
                  <Text style={styles.textActionLabel}>Up</Text>
                </Pressable>
              )}
              {canReorder && (
                <Pressable
                  style={[styles.textAction, isLast && styles.textActionDisabled]}
                  disabled={isLast}
                  onPress={() => onMove(index, 'down')}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isLast }}
                  accessibilityLabel={`Move ${label} down`}
                >
                  <Text style={styles.textActionLabel}>Down</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.textAction, isEditing && styles.textActionDisabled]}
                disabled={isEditing}
                onPress={() => onEdit(index)}
                accessibilityRole="button"
                accessibilityState={{ disabled: isEditing }}
                accessibilityLabel={`Edit ${label}`}
              >
                <Text style={styles.textActionLabel}>Edit</Text>
              </Pressable>
              <Pressable
                style={styles.textAction}
                onPress={() => onDelete(index)}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${label}`}
              >
                <Text style={[styles.textActionLabel, styles.textActionDanger]}>Delete</Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};
