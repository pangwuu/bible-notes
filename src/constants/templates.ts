import { NoteTemplate } from '../types/template';
import { NoteSectionValue } from '../types/note';

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
        color: '#E3A53D',
        placeholder: 'What light or main truth shines out from this passage?',
      },
      {
        id: 'question',
        title: 'Question',
        icon: 'help-circle-outline',
        color: '#5B93C4',
        placeholder: 'What is unclear, difficult, or invites deeper inquiry?',
      },
      {
        id: 'arrow',
        title: 'Application',
        icon: 'footsteps-outline',
        color: '#7BA05B',
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
        placeholder: 'Which key verse or phrase stood out to you?',
      },
      {
        id: 'observation',
        title: 'Observation',
        icon: 'search-outline',
        placeholder: 'What is happening in this text? Who is speaking, and what is the context?',
      },
      {
        id: 'application',
        title: 'Application',
        icon: 'footsteps-outline',
        placeholder: 'How does this apply personally to your life and relationships?',
      },
      {
        id: 'prayer',
        title: 'Prayer',
        icon: 'heart-outline',
        placeholder: 'Write a response prayer asking God to help you live this out.',
      },
    ],
  },
  {
    id: 'inductive',
    name: 'Inductive Method',
    description: 'Observation, faithful interpretation, and personal application.',
    icon: 'search-outline',
    isBuiltIn: true,
    sections: [
      {
        id: 'observation',
        title: 'Observation',
        icon: 'eye-outline',
        placeholder: 'What does the passage say? Notice repeated words, contrasts, and structure.',
      },
      {
        id: 'interpretation',
        title: 'Interpretation',
        icon: 'bulb-outline',
        placeholder: 'What did the passage mean to the original author and audience?',
      },
      {
        id: 'application',
        title: 'Application',
        icon: 'footsteps-outline',
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
        placeholder: 'What did I learn about God, Christ, and human nature?',
      },
      {
        id: 'heart',
        title: 'Heart (Affections)',
        icon: 'heart-outline',
        placeholder: 'What convictions, desires, or worship did this stir in me?',
      },
      {
        id: 'hands',
        title: 'Hands (Action)',
        icon: 'hand-right-outline',
        placeholder: 'What concrete action or repentance am I called to take?',
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
        placeholder: 'Write your thoughts, reflections, or sermon notes here...',
      },
    ],
  },
];

export const DEFAULT_TEMPLATE = BUILT_IN_TEMPLATES[0]; // Swedish Method

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
