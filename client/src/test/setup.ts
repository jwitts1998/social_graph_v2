import '@testing-library/jest-dom';

// Polyfill pointer capture methods missing in jsdom (used by vaul Drawer)
if (typeof HTMLElement !== 'undefined') {
  HTMLElement.prototype.setPointerCapture = HTMLElement.prototype.setPointerCapture || (() => {});
  HTMLElement.prototype.releasePointerCapture = HTMLElement.prototype.releasePointerCapture || (() => {});
  HTMLElement.prototype.hasPointerCapture = HTMLElement.prototype.hasPointerCapture || (() => false);
}

// Polyfill window.getComputedStyle transform (used by vaul getTranslate)
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
  const style = originalGetComputedStyle(elt, pseudoElt);
  if (!style.transform) {
    Object.defineProperty(style, 'transform', { value: 'none', writable: true });
  }
  return style;
};
