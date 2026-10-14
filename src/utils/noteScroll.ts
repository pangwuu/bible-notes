/**
 * Scroll offset that keeps the tail of a note section above the keyboard.
 * Returns null when that tail is already inside the visible area.
 */
export function tailScrollOffset({
  tailY,
  offsetY,
  viewportHeight,
  keyboardHeight,
  gap = 24,
}: {
  tailY: number;
  offsetY: number;
  viewportHeight: number;
  keyboardHeight: number;
  gap?: number;
}): number | null {
  const visibleBottom = offsetY + viewportHeight - keyboardHeight - gap;
  if (tailY <= visibleBottom) return null;
  return Math.max(0, tailY - (viewportHeight - keyboardHeight - gap));
}
