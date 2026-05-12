import { describe, expect, it } from 'vitest';
import {
  aggregateByTipo,
  calcEffectiveLitros,
  calcHydrationGoal,
  metaHidratacionCumplida,
} from './hydration.js';

describe('calcHydrationGoal', () => {
  it('sodio = 0 → meta base 2.0 L', () => {
    expect(calcHydrationGoal(0)).toBe(2.0);
  });

  it('sodio ≤ 2g → meta base 2.0 L (no penaliza)', () => {
    expect(calcHydrationGoal(1.5)).toBe(2.0);
    expect(calcHydrationGoal(2.0)).toBe(2.0);
  });

  it('sodio = 2.5g → 2.0 + 0.25·0.5 = 2.125 L', () => {
    expect(calcHydrationGoal(2.5)).toBeCloseTo(2.125, 5);
  });

  it('caso captura: sodio = 4.03g → ~2.51 L', () => {
    // 2.0 + 0.25·(4.03 − 2.0) = 2.0 + 0.5075 = 2.5075
    expect(calcHydrationGoal(4.03)).toBeCloseTo(2.5075, 5);
  });

  it('lanza error con sodio negativo', () => {
    expect(() => calcHydrationGoal(-1)).toThrow();
  });
});

describe('calcEffectiveLitros', () => {
  it('lista vacía → 0', () => {
    expect(calcEffectiveLitros([])).toBe(0);
  });

  it('agua sola cuenta al 100%', () => {
    expect(calcEffectiveLitros([{ tipo: 'agua', litros: 1.5 }])).toBe(1.5);
  });

  it('refresco zero cuenta al 70%', () => {
    expect(calcEffectiveLitros([{ tipo: 'refresco_zero', litros: 1 }])).toBeCloseTo(0.7, 5);
  });

  it('café/té cuenta al 90%', () => {
    expect(calcEffectiveLitros([{ tipo: 'cafe_te', litros: 0.5 }])).toBeCloseTo(0.45, 5);
  });

  it('alcohol y azucaradas no cuentan', () => {
    const total = calcEffectiveLitros([
      { tipo: 'alcohol', litros: 1 },
      { tipo: 'azucarada', litros: 0.5 },
    ]);
    expect(total).toBe(0);
  });

  it('mezcla realista', () => {
    // 1.5 agua + 0.3 café + 0.5 zero = 1.5 + 0.27 + 0.35 = 2.12
    const total = calcEffectiveLitros([
      { tipo: 'agua', litros: 1.5 },
      { tipo: 'cafe_te', litros: 0.3 },
      { tipo: 'refresco_zero', litros: 0.5 },
    ]);
    expect(total).toBeCloseTo(2.12, 5);
  });

  it('lanza error si algún litro es negativo', () => {
    expect(() => calcEffectiveLitros([{ tipo: 'agua', litros: -1 }])).toThrow();
  });
});

describe('aggregateByTipo', () => {
  it('suma litros por tipo', () => {
    const agg = aggregateByTipo([
      { tipo: 'agua', litros: 1 },
      { tipo: 'agua', litros: 0.5 },
      { tipo: 'cafe_te', litros: 0.3 },
    ]);
    expect(agg.agua).toBe(1.5);
    expect(agg.cafe_te).toBe(0.3);
    expect(agg.refresco_zero).toBe(0);
    expect(agg.azucarada).toBe(0);
    expect(agg.alcohol).toBe(0);
  });

  it('inicializa todos los tipos a 0 con lista vacía', () => {
    const agg = aggregateByTipo([]);
    expect(agg.agua).toBe(0);
    expect(agg.cafe_te).toBe(0);
    expect(agg.refresco_zero).toBe(0);
    expect(agg.azucarada).toBe(0);
    expect(agg.alcohol).toBe(0);
  });
});

describe('metaHidratacionCumplida', () => {
  it('cumple cuando litros efectivos ≥ meta', () => {
    expect(metaHidratacionCumplida([{ tipo: 'agua', litros: 2 }], 0)).toBe(true);
  });

  it('no cumple cuando faltan litros', () => {
    expect(metaHidratacionCumplida([{ tipo: 'agua', litros: 1.5 }], 0)).toBe(false);
  });

  it('no cumple si solo hay refresco zero (penalizado)', () => {
    // 2L de zero = 1.4L efectivos, meta = 2L
    expect(metaHidratacionCumplida([{ tipo: 'refresco_zero', litros: 2 }], 0)).toBe(false);
  });

  it('no cumple si meta ha subido por sodio extra', () => {
    // sodio 6g → meta = 2 + 1 = 3L; 2L de agua no llegan
    expect(metaHidratacionCumplida([{ tipo: 'agua', litros: 2 }], 6)).toBe(false);
  });
});
