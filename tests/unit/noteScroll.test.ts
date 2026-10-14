import { tailScrollOffset } from '../../src/utils/noteScroll';

describe('tailScrollOffset', () => {
  it('does not scroll when the section tail is already visible', () => {
    expect(
      tailScrollOffset({
        tailY: 100,
        offsetY: 0,
        viewportHeight: 800,
        keyboardHeight: 0,
      })
    ).toBeNull();
  });

  it('scrolls when the keyboard covers the section tail', () => {
    expect(
      tailScrollOffset({
        tailY: 700,
        offsetY: 0,
        viewportHeight: 800,
        keyboardHeight: 300,
      })
    ).toBe(224);
  });

  it('does not return a negative offset', () => {
    expect(
      tailScrollOffset({
        tailY: 100,
        offsetY: -700,
        viewportHeight: 800,
        keyboardHeight: 0,
      })
    ).toBe(0);
  });
});
