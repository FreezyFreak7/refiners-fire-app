import { useEffect, useRef } from 'react';

/**
 * Runs `onEnter` when Enter is pressed while `active`, so "Next" / "Continue" never needs the mouse.
 *
 * - Ignores Enter inside text fields (the field's own Enter handling wins) unless `fromInputs` is set.
 * - Ignores key-repeat, and the first 350ms after becoming active, so the Enter that just submitted
 *   an answer (or a double tap) can't skip the review the player hasn't read yet.
 * - Captures the key before a focused button turns it into a second click.
 */
export function useEnterKey(active: boolean, onEnter: () => void, fromInputs = false) {
  const handler = useRef(onEnter);
  handler.current = onEnter;
  useEffect(() => {
    if (!active) return;
    const since = Date.now();
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat || e.isComposing || e.metaKey || e.ctrlKey || e.altKey || e.shiftKey) return;
      if (Date.now() - since < 350) return;
      const t = e.target as HTMLElement | null;
      if (!fromInputs && t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      e.preventDefault();
      e.stopPropagation();
      handler.current();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [active, fromInputs]);
}
