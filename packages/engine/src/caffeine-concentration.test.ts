import { describe, expect, it } from 'vitest';
import type { CaffeineConcentrationInput } from './caffeine-concentration.js';
import { calculateCaffeineConcentration } from './caffeine-concentration.js';

const finalDensity = {
  gramsPerMillilitre: '1',
  evidenceReference: 'finished density report',
  sourceDate: '2026-11-01',
} as const;

function input(overrides: Partial<CaffeineConcentrationInput> = {}): CaffeineConcentrationInput {
  return {
    ingredients: [
      {
        ingredientId: 'caffeine',
        mass: { value: '0.03', unit: 'g' },
        sourcePath: ['drink', 'caffeine'],
        evidence: {
          status: 'present',
          value: '100',
          unit: 'g/100g',
          reference: 'caffeine specification',
          sourceDate: '2026-11-01',
        },
      },
      {
        ingredientId: 'water',
        mass: { value: '99.97', unit: 'g' },
        sourcePath: ['drink', 'water'],
        evidence: {
          status: 'absent',
          reference: 'water specification',
          sourceDate: '2026-11-01',
        },
      },
    ],
    finalMass: { value: '100', unit: 'g' },
    finalDensity,
    ...overrides,
  };
}

describe('calculateCaffeineConcentration', () => {
  it('calculates mg/L from every confirmed caffeine source and final density', () => {
    const result = calculateCaffeineConcentration(input());
    expect(result).toMatchObject({
      completeness: 'complete',
      value: '300',
      unit: 'mg/L',
      issues: [],
    });
    expect(result.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Caffeine content in drink > caffeine', sourceId: 'caffeine specification' }),
      expect.objectContaining({ name: 'Final beverage density', sourceId: 'finished density report' }),
    ]));
  });

  it('calculates from explicit caffeine facts and numeric densities without source references', () => {
    const result = calculateCaffeineConcentration(input({
      ingredients: [
        {
          ingredientId: 'caffeine',
          mass: { value: '0.03', unit: 'g' },
          sourcePath: ['drink', 'caffeine'],
          evidence: { status: 'present', value: '100', unit: 'g/100g' },
        },
        {
          ingredientId: 'water',
          mass: { value: '99.97', unit: 'g' },
          sourcePath: ['drink', 'water'],
          evidence: { status: 'absent' },
        },
      ],
      finalDensity: { gramsPerMillilitre: '1', evidenceReference: '', sourceDate: '' },
    }));
    expect(result).toMatchObject({ completeness: 'complete', value: '300', issues: [] });
    expect(result.evidence).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Caffeine content in drink > caffeine', sourceId: '', sourceDate: '' }),
      expect.objectContaining({ name: 'Final beverage density', sourceId: '', sourceDate: '' }),
    ]));
  });

  it('uses a quantified zero without treating it as missing or absent evidence', () => {
    const result = calculateCaffeineConcentration(input({
      ingredients: [{
        ingredientId: 'caffeine',
        mass: { value: '0.03', unit: 'g' },
        sourcePath: ['drink', 'caffeine'],
        evidence: { status: 'quantified', value: '0', unit: 'mg/100g' },
      }],
    }));
    expect(result).toMatchObject({
      completeness: 'complete',
      value: '0',
      issues: [],
    });
    expect(result.evidence).toContainEqual(expect.objectContaining({
      name: 'Caffeine content in drink > caffeine',
      value: '0',
    }));
    expect(result.evidence).not.toContainEqual(expect.objectContaining({
      name: 'Caffeine status for drink > caffeine',
      value: 'absent',
    }));
  });

  it('converts mass- and volume-based values with numeric density', () => {
    const mixed = input({
      ingredients: [
        {
          ingredientId: 'powder',
          mass: { value: '20', unit: 'g' },
          sourcePath: ['drink', 'powder'],
          evidence: { status: 'present', value: '50', unit: 'mg/100g', reference: 'powder spec', sourceDate: '2026-11-01' },
        },
        {
          ingredientId: 'syrup',
          mass: { value: '80', unit: 'g' },
          sourcePath: ['drink', 'syrup'],
          evidence: { status: 'present', value: '10', unit: 'mg/100mL', reference: 'syrup spec', sourceDate: '2026-11-01' },
          density: { gramsPerMillilitre: '1.25', evidenceReference: '', sourceDate: '' },
        },
      ],
      finalDensity: {
        gramsPerMillilitre: '1',
        evidenceReference: 'finished density report',
        sourceDate: '2026-11-01',
      },
    });
    expect(calculateCaffeineConcentration(mixed)).toMatchObject({ completeness: 'complete', value: '164' });
  });

  it('keeps missing and conflicting ingredient evidence unresolved rather than using zero', () => {
    for (const evidence of [undefined, { status: 'unknown' as const }, {
      status: 'conflicting' as const, reference: 'conflicting spec', sourceDate: '2026-11-01',
    }]) {
      const { evidence: ignored, ...ingredient } = input().ingredients[0]!;
      void ignored;
      const result = calculateCaffeineConcentration(input({
        ingredients: [{ ...ingredient, ...(evidence === undefined ? {} : { evidence }) }],
      }));
      expect(result.value).toBeUndefined();
      expect(result.completeness).not.toBe('complete');
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });

  it('retains partial optional source details for unresolved conflicting evidence', () => {
    const { evidence: ignored, ...ingredient } = input().ingredients[0]!;
    void ignored;
    for (const evidence of [
      { status: 'conflicting' as const, reference: 'supplier statement' },
      { status: 'conflicting' as const, sourceDate: '2026-11-01' },
    ]) {
      const result = calculateCaffeineConcentration(input({
        ingredients: [{ ...ingredient, evidence }],
      }));
      expect(result.completeness).toBe('conflicting');
      expect(result.value).toBeUndefined();
      expect(result.evidence).toContainEqual(expect.objectContaining({
        name: 'Conflicting caffeine evidence for drink > caffeine',
        sourceId: evidence.reference ?? '',
        sourceDate: evidence.sourceDate ?? '',
      }));
    }
  });

  it('requires numeric density for volume-based values', () => {
    const volumeEvidence = {
      status: 'present' as const,
      value: '20',
      unit: 'mg/100mL' as const,
      reference: 'syrup spec',
      sourceDate: '2026-11-01',
    };
    const volumeInput = {
      ingredientId: 'syrup',
      mass: { value: '10', unit: 'g' as const },
      sourcePath: ['drink', 'syrup'],
      evidence: volumeEvidence,
    };
    const noDensity = calculateCaffeineConcentration(input({ ingredients: [volumeInput] }));
    expect(noDensity.completeness).toBe('unknown');
    expect(noDensity.issues.join(' ')).toContain('ingredient density');

    const invalidDensity = calculateCaffeineConcentration(input({
      ingredients: [{
        ...volumeInput,
        density: { gramsPerMillilitre: '0', evidenceReference: '', sourceDate: '' },
      }],
    }));
    expect(invalidDensity.completeness).toBe('unknown');
    expect(invalidDensity.value).toBeUndefined();
  });
});
