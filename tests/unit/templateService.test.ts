/**
 * Unit tests for Templates:
 * 1. Built-in templates integrity (Swedish, SOAP, Inductive, Head Heart Hands, Blank)
 * 2. Section initialization and compilation to Markdown
 * 3. getTemplateById with custom and built-in templates
 */

import {
  BUILT_IN_TEMPLATES,
  DEFAULT_TEMPLATE,
  getTemplateById,
  compileSectionsToMarkdown,
  initializeSectionValues,
} from '../../src/constants/templates';
import { NoteTemplate } from '../../src/types/template';

describe('Note Templates Constants & Helpers', () => {
  it('contains all 5 expected built-in templates', () => {
    const ids = BUILT_IN_TEMPLATES.map((t) => t.id);
    expect(ids).toContain('swedish');
    expect(ids).toContain('soap');
    expect(ids).toContain('inductive');
    expect(ids).toContain('head_heart_hands');
    expect(ids).toContain('blank');
  });

  it('ensures each built-in template has at least 1 section and at most 10 sections', () => {
    BUILT_IN_TEMPLATES.forEach((tpl) => {
      expect(tpl.sections.length).toBeGreaterThanOrEqual(1);
      expect(tpl.sections.length).toBeLessThanOrEqual(10);
      tpl.sections.forEach((sec) => {
        expect(sec.id).toBeTruthy();
        expect(sec.title).toBeTruthy();
      });
    });
  });

  it('correctly initializes empty section values from a template', () => {
    const soapTemplate = BUILT_IN_TEMPLATES.find((t) => t.id === 'soap')!;
    const values = initializeSectionValues(soapTemplate);
    expect(values).toHaveLength(4);
    expect(values[0]).toEqual({
      id: 'scripture',
      title: 'Scripture',
      icon: 'book-outline',
      content: '',
    });
    expect(values[1].title).toBe('Observation');
    expect(values[2].title).toBe('Application');
    expect(values[3].title).toBe('Prayer');
  });

  it('compiles sections into unified Markdown format', () => {
    const sections = [
      { id: '1', title: 'Observation', icon: 'eye-outline', content: 'Saw repeated phrase.' },
      { id: '2', title: 'Application', icon: 'footsteps-outline', content: 'Walk in love.' },
    ];
    const md = compileSectionsToMarkdown(sections);
    expect(md).toContain('### Observation\nSaw repeated phrase.');
    expect(md).toContain('### Application\nWalk in love.');
  });

  it('finds custom templates when provided', () => {
    const customTemplate: NoteTemplate = {
      id: 'custom_123',
      name: 'My Special Template',
      description: 'Test template',
      icon: 'star-outline',
      sections: [{ id: 's1', title: 'Topic', content: '' } as any],
    };

    const found = getTemplateById('custom_123', [customTemplate]);
    expect(found.id).toBe('custom_123');
    expect(found.name).toBe('My Special Template');

    // Fallback to default when not found
    const missing = getTemplateById('unknown_id', [customTemplate]);
    expect(missing.id).toBe(DEFAULT_TEMPLATE.id);
  });
});
