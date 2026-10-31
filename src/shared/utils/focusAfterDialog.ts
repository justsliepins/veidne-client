/**
 * Move focus to the element `get` returns once a closing Fluent dialog has
 * left the page. Fluent keeps the surface mounted during its exit animation and
 * keeps focus inside it, so focusing right away is undone. Unless `force` is
 * set, does nothing when the user has already moved focus somewhere real.
 * Gives up after a second.
 *
 * Used where a step change unmounts the control that had focus: the column
 * mapping dialog, the generation progress dialog, the Done screen.
 */
export function focusAfterDialog(get: () => HTMLElement | null, { force = false } = {}): () => void {
  const start = performance.now();
  let raf = 0;
  const tick = () => {
    const el = get();
    const dialogOpen = document.querySelector('.fui-DialogSurface') !== null;
    if (el && !dialogOpen) {
      const active = document.activeElement;
      if (force || !active || active === document.body || !document.contains(active)) el.focus();
      return;
    }
    if (performance.now() - start < 1000) raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(raf);
}
