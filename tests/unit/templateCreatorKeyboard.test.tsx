import React from 'react';
import { KeyboardAvoidingView, ScrollView, TextInput, Platform, StyleSheet } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import TemplateCreatorModal from '../../src/components/TemplateCreatorModal';
import { NoteTemplate } from '../../src/types/template';
import { colors } from '../../src/constants/theme';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
  MaterialCommunityIcons: () => null,
}));

jest.mock('../../src/utils/alert', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

describe('TemplateCreatorModal Keyboard Avoidance & Spacing', () => {
  const mockOnClose = jest.fn();
  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders KeyboardAvoidingView with appropriate behavior and styling', () => {
    let component: renderer.ReactTestRenderer | undefined;
    act(() => {
      component = renderer.create(
        <TemplateCreatorModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );
    });

    const root = component!.root;
    const keyboardAvoider = root.findByType(KeyboardAvoidingView);
    expect(keyboardAvoider).toBeTruthy();

    const expectedBehavior = Platform.OS === 'ios' ? 'padding' : undefined;
    expect(keyboardAvoider.props.behavior).toBe(expectedBehavior);

    const flatStyle = StyleSheet.flatten(keyboardAvoider.props.style);
    expect(flatStyle).toEqual(
      expect.objectContaining({
        width: '100%',
        justifyContent: 'flex-end',
      })
    );
  });

  it('provides extensive bottom clearance (paddingBottom >= 200) in ScrollView body', () => {
    let component: renderer.ReactTestRenderer | undefined;
    act(() => {
      component = renderer.create(
        <TemplateCreatorModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );
    });

    const root = component!.root;
    const scrollViews = root.findAllByType(ScrollView);
    // Find the main body scrollview containing the form
    const bodyScrollView = scrollViews.find((sv) => {
      const style = StyleSheet.flatten(sv.props.contentContainerStyle);
      return style && style.paddingBottom !== undefined;
    });

    expect(bodyScrollView).toBeTruthy();
    const flatContainerStyle = StyleSheet.flatten(bodyScrollView!.props.contentContainerStyle);
    expect(flatContainerStyle.paddingBottom).toBeGreaterThanOrEqual(200);
    expect(flatContainerStyle.paddingBottom).toBe(240);
  });

  it('configures ScrollView with keyboard handling attributes', () => {
    let component: renderer.ReactTestRenderer | undefined;
    act(() => {
      component = renderer.create(
        <TemplateCreatorModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );
    });

    const root = component!.root;
    const scrollViews = root.findAllByType(ScrollView);
    const bodyScrollView = scrollViews.find((sv) => sv.props.keyboardDismissMode === 'on-drag');

    expect(bodyScrollView).toBeTruthy();
    expect(bodyScrollView!.props.keyboardShouldPersistTaps).toBe('handled');
    expect(bodyScrollView!.props.keyboardDismissMode).toBe('on-drag');
    expect(bodyScrollView!.props.automaticallyAdjustKeyboardInsets).toBe(Platform.OS === 'ios');
  });

  it('allows typing into multiple section titles and placeholders without layout hindrance', () => {
    const customTemplate: NoteTemplate = {
      id: 'custom_test',
      name: 'Custom In-Depth Study',
      description: 'Study with multiple reflection sections',
      icon: 'book-outline',
      color: colors.accent.keyIdea,
      isBuiltIn: false,
      sections: [
        { id: 's1', title: 'Context', icon: 'book-outline', color: colors.accent.keyIdea, placeholder: 'Historical setting...' },
        { id: 's2', title: 'Theological Focus', icon: 'bulb-outline', color: colors.accent.question, placeholder: 'Core doctrine...' },
        { id: 's3', title: 'Life Application', icon: 'arrow-forward-outline', color: colors.accent.application, placeholder: 'Actionable steps...' },
      ],
      created_at: 1000,
      updated_at: 1000,
    };

    let component: renderer.ReactTestRenderer | undefined;
    act(() => {
      component = renderer.create(
        <TemplateCreatorModal
          visible={true}
          initialTemplate={customTemplate}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );
    });

    const root = component!.root;
    const textInputs = root.findAllByType(TextInput);

    // Verify all 3 section titles and placeholders are present and editable
    const section1Title = textInputs.find((i) => i.props.value === 'Context');
    const section2Title = textInputs.find((i) => i.props.value === 'Theological Focus');
    const section3Title = textInputs.find((i) => i.props.value === 'Life Application');

    expect(section1Title).toBeTruthy();
    expect(section2Title).toBeTruthy();
    expect(section3Title).toBeTruthy();

    const section3Prompt = textInputs.find((i) => i.props.value === 'Actionable steps...');
    expect(section3Prompt).toBeTruthy();

    // Simulate modifying section 3 title and prompt
    act(() => {
      section3Title!.props.onChangeText('Personal Application');
    });
    act(() => {
      section3Prompt!.props.onChangeText('What must I do today?');
    });

    // Verify changes propagate
    const updatedInputs = component!.root.findAllByType(TextInput);
    expect(updatedInputs.some((i) => i.props.value === 'Personal Application')).toBe(true);
    expect(updatedInputs.some((i) => i.props.value === 'What must I do today?')).toBe(true);
  });

  it('maintains proper structure when adding and removing sections dynamically', () => {
    let component: renderer.ReactTestRenderer | undefined;
    act(() => {
      component = renderer.create(
        <TemplateCreatorModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );
    });

    const root = component!.root;

    // Find "Add Section" button by accessibilityLabel
    const addBtn = root.findByProps({
      accessibilityLabel: 'Add section',
    });

    act(() => {
      addBtn.props.onPress();
    });

    // Verify there are now 2 section title inputs
    const titleInputsAfterAdd = root.findAllByType(TextInput).filter(
      (ti) => ti.props.placeholder && ti.props.placeholder.includes('Title')
    );
    expect(titleInputsAfterAdd.length).toBe(2);

    // Verify bottom clearance remains on the ScrollView container
    const scrollViews = root.findAllByType(ScrollView);
    const bodyScrollView = scrollViews.find((sv) => {
      const style = StyleSheet.flatten(sv.props.contentContainerStyle);
      return style && style.paddingBottom !== undefined;
    });
    expect(StyleSheet.flatten(bodyScrollView!.props.contentContainerStyle).paddingBottom).toBe(240);
  });
});
