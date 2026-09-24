/**
 * Note domain interface, Firestore document schemas, and Swedish Method utilities.
 * Governed strictly by DESIGN.md, specs.md (§6.3), and firestore.rules.
 */

import { colors } from '../constants/theme';

export type NoteVisibility = 'friends' | 'private' | 'public';

/**
 * A discrete contiguous passage segment.
 */
export interface PassageSegment {
  book: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
}

/**
 * First-Class Passage Reference model.
 * Clean slate: display title, books list, and discrete segments.
 */
export interface PassageReference {
  display: string;           // e.g. "John 3:16, Romans 8:1–8"
  displayString?: string;     // alias for convenience
  books: string[];           // ["John", "Romans"]
  segments: PassageSegment[];
}

export interface NoteSectionValue {
  id: string;
  title: string;
  icon?: string;
  color?: string;
  content: string;
}

/**
 * Rich client-side domain entity.
 */
export interface Note {
  id: string;
  userId: string;
  user_id: string;
  authorUsername?: string;
  authorDisplayName?: string;
  author_username?: string;
  author_display_name?: string;

  passage: PassageReference;

  // Template metadata & dynamic sections
  templateId?: string;
  templateName?: string;
  sections?: NoteSectionValue[];

  // Swedish Method section contents
  lightContent: string;     // 💡 Key Idea
  questionContent: string;  // ❓ Question
  arrowContent: string;     // 🏹 Application

  // Unified Markdown document content
  content: string;

  tags: string[];
  visibility: NoteVisibility;

  createdAt: any;
  updatedAt: any;
  created_at: any;
  updated_at: any;
}

/**
 * Clean Firestore document schema directly mapped to Cloud Firestore collection `notes/{noteId}`.
 */
export interface NoteDocument {
  id: string;
  user_id: string;
  author_username?: string;
  author_display_name?: string;

  passage: {
    display: string;
    books: string[];
    segments: Array<{
      book: string;
      start_chapter: number;
      start_verse: number;
      end_chapter: number;
      end_verse: number;
    }>;
  };

  template_id?: string;
  template_name?: string;
  sections?: Array<{
    id: string;
    title: string;
    icon?: string;
    color?: string;
    content: string;
  }>;

  content: string;
  light_content: string;
  question_content: string;
  arrow_content: string;
  tags: string[];
  visibility: NoteVisibility;
  created_at: any;
  updated_at: any;
}

export interface CreateNoteInput {
  userId: string;
  authorUsername?: string;
  authorDisplayName?: string;
  passage: PassageReference;
  templateId?: string;
  templateName?: string;
  sections?: NoteSectionValue[];
  lightContent?: string;
  questionContent?: string;
  arrowContent?: string;
  content?: string;
  tags: string[];
  visibility?: NoteVisibility;
}

export interface UpdateNoteInput {
  passage?: PassageReference;
  templateId?: string;
  templateName?: string;
  sections?: NoteSectionValue[];
  lightContent?: string;
  questionContent?: string;
  arrowContent?: string;
  content?: string;
  tags?: string[];
  visibility?: NoteVisibility;
}

// ---------------------------------------------------------------------------
// Swedish Markdown Parser & Serializer Utilities
// ---------------------------------------------------------------------------

export const SWEDISH_HEADERS = {
  keyIdea: '### 💡 Key Idea(s)',
  question: '### ❓ Question(s)',
  application: '### 🏹 Application(s)',
} as const;

/**
 * Parses a markdown string into discrete Swedish Method sections.
 * Robust against swapped order, missing headers, extra blank lines, and emojis.
 */
export function parseSwedishMarkdown(content: string): {
  lightContent: string;
  questionContent: string;
  arrowContent: string;
} {
  if (!content || typeof content !== 'string') {
    return { lightContent: '', questionContent: '', arrowContent: '' };
  }

  // Find header positions using flexible regex matching symbol, heading title, or both
  const keyIdeaRegex = /###?\s*(?:💡\s*)?(?:Key Idea\(s\)|Key Idea|💡)/iu;
  const questionRegex = /###?\s*(?:❓\s*)?(?:Question\(s\)|Question|❓)/iu;
  const arrowRegex = /###?\s*(?:🏹\s*)?(?:Application\(s\)|Application|🏹)/iu;

  const mKey = keyIdeaRegex.exec(content);
  const mQue = questionRegex.exec(content);
  const mArr = arrowRegex.exec(content);

  const sections: { key: 'light' | 'question' | 'arrow'; index: number; length: number }[] = [];
  if (mKey) sections.push({ key: 'light', index: mKey.index, length: mKey[0].length });
  if (mQue) sections.push({ key: 'question', index: mQue.index, length: mQue[0].length });
  if (mArr) sections.push({ key: 'arrow', index: mArr.index, length: mArr[0].length });

  // Sort by appearance in markdown
  sections.sort((a, b) => a.index - b.index);

  const result = {
    lightContent: '',
    questionContent: '',
    arrowContent: '',
  };

  for (let i = 0; i < sections.length; i++) {
    const current = sections[i];
    const startIndex = current.index + current.length;
    const endIndex = i + 1 < sections.length ? sections[i + 1].index : content.length;
    const body = content.slice(startIndex, endIndex).trim();

    if (current.key === 'light') result.lightContent = body;
    else if (current.key === 'question') result.questionContent = body;
    else if (current.key === 'arrow') result.arrowContent = body;
  }

  return result;
}

/**
 * Assembles discrete Swedish Method sections into the canonical markdown document string.
 */
export function assembleSwedishMarkdown(
  lightContent: string,
  questionContent: string,
  arrowContent: string
): string {
  return `${SWEDISH_HEADERS.keyIdea}
${lightContent || ''}

${SWEDISH_HEADERS.question}
${questionContent || ''}

${SWEDISH_HEADERS.application}
${arrowContent || ''}
`;
}

/**
 * Formats a passage reference into standard reading format (e.g. "John 3:16–17", "Romans 8:1–11", "Genesis 1:1–3, 3:2–6").
 */
/**
 * Formats a passage reference into standard reading format (e.g. "John 3:16–17", "Romans 8:1–11").
 */
export function formatPassageDisplay(ref: {
  book?: string;
  startChapter?: number;
  startVerse?: number;
  endChapter?: number;
  endVerse?: number;
  display?: string;
  displayString?: string;
  segments?: PassageSegment[];
}): string {
  if (ref.display) {
    return ref.display;
  }
  if (ref.displayString) {
    return ref.displayString;
  }
  if (ref.segments && ref.segments.length > 0) {
    return ref.segments.map((s) => formatPassageDisplay(s)).join(', ');
  }
  const book = ref.book || '';
  const startChapter = ref.startChapter || 1;
  const startVerse = ref.startVerse || 1;
  const endChapter = ref.endChapter || startChapter;
  const endVerse = ref.endVerse || startVerse;

  if (startChapter === endChapter) {
    if (startVerse === endVerse) {
      return `${book} ${startChapter}:${startVerse}`;
    }
    return `${book} ${startChapter}:${startVerse}–${endVerse}`;
  }
  return `${book} ${startChapter}:${startVerse}–${endChapter}:${endVerse}`;
}

/**
 * Converts a raw Firestore document snapshot to the normalized Note domain model.
 */
export function noteDocumentToNote(data: any, id: string): Note {
  const parsedSections = data.content
    ? parseSwedishMarkdown(data.content)
    : {
        lightContent: data.light_content || '',
        questionContent: data.question_content || '',
        arrowContent: data.arrow_content || '',
      };

  let passage: PassageReference;

  if (data.passage && Array.isArray(data.passage.segments) && data.passage.segments.length > 0) {
    const rawSegs = data.passage.segments;
    const segments: PassageSegment[] = rawSegs.map((s: any) => ({
      book: s.book || '',
      startChapter: Number(s.start_chapter ?? s.chapter_start ?? s.startChapter ?? 1),
      startVerse: Number(s.start_verse ?? s.verse_start ?? s.startVerse ?? 1),
      endChapter: Number(s.end_chapter ?? s.chapter_end ?? s.endChapter ?? 1),
      endVerse: Number(s.end_verse ?? s.verse_end ?? s.endVerse ?? 1),
    }));

    const books: string[] = Array.isArray(data.passage.books)
      ? data.passage.books
      : Array.from(new Set(segments.map((s) => s.book)));

    const display =
      data.passage.display ||
      data.passage.displayString ||
      formatPassageDisplay({ segments });

    passage = {
      display,
      displayString: display,
      books,
      segments,
    };
  } else {
    // Basic fallback if missing
    const book = data.book || 'Romans';
    const singleSegment: PassageSegment = {
      book,
      startChapter: Number(data.chapter_start || 8),
      startVerse: Number(data.verse_start || 1),
      endChapter: Number(data.chapter_end || 8),
      endVerse: Number(data.verse_end || 11),
    };
    const display = formatPassageDisplay(singleSegment);
    passage = {
      display,
      displayString: display,
      books: [book],
      segments: [singleSegment],
    };
  }

  const userId = data.user_id || data.userId || '';
  const authorUsername = data.author_username || data.authorUsername || '';
  const authorDisplayName = data.author_display_name || data.authorDisplayName || '';
  const visibility: NoteVisibility = data.visibility || 'friends';
  const content =
    data.content ||
    assembleSwedishMarkdown(
      parsedSections.lightContent,
      parsedSections.questionContent,
      parsedSections.arrowContent
    );

  const createdAt = data.created_at || Date.now();
  const updatedAt = data.updated_at || Date.now();

  const lightContent = data.light_content ?? parsedSections.lightContent;
  const questionContent = data.question_content ?? parsedSections.questionContent;
  const arrowContent = data.arrow_content ?? parsedSections.arrowContent;

  let sections: NoteSectionValue[] = [];
  if (Array.isArray(data.sections) && data.sections.length > 0) {
    sections = data.sections.map((s: any) => ({
      id: s.id || '',
      title: s.title || '',
      icon: s.icon,
      color: s.color,
      content: s.content || '',
    }));
  } else {
    // Synthesize sections from Swedish fields if legacy/blank
    sections = [
      { id: 'light', title: 'Key Idea', icon: 'bulb-outline', color: colors.accent.keyIdea, content: lightContent },
      { id: 'question', title: 'Question', icon: 'help-circle-outline', color: colors.accent.question, content: questionContent },
      { id: 'arrow', title: 'Application', icon: 'footsteps-outline', color: colors.accent.application, content: arrowContent },
    ];
  }

  return {
    id,
    userId,
    user_id: userId,
    authorUsername,
    authorDisplayName,
    author_username: authorUsername,
    author_display_name: authorDisplayName,
    passage,
    templateId: data.template_id || data.templateId,
    templateName: data.template_name || data.templateName,
    sections,
    lightContent,
    questionContent,
    arrowContent,
    content,
    tags: Array.isArray(data.tags) ? data.tags : [],
    visibility,
    createdAt,
    updatedAt,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}
