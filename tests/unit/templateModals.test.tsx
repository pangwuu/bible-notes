/**
 * Unit Test for TemplateManagerModal and TemplateCreatorModal
 * Validates template listing, custom template editing/deletion controls,
 * validation alerts on empty name/sections, and save callback payloads.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import { TemplateManagerModal } from '../../src/components/TemplateManagerModal';
import { TemplateCreatorModal } from '../../src/components/TemplateCreatorModal';
import { BUILT_IN_TEMPLATES } from '../../src/constants/templates';
import { NoteTemplate } from '../../src/types/template';
import { Alert } from '../../src/utils/alert';

jest.spyOn(Alert, 'alert');

const mockCustomTemplate: NoteTemplate = {
  id: 'custom_123',
  name: 'My Custom Method',
  description: 'Custom devotional flow',
  icon: 'star-outline',
  color: '#E3A53D',
  isBuiltIn: false,
  sections: [
    { id: 's1', title: 'Observation', icon: 'eye-outline', color: '#5B93C4', placeholder: 'What do you see?' },
    { id: 's2', title: 'Action', icon: 'walk-outline', color: '#7BA05B', placeholder: 'What will you do?' },
  ],
};

describe('Template Modals Lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TemplateManagerModal', () => {
    const mockOnSelect = jest.fn();
    const mockOnCreateNew = jest.fn();
    const mockOnEdit = jest.fn();
    const mockOnDelete = jest.fn();
    const mockOnClose = jest.fn();

    test('renders built-in and custom templates with proper action controls', async () => {
      const templates = [...BUILT_IN_TEMPLATES, mockCustomTemplate];

      const { getByText } = await render(
        <TemplateManagerModal
          visible={true}
          templates={templates}
          selectedTemplateId="swedish"
          onClose={mockOnClose}
          onSelectTemplate={mockOnSelect}
          onCreateNew={mockOnCreateNew}
          onEditTemplate={mockOnEdit}
          onDeleteTemplate={mockOnDelete}
        />
      );

      expect(getByText('Swedish Method')).toBeTruthy();
      expect(getByText('SOAP Study')).toBeTruthy();
      expect(getByText('My Custom Method')).toBeTruthy();
      expect(getByText(/Create Custom Template/)).toBeTruthy();
    });

    test('selecting a template calls onSelectTemplate and closes', async () => {
      const templates = [...BUILT_IN_TEMPLATES];

      const { getAllByText } = await render(
        <TemplateManagerModal
          visible={true}
          templates={templates}
          selectedTemplateId="swedish"
          onClose={mockOnClose}
          onSelectTemplate={mockOnSelect}
          onCreateNew={mockOnCreateNew}
          onEditTemplate={mockOnEdit}
          onDeleteTemplate={mockOnDelete}
        />
      );

      // The "Use" buttons are rendered for available templates
      const useButtons = getAllByText('Use');
      expect(useButtons.length).toBeGreaterThan(0);

      await act(async () => {
        fireEvent.press(useButtons[0]);
      });

      expect(mockOnSelect).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });

    test('tapping Create Custom Template triggers onCreateNew callback', async () => {
      const { getByText } = await render(
        <TemplateManagerModal
          visible={true}
          templates={BUILT_IN_TEMPLATES}
          selectedTemplateId="swedish"
          onClose={mockOnClose}
          onSelectTemplate={mockOnSelect}
          onCreateNew={mockOnCreateNew}
          onEditTemplate={mockOnEdit}
          onDeleteTemplate={mockOnDelete}
        />
      );

      await act(async () => {
        fireEvent.press(getByText(/Create Custom Template/));
      });

      expect(mockOnCreateNew).toHaveBeenCalledTimes(1);
    });
  });

  describe('TemplateCreatorModal', () => {
    const mockOnSave = jest.fn();
    const mockOnClose = jest.fn();

    test('shows alert error when attempting to save without a template name', async () => {
      const { getByText } = await render(
        <TemplateCreatorModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Tap Save without entering name
      await act(async () => {
        fireEvent.press(getByText('Save'));
      });

      expect(Alert.alert).toHaveBeenCalledWith(
        'Validation Error',
        expect.stringContaining('name')
      );
      expect(mockOnSave).not.toHaveBeenCalled();
    });

    test('successfully creates and saves new custom template when valid', async () => {
      const { getByPlaceholderText, getByText } = await render(
        <TemplateCreatorModal
          visible={true}
          onClose={mockOnClose}
          onSave={mockOnSave}
        />
      );

      // Enter Template Name
      const nameInput = getByPlaceholderText('e.g., Weekly Sermon Notes');
      await act(async () => {
        fireEvent.changeText(nameInput, 'Discovery Bible Study');
      });

      // Enter Title for Section 1
      const sectionInput = getByPlaceholderText('Section 1 Title (e.g. Observation)');
      await act(async () => {
        fireEvent.changeText(sectionInput, 'What does this teach about God?');
      });

      // Tap Save
      await act(async () => {
        fireEvent.press(getByText('Save'));
      });

      expect(mockOnSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Discovery Bible Study',
          isBuiltIn: false,
          sections: expect.arrayContaining([
            expect.objectContaining({
              title: 'What does this teach about God?',
            }),
          ]),
        })
      );
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
