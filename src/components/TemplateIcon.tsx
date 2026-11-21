import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export interface TemplateIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

/**
 * Hybrid Icon Component:
 * Dispatches to MaterialCommunityIcons for faith/thematic glyphs not present in Ionicons (such as 'cross'),
 * and defaults to Ionicons for standard UI iconography.
 */
export const TemplateIcon: React.FC<TemplateIconProps> = ({
  name,
  size = 16,
  color,
  style,
}) => {
  if (name === 'cross' || name === 'cross-outline') {
    return <MaterialCommunityIcons name={name as any} size={size} color={color} style={style} />;
  }

  return <Ionicons name={(name as any) || 'document-text-outline'} size={size} color={color} style={style} />;
};

export default TemplateIcon;
