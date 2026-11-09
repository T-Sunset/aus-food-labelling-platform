import { describe, expect, it } from 'vitest';
import type {
  EnergyComponentInput,
  EnergyFactorSet,
} from '@aus-food/domain';
import { calculateSchedule11Energy } from './energy.js';

const factorSet: EnergyFactorSet = {
  id: 'schedule-11-c06',
  compilation: 'F2024C01138',
  effectiveDate: '2024-10-29',
  sourceUrl:
    'https://www.legislation.gov.au/F2015L00481/2024-10-29/2024-10-29/text/original/epub/OEBPS/document_1/document_1.html',
  factors: {
    protein: { value: '17', unit: 'kJ/g', clause: 'S11-2(2)' },
    fat: { value: '37', unit: 'kJ/g', clause: 'S11-2(2)' },
  },
};

const proteinSource = {
  sourcePath: ['food', 'protein'],
  sourceId: 'supplier-a',
  sourceDate: '2026-10-01',
  evidenceType: 'supplier',
} as const;

const fatSource = {
  sourcePath: ['food', 'fat'],
  sourceId: 'supplier-a',
  sourceDate: '2026-10-01',
  evidenceType: 'supplier',
} as const;

const proteinComponent: EnergyComponentInput = {
  id: 'protein',
  category: 'protein',
  mappingStatus: 'resolved',
  quantity: '10',
  unit: 'g/100g',
  source: proteinSource,
};

const fatComponent: EnergyComponentInput = {
  id: 'fat',
  category: 'fat',
  mappingStatus: 'resolved',
  quantity: '2',
  unit: 'g/100g',
  source: fatSource,
};

const completeComponents: readonly EnergyComponentInput[] = [proteinComponent, fatComponent];

describe('Schedule 11 energy calculation', () => {
  it('calculates the component-weighted energy and preserves source and factor trace', () => {
    expect(calculateSchedule11Energy(completeComponents, factorSet, true, 'asSold')).toEqual({
      status: 'calculated',
      foodState: 'asSold',
      energyKjPer100g: '244',
      rule: {
        id: 'schedule-11-c06',
        compilation: 'F2024C01138',
        effectiveDate: '2024-10-29',
        sourceUrl: factorSet.sourceUrl,
        clause: 'S11-2(1)',
      },
      contributions: [
        {
          componentId: 'protein',
          category: 'protein',
          quantity: '10',
          factor: { value: '17', unit: 'kJ/g', clause: 'S11-2(2)' },
          contributionKjPer100g: '170',
          source: proteinSource,
        },
        {
          componentId: 'fat',
          category: 'fat',
          quantity: '2',
          factor: { value: '37', unit: 'kJ/g', clause: 'S11-2(2)' },
          contributionKjPer100g: '74',
          source: fatSource,
        },
      ],
    });
  });

  it('converts milligrams per 100 g to grams per 100 g before applying the factor', () => {
    expect(calculateSchedule11Energy(
      [
        {
          ...proteinComponent,
          id: 'protein-mg',
          quantity: '10000',
          unit: 'mg/100g',
        },
      ],
      factorSet,
      true,
      'asSold',
    )).toMatchObject({
      status: 'calculated',
      energyKjPer100g: '170',
      contributions: [{ quantity: '10', contributionKjPer100g: '170' }],
    });
  });

  it('returns review required for incomplete component coverage instead of assuming missing components are zero', () => {
    expect(calculateSchedule11Energy(completeComponents, factorSet, false, 'asSold')).toEqual({
      status: 'review_required',
      reasons: [{ code: 'INCOMPLETE_COMPONENT_DATA' }],
    });
  });

  it('returns review required when no factor set is available', () => {
    expect(calculateSchedule11Energy(completeComponents, undefined, true, 'asSold')).toMatchObject({
      status: 'review_required',
      reasons: [{ code: 'MISSING_FACTOR_SET' }],
    });
  });

  it('returns review required for unclassified or unresolved components and missing factor rows', () => {
    const components: readonly EnergyComponentInput[] = [
      {
        id: 'unknown',
        mappingStatus: 'review_required',
        quantity: '1',
        unit: 'g/100g',
        source: proteinSource,
      },
      {
        ...fatComponent,
        mappingStatus: 'review_required',
      },
      {
        id: 'no-factor',
        category: 'alcohol',
        mappingStatus: 'resolved',
        quantity: '1',
        unit: 'g/100g',
        source: proteinSource,
      },
    ];

    expect(calculateSchedule11Energy(components, factorSet, true, 'asSold')).toMatchObject({
      status: 'review_required',
      reasons: [
        { code: 'UNCLASSIFIED_COMPONENT', componentId: 'unknown' },
        { code: 'COMPONENT_MAPPING_REVIEW', componentId: 'fat' },
        { code: 'MISSING_ENERGY_FACTOR', componentId: 'no-factor', category: 'alcohol' },
      ],
    });
  });

  it('returns review required for missing component quantities or source evidence', () => {
    expect(calculateSchedule11Energy(
      [
        {
          id: 'no-quantity',
          category: 'protein',
          mappingStatus: 'resolved',
          unit: 'g/100g',
          source: proteinSource,
        },
        {
          id: 'no-source',
          category: 'fat',
          mappingStatus: 'resolved',
          quantity: '1',
          unit: 'g/100g',
        },
      ],
      factorSet,
      true,
      'asSold',
    )).toMatchObject({
      status: 'review_required',
      reasons: [
        { code: 'MISSING_COMPONENT_QUANTITY', componentId: 'no-quantity' },
        { code: 'MISSING_COMPONENT_SOURCE', componentId: 'no-source' },
      ],
    });
  });

  it('returns review required when the food-state basis is missing', () => {
    expect(calculateSchedule11Energy(completeComponents, factorSet, true, undefined)).toMatchObject({
      status: 'review_required',
      reasons: [{ code: 'MISSING_FOOD_STATE' }],
    });
  });

  it('accepts explicit zero quantities and rejects negative values or invalid factor metadata', () => {
    expect(calculateSchedule11Energy(
      [{ ...proteinComponent, quantity: '0' }],
      factorSet,
      true,
      'asSold',
    )).toMatchObject({ status: 'calculated', energyKjPer100g: '0' });

    expect(() => calculateSchedule11Energy(
      [{ ...proteinComponent, quantity: '-1' }],
      factorSet,
      true,
      'asSold',
    )).toThrow(RangeError);

    expect(() => calculateSchedule11Energy(
      completeComponents,
      { ...factorSet, id: '' },
      true,
      'asSold',
    )).toThrow(TypeError);
  });
});
