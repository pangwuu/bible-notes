/**
 * Note domain interface, Firestore document schemas, and Swedish Method utilities.
 * Governed strictly by DESIGN.md, specs.md (§6.3), and firestore.rules.
 */

export type NoteVisibility = 'friends' | 'private' | 'public';

export interface PassageReference {
  book: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
  startOrdinal: number;
  endOrdinal: number;
}

/**
 * Rich client-side domain entity.
 * Supports both modern TypeScript camelCase and Firestore snake_case properties
 * for seamless integration across UI screens and database layers.
 */
export interface Note {
  id: string;
  userId: string;
  user_id: string;
  authorUsername?: string;
  authorDisplayName?: string;
  author_username?: string;
  author_display_name?: string;

  // Structured passage reference
  passage: PassageReference;

  // Flat passage fields matching specs.md and firestore.indexes.json
  book: string;
  chapter_start: number;
  verse_start: number;
  chapter_end: number;
  verse_end: number;
  start_verse_id: number;
  end_verse_id: number;

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
 * Firestore document schema directly mapped to Cloud Firestore collection `notes/{noteId}`.
 * Enforces `request.resource.data.user_id == request.auth.uid`.
 */
export interface NoteDocument {
  id: string;
  user_id: string;
  author_username?: string;
  author_display_name?: string;
  book: string;
  chapter_start: number;
  verse_start: number;
  chapter_end: number;
  verse_end: number;
  start_verse_id: number;
  end_verse_id: number;
  content: string;
  light_content?: string;
  question_content?: string;
  arrow_content?: string;
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
  lightContent: string;
  questionContent: string;
  arrowContent: string;
  content?: string;
  tags: string[];
  visibility?: NoteVisibility;
}

export interface UpdateNoteInput {
  passage?: Partial<PassageReference>;
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

  // Find header positions using flexible regex matching symbol or heading title
  const keyIdeaRegex = /###?\s*💡\s*(?:Key Idea\(s\)|Key Idea)?/i;
  const questionRegex = /###?\s*❓\s*(?:Question\(s\)|Question)?/i;
  const arrowRegex = /###?\s*🏹\s*(?:Application\(s\)|Application)?/i;

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
 * Formats a passage reference into standard reading format (e.g. "John 3:16–17", "Romans 8:1–11").
 */
export function formatPassageDisplay(ref: {
  book: string;
  startChapter: number;
  startVerse: number;
  endChapter: number;
  endVerse: number;
}): string {
  const { book, startChapter, startVerse, endChapter, endVerse } = ref;
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

  const passage: PassageReference = {
    book: data.book || '',
    startChapter: Number(data.chapter_start || 1),
    startVerse: Number(data.verse_start || 1),
    endChapter: Number(data.chapter_end || data.chapter_start || 1),
    endVerse: Number(data.verse_end || data.verse_start || 1),
    startOrdinal: Number(data.start_verse_id || 1),
    endOrdinal: Number(data.end_verse_id || 1),
  };

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

  return {
    id,
    userId,
    user_id: userId,
    authorUsername,
    authorDisplayName,
    author_username: authorUsername,
    author_display_name: authorDisplayName,
    passage,
    book: passage.book,
    chapter_start: passage.startChapter,
    verse_start: passage.startVerse,
    chapter_end: passage.endChapter,
    verse_end: passage.endVerse,
    start_verse_id: passage.startOrdinal,
    end_verse_id: passage.endOrdinal,
    lightContent: data.light_content ?? parsedSections.lightContent,
    questionContent: data.question_content ?? parsedSections.questionContent,
    arrowContent: data.arrow_content ?? parsedSections.arrowContent,
    content,
    tags: Array.isArray(data.tags) ? data.tags : [],
    visibility,
    createdAt,
    updatedAt,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}
