import { describe, expect, it } from 'vitest';
import { formatAdditiveDeclarationCandidate } from './additive-declaration.js';

const base = {
  ingredientId: 'ingredient-1',
  additiveName: 'Example additive',
  codeNumber: '999',
  sourcePath: ['product', 'compound-line', 'compound', 'ingredient-line', 'ingredient-1'],
};

describe('additive declaration candidate formatting', () => {
  it('formats a selected class with the Schedule 8 name or code but remains review required', () => {
    expect(formatAdditiveDeclarationCandidate({
      ...base,
      route: 'schedule7Class',
      schedule7ClassName: 'Example class',
      substanceChoice: 'schedule8Name',
    })).toMatchObject({
      status: 'REVIEW REQUIRED',
      text: 'Example class (Example additive)',
      provision: 'Standard 1.2.4—7(1)(a), (2); Schedule 7 S7—2; Schedule 8 S8—2',
      sourceIds: ['SRC-005', 'SRC-ADD-001', 'SRC-ADD-002'],
      ingredientId: 'ingredient-1',
      sourcePath: base.sourcePath,
      reason: 'SOURCE_MAPPING_UNVERIFIED',
    });

    expect(formatAdditiveDeclarationCandidate({
      ...base,
      route: 'schedule7Class',
      schedule7ClassName: 'Example class',
      substanceChoice: 'schedule8CodeNumber',
    }).text).toBe('Example class (999)');
  });

  it('requires a class, and requires a Schedule 8 name rather than code for an unclassified additive', () => {
    const missingClass = formatAdditiveDeclarationCandidate({
      ...base,
      route: 'schedule7Class',
      substanceChoice: 'schedule8Name',
    });
    expect(missingClass).not.toHaveProperty('text');
    expect(missingClass.reason).toBe('SCHEDULE_7_CLASS_UNVERIFIED');
    expect(formatAdditiveDeclarationCandidate({
      ...base,
      route: 'noSchedule7Class',
    }).text).toBe('Example additive');
    const noSchedule8Name = formatAdditiveDeclarationCandidate({
      ...base,
      additiveName: '',
      route: 'noSchedule7Class',
    });
    expect(noSchedule8Name).not.toHaveProperty('text');
    expect(noSchedule8Name.reason).toBe('SCHEDULE_8_IDENTITY_UNVERIFIED');
  });

  it('represents the enzyme, flavouring, and added caffeine wording options as candidates', () => {
    expect(formatAdditiveDeclarationCandidate({ ...base, route: 'enzyme' }).text).toBe('enzyme');
    expect(formatAdditiveDeclarationCandidate({
      ...base,
      route: 'flavouring',
      flavouringWording: 'flavouring',
    }).text).toBe('flavouring');
    expect(formatAdditiveDeclarationCandidate({
      ...base,
      route: 'flavouring',
      flavouringWording: 'specificName',
    }).text).toBe('Example additive');
    expect(formatAdditiveDeclarationCandidate({ ...base, route: 'addedCaffeine' }).text).toBe('caffeine');

    for (const candidate of [
      formatAdditiveDeclarationCandidate({ ...base, route: 'enzyme' }),
      formatAdditiveDeclarationCandidate({ ...base, route: 'flavouring', flavouringWording: 'flavour' }),
      formatAdditiveDeclarationCandidate({ ...base, route: 'addedCaffeine' }),
    ]) {
      expect(candidate.status).toBe('REVIEW REQUIRED');
      expect(candidate.reason).toBe('SOURCE_MAPPING_UNVERIFIED');
    }
  });

  it('keeps unspecified routes and missing specific flavour names in review without output', () => {
    const unknownRoute = formatAdditiveDeclarationCandidate({ ...base, route: 'unknown' });
    expect(unknownRoute).not.toHaveProperty('text');
    expect(unknownRoute.reason).toBe('DECLARATION_ROUTE_NOT_SELECTED');
    const missingFlavorName = formatAdditiveDeclarationCandidate({
      ...base,
      additiveName: '',
      route: 'flavouring',
      flavouringWording: 'specificName',
    });
    expect(missingFlavorName).not.toHaveProperty('text');
    expect(missingFlavorName.reason).toBe('SPECIFIC_NAME_REQUIRED');
    const missingCode = formatAdditiveDeclarationCandidate({
      ...base,
      route: 'schedule7Class',
      schedule7ClassName: 'Example class',
      substanceChoice: 'schedule8CodeNumber',
      codeNumber: '',
    });
    expect(missingCode).not.toHaveProperty('text');
    expect(missingCode.reason).toBe('SCHEDULE_8_CODE_UNAVAILABLE');
    const specifiedFlavor = formatAdditiveDeclarationCandidate({
      ...base,
      route: 'specifiedFlavouringSubstance',
    });
    expect(specifiedFlavor).not.toHaveProperty('text');
    expect(specifiedFlavor.reason).toBe('SCHEDULE_7_CLASS_UNVERIFIED');
    expect(() => formatAdditiveDeclarationCandidate({
      ...base,
      route: 'noSchedule7Class',
      sourcePath: [],
    })).toThrowError('complete ingredient source path');
  });
});
