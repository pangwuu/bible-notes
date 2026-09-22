/**
 * Swedish Method constants, section headers, and semantic color linkages.
 * Governed strictly by DESIGN.md and PROJECT.md.
 */

import { colors } from './theme';

export interface SwedishSectionConfig {
  key: 'keyIdea' | 'question' | 'application';
  symbol: string;
  name: string;
  headerMarkdown: string;
  color: string;
  description: string;
}

export const SWEDISH_SECTIONS: readonly SwedishSectionConfig[] = [
  {
    key: 'keyIdea',
    symbol: '💡',
    name: 'Key Idea',
    headerMarkdown: '### 💡 Key Idea(s)',
    color: colors.accent.keyIdea,
    description: 'What is the main truth, light, or central takeaway in this passage?',
  },
  {
    key: 'question',
    symbol: '❓',
    name: 'Question',
    headerMarkdown: '### ❓ Question(s)',
    color: colors.accent.question,
    description: 'What is unclear, difficult, or calls for deeper inquiry or reflection?',
  },
  {
    key: 'application',
    symbol: '🏹',
    name: 'Application',
    headerMarkdown: '### 🏹 Application(s)',
    color: colors.accent.application,
    description: 'How does this truth strike your personal life, attitude, or daily actions?',
  },
] as const;

export const SWEDISH_TEMPLATE_MARKDOWN = `### 💡 Key Idea(s)


### ❓ Question(s)


### 🏹 Application(s)
`;
