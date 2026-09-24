import { NoteTemplate } from '../types/template';
import { NoteSectionValue } from '../types/note';
import { colors } from './theme';

export const BUILT_IN_TEMPLATES: NoteTemplate[] = [
  {
    id: 'swedish',
    name: 'Swedish Method',
    description: 'Discover light, raise questions, and apply truth.',
    icon: 'bulb-outline',
    isBuiltIn: true,
    sections: [
      {
        id: 'light',
        title: 'Key Idea',
        icon: 'bulb-outline',
        color: colors.accent.keyIdea,
        placeholder: 'What is a new thing you have learned from this passage?',
      },
      {
        id: 'question',
        title: 'Question',
        icon: 'help-circle-outline',
        color: colors.accent.question,
        placeholder: 'What is unclear, difficult, or challenging to understand?',
      },
      {
        id: 'arrow',
        title: 'Application',
        icon: 'footsteps-outline',
        color: colors.accent.application,
        placeholder: 'How does this truth strike your personal walk today?',
      },
    ],
  },
  {
    id: 'soap',
    name: 'SOAP Study',
    description: 'Scripture, Observation, Application, and Prayer.',
    icon: 'water-outline',
    isBuiltIn: true,
    sections: [
      {
        id: 'scripture',
        title: 'Scripture',
        icon: 'book-outline',
        color: colors.accent.keyIdea,
        placeholder: 'Which verse(s) stood out to you?',
      },
      {
        id: 'observation',
        title: 'Observation',
        icon: 'search-outline',
        color: colors.accent.question,
        placeholder: 'What is happening in this text? Who is speaking, and what is the context?',
      },
      {
        id: 'application',
        title: 'Application',
        icon: 'footsteps-outline',
        color: colors.accent.application,
        placeholder: 'How does this apply personally to your life and relationships?',
      },
      {
        id: 'prayer',
        title: 'Prayer',
        icon: 'heart-outline',
        color: colors.accent.social,
        placeholder: 'Write a response prayer asking God to help you live this out.',
      },
    ],
  },
  {
    id: 'inductive',
    name: 'Inductive Method',
    description: 'Observation, interpretation, application.',
    icon: 'search-outline',
    isBuiltIn: true,
    sections: [
      {
        id: 'observation',
        title: 'Observation',
        icon: 'eye-outline',
        color: colors.accent.question,
        placeholder: 'What does the passage say? Notice repeated words, contrasts, and structure.',
      },
      {
        id: 'interpretation',
        title: 'Interpretation',
        icon: 'bulb-outline',
        color: colors.accent.keyIdea,
        placeholder: 'What did the passage mean to the original author and audience?',
      },
      {
        id: 'application',
        title: 'Application',
        icon: 'footsteps-outline',
        color: colors.accent.application,
        placeholder: 'What does this passage mean for me today?',
      },
    ],
  },
  {
    id: 'head_heart_hands',
    name: 'Head Heart Hands',
    description: 'Engage your mind, examine your affections, and act in obedience.',
    icon: 'heart-outline',
    isBuiltIn: true,
    sections: [
      {
        id: 'head',
        title: 'Head (Mind)',
        icon: 'bulb-outline',
        color: colors.accent.keyIdea,
        placeholder: 'What did I learn?',
      },
      {
        id: 'heart',
        title: 'Heart (Impact)',
        icon: 'heart-outline',
        color: colors.accent.social,
        placeholder: 'What convictions did this stir in me?',
      },
      {
        id: 'hands',
        title: 'Hands (Action)',
        icon: 'hand-right-outline',
        color: colors.accent.application,
        placeholder: 'How can I repent in light of this passage?',
      },
    ],
  },
  {
    id: 'blank',
    name: 'Blank Note',
    description: 'Open-ended reflection without structured prompts.',
    icon: 'document-text-outline',
    isBuiltIn: true,
    sections: [
      {
        id: 'notes',
        title: 'Notes',
        icon: 'pencil-outline',
        color: colors.accent.keyIdea,
        placeholder: 'Write your thoughts, reflections, or sermon notes here...',
      },
    ],
  },
];

export const DEFAULT_TEMPLATE = BUILT_IN_TEMPLATES[0]; // Swedish Method

/**
 * Resolves a purposeful accent color for a template section.
 * Falls back to semantic colors based on section role rather than plain grey.
 */
export function getSectionColor(secId: string, customColor?: string): string {
  if (customColor) return customColor;
  switch (secId.toLowerCase()) {
    case 'light':
    case 'scripture':
    case 'head':
    case 'interpretation':
    case 'notes':
      return colors.accent.keyIdea;
    case 'question':
    case 'observation':
      return colors.accent.question;
    case 'arrow':
    case 'application':
    case 'hands':
      return colors.accent.application;
    case 'prayer':
    case 'heart':
      return colors.accent.social;
    default:
      return colors.accent.keyIdea;
  }
}

/**
 * Find a template by id from built-ins or user custom templates.
 */
export function getTemplateById(
  id?: string,
  customTemplates: NoteTemplate[] = []
): NoteTemplate {
  if (!id) return DEFAULT_TEMPLATE;
  const found =
    customTemplates.find((t) => t.id === id) ||
    BUILT_IN_TEMPLATES.find((t) => t.id === id);
  return found || DEFAULT_TEMPLATE;
}

/**
 * Compiles a list of sections into unified markdown document format.
 */
export function compileSectionsToMarkdown(sections: NoteSectionValue[]): string {
  if (!sections || sections.length === 0) return '';
  return sections
    .map((sec) => {
      const headerTitle = sec.title.trim();
      const content = sec.content ? sec.content.trim() : '';
      return `### ${headerTitle}\n${content}`.trimEnd();
    })
    .join('\n\n');
}

/**
 * Initializes empty section values for a given template.
 */
export function initializeSectionValues(template: NoteTemplate): NoteSectionValue[] {
  return template.sections.map((s) => ({
    id: s.id,
    title: s.title,
    icon: s.icon,
    color: s.color,
    content: '',
  }));
}
