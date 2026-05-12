import { describe, expect, it } from 'vitest';
import { calcLevelState, deriveProgressionParams } from './levels.js';

describe('deriveProgressionParams', () => {
  it('80 kg de objetivo → 1 nivel/semana, 7700 XP/nivel', () => {
    const params = deriveProgressionParams({
      pesoInicialKg: 200,
      pesoObjetivoKg: 120,
    });

    expect(params.kgPorNivel).toBe(1);
    expect(params.xpPorNivel).toBe(7700);
    expect(params.nivelesPorSemana).toBe(1);
    expect(params.semanasA_L80).toBe(80);
  });

  it('40 kg de objetivo → 2 niveles/semana, 3850 XP/nivel', () => {
    const params = deriveProgressionParams({
      pesoInicialKg: 100,
      pesoObjetivoKg: 60,
    });

    expect(params.kgPorNivel).toBe(0.5);
    expect(params.xpPorNivel).toBe(3850);
    expect(params.nivelesPorSemana).toBe(2);
    expect(params.semanasA_L80).toBe(40);
  });

  it('20 kg de objetivo → 4 niveles/semana, 1925 XP/nivel', () => {
    const params = deriveProgressionParams({
      pesoInicialKg: 90,
      pesoObjetivoKg: 70,
    });

    expect(params.kgPorNivel).toBe(0.25);
    expect(params.xpPorNivel).toBe(1925);
    expect(params.nivelesPorSemana).toBe(4);
    expect(params.semanasA_L80).toBe(20);
  });

  it('lanza error si peso objetivo >= peso inicial', () => {
    expect(() =>
      deriveProgressionParams({ pesoInicialKg: 80, pesoObjetivoKg: 80 }),
    ).toThrow();
    expect(() =>
      deriveProgressionParams({ pesoInicialKg: 70, pesoObjetivoKg: 80 }),
    ).toThrow();
  });
});

describe('calcLevelState', () => {
  it('XP=0 → nivel 0, 0% progreso', () => {
    const state = calcLevelState(0, 7700);
    expect(state.nivelActual).toBe(0);
    expect(state.xpEnNivel).toBe(0);
    expect(state.xpFalta).toBe(7700);
    expect(state.progresoPct).toBe(0);
    expect(state.jefeFinalSuperado).toBe(false);
  });

  it('XP=6626 con xpPorNivel=7700 → nivel 0, 86.05%', () => {
    const state = calcLevelState(6626, 7700);
    expect(state.nivelActual).toBe(0);
    expect(state.xpEnNivel).toBe(6626);
    expect(state.xpFalta).toBe(1074);
    expect(state.progresoPct).toBeCloseTo(0.8605, 4);
  });

  it('XP exacta = 1 nivel completo', () => {
    const state = calcLevelState(7700, 7700);
    expect(state.nivelActual).toBe(1);
    expect(state.xpEnNivel).toBe(0);
    expect(state.xpFalta).toBe(7700);
    expect(state.progresoPct).toBe(0);
  });

  it('escala por encima del L80 → topa en 80 con jefeFinalSuperado=true', () => {
    const state = calcLevelState(7700 * 100, 7700);
    expect(state.nivelActual).toBe(80);
    expect(state.jefeFinalSuperado).toBe(true);
    expect(state.progresoPct).toBe(1);
  });

  it('respeta xpPorNivel personalizado (objetivo 40 kg → 3850)', () => {
    const state = calcLevelState(3850 * 38, 3850);
    expect(state.nivelActual).toBe(38);
    expect(state.xpEnNivel).toBe(0);
  });

  it('lanza error con xpTotal negativo', () => {
    expect(() => calcLevelState(-100, 7700)).toThrow();
  });

  it('lanza error con xpPorNivel <= 0', () => {
    expect(() => calcLevelState(100, 0)).toThrow();
    expect(() => calcLevelState(100, -7700)).toThrow();
  });
});
