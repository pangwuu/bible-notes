import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { PassageSegment } from '../../types/note';
import { formatSegmentDisplay } from '../../utils/passageParser';
import { styles } from './styles';

interface SegmentTrayProps {
  segments: PassageSegment[];
  onRemoveSegment: (index: number) => void;
}

export const SegmentTray: React.FC<SegmentTrayProps> = ({
  segments,
  onRemoveSegment,
}) => {
  if (segments.length === 0) {
    return null;
  }

  return (
    <View style={styles.stagedSegmentsContainer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.stagedSegmentsList}
      >
        {segments.map((seg, idx) => (
          <View key={idx} style={styles.stagedSegmentChip}>
            <Text style={styles.stagedSegmentText}>
              {formatSegmentDisplay(seg)}
            </Text>
            <Pressable
              hitSlop={6}
              onPress={() => onRemoveSegment(idx)}
              style={styles.removeSegmentButton}
            >
              <Text style={styles.removeSegmentIcon}>✕</Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};
