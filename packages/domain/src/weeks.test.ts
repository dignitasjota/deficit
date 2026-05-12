import { describe, expect, it } from 'vitest';
import { applyColchonToWeek, calcWeekStatus } from './weeks.js';

describe('calcWeekStatus', () => {
  it('semana en curso → EN_CURSO sin tocar colchón', () => {
    const r = calcWeekStatus({ xpSemana: 1714, colchonDisponible: 892, enCurso: true });
    expect(r.estado).toBe('EN_CURSO');
    expect(r.colchonResultante).toBe(892);
  });

  it('semana exacta 7700 → MAS_XP sin excedente', () => {
    const r = calcWeekStatus({ xpSemana: 7700, colchonDisponible: 0 });
    expect(r.estado).toBe('MAS_XP');
    expect(r.excedente).toBe(0);
    expect(r.colchonResultante).toBe(0);
  });

  it('caso captura: 11.815 XP → +4115 al colchón', () => {
    const r = calcWeekStatus({ xpSemana: 11_815, colchonDisponible: 0 });
    expect(r.estado).toBe('MAS_XP');
    expect(r.excedente).toBe(4115);
    expect(r.colchonRecibido).toBe(4115);
    expect(r.colchonResultante).toBe(4115);
  });

  it('caso captura: 9949 XP → +2249 al colchón existente', () => {
    const r = calcWeekStatus({ xpSemana: 9949, colchonDisponible: 1000 });
    expect(r.estado).toBe('MAS_XP');
    expect(r.excedente).toBe(2249);
    expect(r.colchonResultante).toBe(3249);
  });

  it('déficit con colchón suficiente e invertir=true → COMPENSADA', () => {
    // caso captura "20 abr - 26 abr": 6208 XP, +1492 del colchón
    const r = calcWeekStatus({
      xpSemana: 6208,
      colchonDisponible: 5000,
      invertirColchon: true,
    });
    expect(r.estado).toBe('COMPENSADA');
    expect(r.colchonInvertido).toBe(1492);
    expect(r.colchonResultante).toBe(5000 - 1492);
  });

  it('déficit sin invertir colchón → DEFICIT (no se toca el colchón)', () => {
    const r = calcWeekStatus({
      xpSemana: 5000,
      colchonDisponible: 10_000,
      invertirColchon: false,
    });
    expect(r.estado).toBe('DEFICIT');
    expect(r.colchonInvertido).toBe(0);
    expect(r.colchonResultante).toBe(10_000);
  });

  it('déficit con invertir=true pero colchón insuficiente → DEFICIT', () => {
    const r = calcWeekStatus({
      xpSemana: 5000,
      colchonDisponible: 1000,
      invertirColchon: true,
    });
    expect(r.estado).toBe('DEFICIT');
    expect(r.colchonInvertido).toBe(0);
    expect(r.colchonResultante).toBe(1000);
  });

  it('lanza error con xp o colchón negativos', () => {
    expect(() =>
      calcWeekStatus({ xpSemana: -100, colchonDisponible: 0 }),
    ).toThrow();
    expect(() =>
      calcWeekStatus({ xpSemana: 1000, colchonDisponible: -1 }),
    ).toThrow();
  });
});

describe('applyColchonToWeek', () => {
  it('aplica colchón cuando es suficiente', () => {
    const r = applyColchonToWeek(6000, 3000);
    expect(r).not.toBeNull();
    expect(r!.estado).toBe('COMPENSADA');
    expect(r!.colchonInvertido).toBe(1700);
    expect(r!.colchonResultante).toBe(1300);
  });

  it('devuelve null cuando el colchón es insuficiente', () => {
    expect(applyColchonToWeek(5000, 1000)).toBeNull();
  });

  it('lanza error si la semana ya cumplía la meta', () => {
    expect(() => applyColchonToWeek(8000, 1000)).toThrow();
  });
});
