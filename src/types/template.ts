import { Ionicons } from '@expo/vector-icons';

export type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

export interface NoteTemplateSection {
  id: string;               // Unique id within the template, e.g. 'key_idea', 'observation', 'sec_1'
  title: string;            // Display title, e.g. 'Key Idea', 'Observation'
  icon?: string;            // Ionicons name or emoji symbol, e.g. 'bulb-outline' or '💡'
  color?: string;           // Custom hex accent color (e.g. '#E3A53D')
  placeholder?: string;     // Helper prompt for the input field
}

export interface NoteTemplate {
  id: string;               // e.g. 'swedish' | 'soap' | 'inductive' | 'head_heart_hands' | 'blank' | uuid
  name: string;             // Display name, e.g. 'Swedish Method'
  description: string;      // Short 1-sentence explanation of methodology
  icon: string;             // Ionicons name for template pill/card, e.g. 'bulb-outline'
  color?: string;           // Template accent color
  isBuiltIn?: boolean;      // True for system built-in templates (uneditable/undeletable)
  sections: NoteTemplateSection[]; // 1 to 10 sections
  created_at?: number;
  updated_at?: number;
}

export const TEMPLATE_MAX_SECTIONS = 10;

/**
 * Curated accessible palette matching DESIGN.md tokens
 */
export const CURATED_TEMPLATE_COLORS: string[] = [
  '#E3A53D', // Amber / Illumination (Key Idea)
  '#5B93C4', // Cool Blue (Inquiry / Question)
  '#7BA05B', // Sage Green (Application / Action)
  '#B4789E', // Dusty Plum (Community / Prayer)
  '#C4664F', // Brick Red (Conviction / Warning)
  '#D4A359', // Warm Ochre
  '#4B9B94', // Soft Spruce Teal
  '#9584B8', // Muted Lavender
];

/**
 * Curated palette of Ionicons suitable for Bible study and note templates.
 */
export const CURATED_TEMPLATE_ICONS: string[] = [
  'bulb-outline',
  'water-outline',
  'search-outline',
  'heart-outline',
  'document-text-outline',
  'book-outline',
  'bookmark-outline',
  'flame-outline',
  'compass-outline',
  'shield-outline',
  'pencil-outline',
  'chatbox-outline',
  'help-circle-outline',
  'footsteps-outline',
  'star-outline',
  'sparkles-outline',
  'flag-outline',
  'cross',
  'hand-right-outline',
  'eye-outline',
  'sunny-outline',
  'moon-outline',
  'key-outline',
  'library-outline',
];
