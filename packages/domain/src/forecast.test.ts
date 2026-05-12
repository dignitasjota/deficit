import { describe, expect, it } from 'vitest';
import { forecastDestination, forecastLevelDates } from './forecast.js';

const HOY = new Date('2026-05-07T00:00:00Z');

describe('forecastDestination', () => {
  it('en L80 → 0 semanas restantes, fecha = hoy', () => {
    const r = forecastDestination({
      nivelActual: 80,
      xpEnNivel: 0,
      xpPorNivel: 7700,
      colchonDisponible: 0,
      hoy: HOY,
    });
    expect(r.semanasRestantes).toBe(0);
    expect(r.fechaEstimada.getTime()).toBe(HOY.getTime());
  });

  it('L0 con xpPorNivel=7700 → 80 semanas', () => {
    const r = forecastDestination({
      nivelActual: 0,
      xpEnNivel: 0,
      xpPorNivel: 7700,
      colchonDisponible: 0,
      hoy: HOY,
    });
    expect(r.xpFaltanteParaL80).toBe(80 * 7700);
    expect(r.semanasRestantes).toBe(80);
  });

  it('caso captura: L38, xpEnNivel 6626/7700, colchón 892 → fecha estimada calculada', () => {
    const r = forecastDestination({
      nivelActual: 38,
      xpEnNivel: 6626,
      xpPorNivel: 7700,
      colchonDisponible: 892,
      hoy: HOY,
    });
    // xp_falta_L80 = (80-38)·7700 − 6626 = 323400 − 6626 = 316774
    // colchón aplicable = min(892, 316774) = 892
    // xp a generar = 315882
    // semanas = ceil(315882 / 7700) = 42
    expect(r.xpFaltanteParaL80).toBe(316_774);
    expect(r.colchonAplicable).toBe(892);
    expect(r.xpQueDebeGenerar).toBe(315_882);
    expect(r.semanasRestantes).toBe(42);
  });

  it('colchón gigante absorbe todo el restante → 0 semanas', () => {
    const r = forecastDestination({
      nivelActual: 79,
      xpEnNivel: 0,
      xpPorNivel: 7700,
      colchonDisponible: 100_000,
      hoy: HOY,
    });
    // xp_falta = 7700, colchón aplicable = 7700, restante = 0 → 0 semanas
    expect(r.semanasRestantes).toBe(0);
  });

  it('objetivo pequeño (xpPorNivel=1925) acelera el ritmo', () => {
    // xp_falta = 80·1925 = 154000; semanas = ceil(154000/7700) = 20
    const r = forecastDestination({
      nivelActual: 0,
      xpEnNivel: 0,
      xpPorNivel: 1925,
      colchonDisponible: 0,
      hoy: HOY,
    });
    expect(r.semanasRestantes).toBe(20);
  });

  it('lanza error con valores inválidos', () => {
    expect(() =>
      forecastDestination({
        nivelActual: -1,
        xpEnNivel: 0,
        xpPorNivel: 7700,
        colchonDisponible: 0,
        hoy: HOY,
      }),
    ).toThrow();
    expect(() =>
      forecastDestination({
        nivelActual: 81,
        xpEnNivel: 0,
        xpPorNivel: 7700,
        colchonDisponible: 0,
        hoy: HOY,
      }),
    ).toThrow();
    expect(() =>
      forecastDestination({
        nivelActual: 0,
        xpEnNivel: 8000,
        xpPorNivel: 7700,
        colchonDisponible: 0,
        hoy: HOY,
      }),
    ).toThrow();
    expect(() =>
      forecastDestination({
        nivelActual: 0,
        xpEnNivel: 0,
        xpPorNivel: 0,
        colchonDisponible: 0,
        hoy: HOY,
      }),
    ).toThrow();
  });
});

describe('forecastLevelDates', () => {
  it('al estar en L80 → array vacío', () => {
    const r = forecastLevelDates({ nivelActual: 80, nivelesPorSemana: 1, hoy: HOY });
    expect(r).toEqual([]);
  });

  it('L0 con 1 nivel/semana → 80 entradas, una por nivel', () => {
    const r = forecastLevelDates({ nivelActual: 0, nivelesPorSemana: 1, hoy: HOY });
    expect(r).toHaveLength(80);
    expect(r[0]?.nivel).toBe(1);
    expect(r[79]?.nivel).toBe(80);
  });

  it('1 nivel/semana → cada nivel separado por 7 días', () => {
    const r = forecastLevelDates({ nivelActual: 78, nivelesPorSemana: 1, hoy: HOY });
    expect(r).toHaveLength(2);
    const dia7 = r[0]!.fechaEstimada.getTime() - HOY.getTime();
    const dia14 = r[1]!.fechaEstimada.getTime() - HOY.getTime();
    expect(dia7).toBe(7 * 24 * 60 * 60 * 1000);
    expect(dia14).toBe(14 * 24 * 60 * 60 * 1000);
  });

  it('4 niveles/semana acelera la cadencia', () => {
    const r = forecastLevelDates({ nivelActual: 76, nivelesPorSemana: 4, hoy: HOY });
    expect(r).toHaveLength(4);
    // L77 → 1/4 sem = 1.75 días
    const ms77 = r[0]!.fechaEstimada.getTime() - HOY.getTime();
    expect(ms77).toBeCloseTo(1.75 * 24 * 60 * 60 * 1000, -3);
  });

  it('hastaNivel limita el rango', () => {
    const r = forecastLevelDates({
      nivelActual: 38,
      nivelesPorSemana: 1,
      hoy: HOY,
      hastaNivel: 40,
    });
    expect(r).toHaveLength(2);
    expect(r[0]?.nivel).toBe(39);
    expect(r[1]?.nivel).toBe(40);
  });

  it('lanza error con valores inválidos', () => {
    expect(() =>
      forecastLevelDates({ nivelActual: -1, nivelesPorSemana: 1, hoy: HOY }),
    ).toThrow();
    expect(() =>
      forecastLevelDates({ nivelActual: 0, nivelesPorSemana: 0, hoy: HOY }),
    ).toThrow();
    expect(() =>
      forecastLevelDates({ nivelActual: 0, nivelesPorSemana: 1, hoy: HOY, hastaNivel: 81 }),
    ).toThrow();
  });
});
