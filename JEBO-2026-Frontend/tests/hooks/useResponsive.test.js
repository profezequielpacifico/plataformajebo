import { describe, it, expect } from 'vitest';
import { calcUiScale } from '../../src/hooks/useResponsive.js';

describe('calcUiScale', () => {
  it('no escala en celular, tablet ni notebook', () => {
    expect(calcUiScale(390, 844)).toBe(1);
    expect(calcUiScale(1024, 768)).toBe(1);
    expect(calcUiScale(1536, 864)).toBe(1);
  });

  it('crece en proporcion al monitor', () => {
    expect(calcUiScale(1920, 1080)).toBe(1.2);
    expect(calcUiScale(2560, 1440)).toBe(1.6);
  });

  it('respeta el alto en ventanas anchas y bajas', () => {
    expect(calcUiScale(1920, 700)).toBe(1);
  });

  it('no pasa del maximo en pantallas enormes', () => {
    expect(calcUiScale(3840, 2160)).toBe(1.6);
  });
});
