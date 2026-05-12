import { describe, expect, it } from 'vitest';
import { calcBMR, calcTDEE, getFactorActividadValor } from './bmr.js';

describe('calcBMR', () => {
  it('hombre 80kg, 180cm, 30años → 1780', () => {
    // 10·80 + 6.25·180 − 5·30 + 5 = 800 + 1125 − 150 + 5 = 1780
    expect(calcBMR({ pesoKg: 80, alturaCm: 180, edad: 30, sexo: 'M' })).toBe(1780);
  });

  it('mujer 65kg, 165cm, 28años → 1399.25', () => {
    // 10·65 + 6.25·165 − 5·28 − 161 = 650 + 1031.25 − 140 − 161 = 1380.25
    expect(calcBMR({ pesoKg: 65, alturaCm: 165, edad: 28, sexo: 'F' })).toBe(1380.25);
  });

  it('mismo peso/altura/edad: hombre tiene 166 más que mujer', () => {
    const base = { pesoKg: 70, alturaCm: 170, edad: 35 };
    const hombre = calcBMR({ ...base, sexo: 'M' });
    const mujer = calcBMR({ ...base, sexo: 'F' });
    expect(hombre - mujer).toBe(166); // 5 - (-161)
  });

  it('peso elevado (caso real Rubén Loan ~121kg)', () => {
    // 10·121 + 6.25·180 − 5·35 + 5 = 1210 + 1125 − 175 + 5 = 2165
    expect(calcBMR({ pesoKg: 121, alturaCm: 180, edad: 35, sexo: 'M' })).toBe(2165);
  });

  it('lanza error con peso, altura o edad no positivos', () => {
    expect(() => calcBMR({ pesoKg: 0, alturaCm: 180, edad: 30, sexo: 'M' })).toThrow();
    expect(() => calcBMR({ pesoKg: -10, alturaCm: 180, edad: 30, sexo: 'M' })).toThrow();
    expect(() => calcBMR({ pesoKg: 70, alturaCm: 0, edad: 30, sexo: 'M' })).toThrow();
    expect(() => calcBMR({ pesoKg: 70, alturaCm: 180, edad: 0, sexo: 'M' })).toThrow();
    expect(() => calcBMR({ pesoKg: 70, alturaCm: 180, edad: -5, sexo: 'M' })).toThrow();
  });
});

describe('calcTDEE', () => {
  it('aplica el factor sedentario (1.2)', () => {
    expect(calcTDEE(1500, 'sedentario')).toBe(1800);
  });

  it('aplica el factor ligero (1.375)', () => {
    expect(calcTDEE(1500, 'ligero')).toBeCloseTo(2062.5, 2);
  });

  it('aplica el factor moderado (1.55)', () => {
    expect(calcTDEE(1500, 'moderado')).toBeCloseTo(2325, 2);
  });

  it('aplica el factor activo (1.725)', () => {
    expect(calcTDEE(1500, 'activo')).toBeCloseTo(2587.5, 2);
  });

  it('aplica el factor muy_activo (1.9)', () => {
    expect(calcTDEE(1500, 'muy_activo')).toBe(2850);
  });

  it('lanza error con BMR no positivo', () => {
    expect(() => calcTDEE(0, 'moderado')).toThrow();
    expect(() => calcTDEE(-100, 'moderado')).toThrow();
  });
});

describe('getFactorActividadValor', () => {
  it('expone los 5 factores correctos', () => {
    expect(getFactorActividadValor('sedentario')).toBe(1.2);
    expect(getFactorActividadValor('ligero')).toBe(1.375);
    expect(getFactorActividadValor('moderado')).toBe(1.55);
    expect(getFactorActividadValor('activo')).toBe(1.725);
    expect(getFactorActividadValor('muy_activo')).toBe(1.9);
  });
});
