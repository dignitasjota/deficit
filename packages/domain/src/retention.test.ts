import { describe, expect, it } from 'vitest';
import {
  calcBaselineDrift,
  calcExpectedRange,
  calcMovingAverage,
  calcRetention,
  calcTheoreticalWeight,
  evaluarPesoEnRango,
} from './retention.js';

describe('calcRetention', () => {
  it('sodio = 0 → solo glucógeno + digestivo = 1.3 kg', () => {
    const r = calcRetention(0);
    expect(r.retSodio).toBe(0);
    expect(r.retGlucogeno).toBe(1.0);
    expect(r.retDigestivo).toBe(0.3);
    expect(r.retTotal).toBeCloseTo(1.3, 5);
  });

  it('sodio ≤ 2g no aporta retención de sodio', () => {
    expect(calcRetention(1.5).retSodio).toBe(0);
    expect(calcRetention(2.0).retSodio).toBe(0);
  });

  it('caso captura: sodio = 5g → ret_sodio = 0.4·3 = 1.2 kg', () => {
    const r = calcRetention(5);
    expect(r.retSodio).toBeCloseTo(1.2, 5);
    expect(r.retTotal).toBeCloseTo(1.2 + 1.0 + 0.3, 5);
  });

  it('lanza error con sodio negativo', () => {
    expect(() => calcRetention(-1)).toThrow();
  });
});

describe('calcTheoreticalWeight', () => {
  it('xpTotal = 0 → peso inicial intacto', () => {
    expect(calcTheoreticalWeight(120, 0)).toBe(120);
  });

  it('xpTotal = 7700 → 1 kg de grasa perdido (independiente del objetivo)', () => {
    expect(calcTheoreticalWeight(120, 7700)).toBeCloseTo(119, 5);
  });

  it('xpTotal = 77000 → 10 kg perdidos', () => {
    expect(calcTheoreticalWeight(120, 77_000)).toBeCloseTo(110, 5);
  });

  it('xpTotal grande con objetivo pequeño SIGUE dividiéndose por 7700', () => {
    // Es la regla clave: peso_teórico siempre / 7700, no por xpPorNivel.
    expect(calcTheoreticalWeight(80, 38_500)).toBeCloseTo(75, 5);
  });

  it('lanza error con peso inicial no positivo o xp negativo', () => {
    expect(() => calcTheoreticalWeight(0, 1000)).toThrow();
    expect(() => calcTheoreticalWeight(-50, 1000)).toThrow();
    expect(() => calcTheoreticalWeight(80, -100)).toThrow();
  });
});

describe('calcExpectedRange', () => {
  it('estructura: rango_min < peso_teorico+1.3·0.5 ≤ rango_max', () => {
    const r = calcExpectedRange(120, 0, 0);
    expect(r.pesoTeorico).toBe(120);
    expect(r.retencion.retTotal).toBeCloseTo(1.3, 5);
    expect(r.rangoMin).toBeCloseTo(120 + 1.3 * 0.5, 5);
    expect(r.rangoMax).toBeCloseTo(120 + 1.3 * 1.2, 5);
  });

  it('caso aproximado captura: pesoInicial ~125, xpTotal ~28k, sodio 5', () => {
    // peso teórico = 125 − 28000/7700 ≈ 121.36
    // ret = 0.4·3 + 1 + 0.3 = 2.5
    // rango_min = 121.36 + 2.5·0.5 = 122.61
    // rango_max = 121.36 + 2.5·1.2 = 124.36
    const r = calcExpectedRange(125, 28_000, 5);
    expect(r.pesoTeorico).toBeCloseTo(121.364, 2);
    expect(r.retencion.retTotal).toBeCloseTo(2.5, 5);
    expect(r.rangoMin).toBeCloseTo(122.614, 2);
    expect(r.rangoMax).toBeCloseTo(124.364, 2);
  });
});

describe('evaluarPesoEnRango', () => {
  const range = { rangoMin: 122, rangoMax: 124 };

  it('peso dentro del rango → DENTRO', () => {
    expect(evaluarPesoEnRango(123, range)).toBe('DENTRO');
    expect(evaluarPesoEnRango(122, range)).toBe('DENTRO');
    expect(evaluarPesoEnRango(124, range)).toBe('DENTRO');
  });

  it('peso por encima → FUERA_ARRIBA', () => {
    expect(evaluarPesoEnRango(124.5, range)).toBe('FUERA_ARRIBA');
  });

  it('peso por debajo → FUERA_ABAJO', () => {
    expect(evaluarPesoEnRango(121.5, range)).toBe('FUERA_ABAJO');
  });
});

describe('calcMovingAverage', () => {
  it('serie vacía → null', () => {
    expect(calcMovingAverage([])).toBeNull();
  });

  it('un solo dato → ese mismo valor', () => {
    expect(calcMovingAverage([100])).toBe(100);
  });

  it('media de los últimos 7 cuando hay más', () => {
    const pesos = [130, 129, 128, 127, 126, 125, 124, 123, 122, 121];
    // Últimos 7: 127,126,125,124,123,122,121 → suma 868 / 7 = 124
    expect(calcMovingAverage(pesos, 7)).toBeCloseTo(124, 5);
  });

  it('si hay menos de N, promedia los disponibles', () => {
    const pesos = [120, 121, 122];
    expect(calcMovingAverage(pesos, 7)).toBe(121);
  });

  it('lanza error con n no positivo', () => {
    expect(() => calcMovingAverage([1, 2, 3], 0)).toThrow();
    expect(() => calcMovingAverage([1, 2, 3], -1)).toThrow();
  });
});

describe('calcBaselineDrift', () => {
  it('serie vacía → null', () => {
    expect(calcBaselineDrift(120, [])).toBeNull();
  });

  it('caso captura: peso 121.4, media 7d 122.1 → drift -0.7', () => {
    const pesos = [123, 122.5, 122.3, 122.0, 121.8, 121.6, 121.6];
    // media = 122.114… ≈ 122.1
    const drift = calcBaselineDrift(121.4, pesos);
    expect(drift).not.toBeNull();
    expect(drift!).toBeLessThan(0);
  });

  it('drift puede ser positivo si la báscula está por encima de la media', () => {
    const drift = calcBaselineDrift(123, [120, 120, 120, 120, 120, 120, 120]);
    expect(drift).toBe(3);
  });
});
