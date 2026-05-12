import { describe, expect, it } from 'vitest';
import { calcDeficitXP, calcExerciseXP, calcStepXP } from './xp.js';

describe('calcStepXP', () => {
  it('caso real captura: 2495 pasos × 122 kg = 97 XP (redondeado)', () => {
    // 2495 × 122 × 0.00032 = 97.4048 → 97
    // (la captura muestra +68 con un peso distinto, pero verificamos la fórmula)
    expect(calcStepXP(2495, 122)).toBe(97);
  });

  it('8822 pasos × 122 kg = 344 XP (~ 344 redondeado)', () => {
    // 8822 × 122 × 0.00032 = 344.4012 → 344
    expect(calcStepXP(8822, 122)).toBe(344);
  });

  it('aplica tope a 25.000 pasos', () => {
    const sinTope = calcStepXP(25_000, 100);
    const conTope = calcStepXP(50_000, 100);
    expect(conTope).toBe(sinTope);
  });

  it('por debajo del tope no se aplica', () => {
    const xp = calcStepXP(20_000, 100);
    // 20000 × 100 × 0.00032 = 640
    expect(xp).toBe(640);
  });

  it('0 pasos → 0 XP', () => {
    expect(calcStepXP(0, 80)).toBe(0);
  });

  it('lanza error con valores inválidos', () => {
    expect(() => calcStepXP(-100, 80)).toThrow();
    expect(() => calcStepXP(1000, 0)).toThrow();
    expect(() => calcStepXP(1000, -10)).toThrow();
  });
});

describe('calcExerciseXP', () => {
  it('aplica el factor 0.7 (caso real captura: 473 kcal → 331 XP)', () => {
    expect(calcExerciseXP(473)).toBe(331); // 473 × 0.7 = 331.1 → 331
  });

  it('500 kcal → 350 XP', () => {
    expect(calcExerciseXP(500)).toBe(350);
  });

  it('0 kcal → 0 XP', () => {
    expect(calcExerciseXP(0)).toBe(0);
  });

  it('redondea al entero más cercano', () => {
    // 100 × 0.7 = 70 (exacto)
    expect(calcExerciseXP(100)).toBe(70);
    // 101 × 0.7 = 70.7 → 71
    expect(calcExerciseXP(101)).toBe(71);
  });

  it('lanza error con kcal negativas', () => {
    expect(() => calcExerciseXP(-100)).toThrow();
  });
});

describe('calcDeficitXP', () => {
  it('TDEE 2180 con 1738 kcal in → 442 XP (caso real captura)', () => {
    expect(calcDeficitXP(2180, 1738)).toBe(442);
  });

  it('TDEE 2180 con 1412 kcal in → 768 XP (caso real captura)', () => {
    expect(calcDeficitXP(2180, 1412)).toBe(768);
  });

  it('superávit calórico → 0 XP (no negativo)', () => {
    expect(calcDeficitXP(2000, 2500)).toBe(0);
  });

  it('balance neutro → 0 XP', () => {
    expect(calcDeficitXP(2000, 2000)).toBe(0);
  });

  it('0 kcal in → toda la TDEE como déficit', () => {
    expect(calcDeficitXP(2200, 0)).toBe(2200);
  });

  it('lanza error con TDEE no positivo o kcalIn negativo', () => {
    expect(() => calcDeficitXP(0, 1000)).toThrow();
    expect(() => calcDeficitXP(-100, 1000)).toThrow();
    expect(() => calcDeficitXP(2000, -100)).toThrow();
  });
});
