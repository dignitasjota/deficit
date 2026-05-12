import { describe, expect, it } from 'vitest';
import { HITOS_POR_DEFECTO, calcMilestoneState } from './milestones.js';

describe('HITOS_POR_DEFECTO', () => {
  it('contiene 9 hitos en orden ascendente', () => {
    expect(HITOS_POR_DEFECTO).toHaveLength(9);
    for (let i = 1; i < HITOS_POR_DEFECTO.length; i++) {
      const anterior = HITOS_POR_DEFECTO[i - 1]!;
      const actual = HITOS_POR_DEFECTO[i]!;
      expect(actual.nivel).toBeGreaterThan(anterior.nivel);
    }
  });

  it('último hito es el Jefe Final en L80', () => {
    const ultimo = HITOS_POR_DEFECTO[HITOS_POR_DEFECTO.length - 1]!;
    expect(ultimo.nivel).toBe(80);
    expect(ultimo.nombre).toBe('Jefe Final');
  });
});

describe('calcMilestoneState', () => {
  it('L0 con xpPorNivel=7700 → próximo hito L5, XP falta = 5·7700', () => {
    const r = calcMilestoneState({ nivelActual: 0, xpEnNivel: 0, xpPorNivel: 7700 });
    expect(r.proximo?.nivel).toBe(5);
    expect(r.xpFalta).toBe(5 * 7700);
    expect(r.jefeFinalSuperado).toBe(false);
  });

  it('caso captura: L38 con 6626 XP → próximo hito L40 "Mitad del camino"', () => {
    const r = calcMilestoneState({ nivelActual: 38, xpEnNivel: 6626, xpPorNivel: 7700 });
    expect(r.proximo?.nivel).toBe(40);
    // (40 − 38)·7700 − 6626 = 15400 − 6626 = 8774 (la captura muestra 8774 ✓)
    expect(r.xpFalta).toBe(8774);
  });

  it('en L80 → no hay próximo hito, jefeFinalSuperado=true', () => {
    const r = calcMilestoneState({ nivelActual: 80, xpEnNivel: 0, xpPorNivel: 7700 });
    expect(r.proximo).toBeNull();
    expect(r.xpFalta).toBe(0);
    expect(r.jefeFinalSuperado).toBe(true);
  });

  it('exactamente en un hito → ese hito ya está cumplido, busca el siguiente', () => {
    // En L40 estás "encima" del hito 40, el siguiente es L50.
    const r = calcMilestoneState({ nivelActual: 40, xpEnNivel: 0, xpPorNivel: 7700 });
    expect(r.proximo?.nivel).toBe(50);
  });

  it('lista personalizada de hitos se respeta y se ordena', () => {
    const hitos = [
      { nivel: 30, nombre: 'B' },
      { nivel: 10, nombre: 'A' },
      { nivel: 50, nombre: 'C' },
    ];
    const r = calcMilestoneState({
      nivelActual: 5,
      xpEnNivel: 0,
      xpPorNivel: 1000,
      hitos,
    });
    expect(r.proximo?.nombre).toBe('A');
    expect(r.proximo?.nivel).toBe(10);
  });

  it('lista vacía de hitos → proximo null sin error', () => {
    const r = calcMilestoneState({
      nivelActual: 5,
      xpEnNivel: 0,
      xpPorNivel: 1000,
      hitos: [],
    });
    expect(r.proximo).toBeNull();
    expect(r.jefeFinalSuperado).toBe(false);
  });

  it('respeta xpPorNivel personalizado (objetivo 40 kg → 3850)', () => {
    const r = calcMilestoneState({ nivelActual: 38, xpEnNivel: 0, xpPorNivel: 3850 });
    expect(r.proximo?.nivel).toBe(40);
    expect(r.xpFalta).toBe(2 * 3850);
  });

  it('lanza error con valores inválidos', () => {
    expect(() =>
      calcMilestoneState({ nivelActual: -1, xpEnNivel: 0, xpPorNivel: 7700 }),
    ).toThrow();
    expect(() =>
      calcMilestoneState({ nivelActual: 81, xpEnNivel: 0, xpPorNivel: 7700 }),
    ).toThrow();
    expect(() =>
      calcMilestoneState({ nivelActual: 0, xpEnNivel: -1, xpPorNivel: 7700 }),
    ).toThrow();
    expect(() =>
      calcMilestoneState({ nivelActual: 0, xpEnNivel: 0, xpPorNivel: 0 }),
    ).toThrow();
    expect(() =>
      calcMilestoneState({ nivelActual: 0, xpEnNivel: 8000, xpPorNivel: 7700 }),
    ).toThrow();
  });
});
