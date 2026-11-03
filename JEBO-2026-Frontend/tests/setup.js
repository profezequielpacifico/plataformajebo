import '../src/react-shim.js';
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

// React 19 + Testing Library: sin esto cada test acumularia el DOM del anterior
// y las consultas devolverian nodos de pruebas previas.
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

// jsdom no implementa matchMedia, y varios componentes lo usan para detectar
// desktop vs mobile. Se define por defecto como desktop y cada test que necesite
// mobile lo sobreescribe con su propio stub.
if (!window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  });
}

// Tampoco existe scrollTo/ResizeObserver, que usan tablas y modales.
window.scrollTo = window.scrollTo || (() => {});

if (!global.ResizeObserver) {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
