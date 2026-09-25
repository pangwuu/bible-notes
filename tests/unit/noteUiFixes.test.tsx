import { Text, TextInput } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import TemplateQuickSelector from '../../src/components/TemplateQuickSelector';
import DynamicNoteEditor from '../../src/components/DynamicNoteEditor';
import { BUILT_IN_TEMPLATES, DEFAULT_TEMPLATE } from '../../src/constants/templates';
import { noteDocumentToNote } from '../../src/types/note';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
  MaterialCommunityIcons: () => null,
}));

describe('Note UI Bug Fixes', () => {
  describe('TemplateQuickSelector layout and browse all button', () => {
    it('renders "Template" label and "Browse all" button above the scrollable template options', () => {
      const onOpenManager = jest.fn();
      const onSelectTemplate = jest.fn();

      let component: renderer.ReactTestRenderer | undefined;
      act(() => {
        component = renderer.create(
          <TemplateQuickSelector
            templates={BUILT_IN_TEMPLATES}
            selectedTemplateId={DEFAULT_TEMPLATE.id}
            onSelectTemplate={onSelectTemplate}
            onOpenManager={onOpenManager}
          />
        );
      });

      const root = component!.root;
      // Find "Template" and "Browse all" text
      const allText = root.findAllByType(Text).map((t) => t.props.children);
      expect(allText).toContain('Template');
      expect(allText).toContain('Browse all');

      // Verify Browse all button
      const browseBtn = root.findByProps({ accessibilityLabel: 'Browse all templates' });
      expect(browseBtn).toBeTruthy();
      act(() => {
        browseBtn.props.onPress();
      });
      expect(onOpenManager).toHaveBeenCalledTimes(1);
    });
  });

  describe('DynamicNoteEditor auto-capitalization and focus', () => {
    it('renders section TextInput with autoCapitalize="sentences" and autoCorrect={true}', () => {
      const onChangeSection = jest.fn();
      const onAddTag = jest.fn();
      const onRemoveTag = jest.fn();
      const onChangeVisibility = jest.fn();

      const sections = [
        { id: 'light', title: 'Key Idea', icon: 'bulb-outline', content: '' },
      ];

      let component: renderer.ReactTestRenderer | undefined;
      act(() => {
        component = renderer.create(
          <DynamicNoteEditor
            template={DEFAULT_TEMPLATE}
            sections={sections}
            tags={[]}
            visibility="friends"
            onChangeSection={onChangeSection}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
            onChangeVisibility={onChangeVisibility}
          />
        );
      });

      const root = component!.root;
      const inputs = root.findAllByType(TextInput);
      const sectionInput = inputs.find(
        (i) => i.props.placeholder === DEFAULT_TEMPLATE.sections[0].placeholder
      );
      expect(sectionInput).toBeTruthy();
      expect(sectionInput!.props.autoCapitalize).toBe('sentences');
      expect(sectionInput!.props.autoCorrect).toBe(true);
    });
  });

  describe('Whitespace sanitization in noteDocumentToNote', () => {
    it('trims leading and trailing whitespace from section and Swedish contents', () => {
      const rawData = {
        user_id: 'user_1',
        passage: {
          display: 'John 3:16',
          books: ['John'],
          segments: [{ book: 'John', start_chapter: 3, start_verse: 16, end_chapter: 3, end_verse: 16 }],
        },
        sections: [
          { id: 'light', title: 'Key Idea', content: '\n\n  God loved the world  \n' },
          { id: 'question', title: 'Question', content: '  Why did He send His Son?  ' },
        ],
        light_content: '  Key Idea  \n',
        question_content: '\n Question \n',
        arrow_content: '  Application  ',
      };

      const note = noteDocumentToNote(rawData, 'doc_123');
      expect(note.sections![0].content).toBe('God loved the world');
      expect(note.sections![1].content).toBe('Why did He send His Son?');
      expect(note.lightContent).toBe('Key Idea');
      expect(note.questionContent).toBe('Question');
      expect(note.arrowContent).toBe('Application');
    });
  });
});
