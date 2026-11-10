import { describe, expect, it } from 'vitest';
import { buildAdditiveNameReport } from './additive-name-checks';
import { buildClaimChecks } from './claim-checks';
import { workedExampleSet as set } from './worked-example-data';
import { workedExampleTag } from './worked-examples';

function product(id: string) {
  const found = set.products.find((item) => item.id === id);
  if (found === undefined) {
    throw new Error(`Missing worked example ${id}`);
  }
  return found;
}

function report(id: string, illustrative: boolean) {
  return buildAdditiveNameReport(product(id), set.formulations, set.ingredients, illustrative);
}

function claims(id: string, illustrative: boolean) {
  return buildClaimChecks(product(id), illustrative);
}

const additive = (id: string, code: string, illustrative: boolean) => {
  const found = report(id, illustrative).additives.find((item) => item.codeNumber === code);
  if (found === undefined) {
    throw new Error(`Missing additive ${code}`);
  }
  return found;
};

const claimNamed = (id: string, text: string, illustrative: boolean) => {
  const found = claims(id, illustrative).find((item) => item.claim.text === text);
  if (found === undefined) {
    throw new Error(`Missing claim ${text}`);
  }
  return found;
};

describe('worked examples: shared rules', () => {
  it('tags every record and uses unique ids', () => {
    const all = [...set.ingredients, ...set.formulations, ...set.products];
    expect(all.every((record) => record.tags.includes(workedExampleTag))).toBe(true);
    expect(new Set(all.map((record) => record.id)).size).toBe(all.length);
  });

  it('keeps every official additive, name and claim status at REVIEW REQUIRED, preview on or off', () => {
    for (const { id } of set.products) {
      for (const illustrative of [false, true]) {
        const r = report(id, illustrative);
        expect(r.error).toBeUndefined();
        expect(r.names?.status).toBe('REVIEW REQUIRED');
        expect(r.sweetened?.status).toBe('REVIEW REQUIRED');
        for (const item of r.additives) {
          expect(item.permission.status).toBe('REVIEW REQUIRED');
        }
        for (const item of claims(id, illustrative)) {
          expect(item.official.status).toBe('REVIEW REQUIRED');
        }
      }
    }
  });

  it('shows no preview while the toggle is off', () => {
    for (const { id } of set.products) {
      expect(report(id, false).additives.every((item) => item.preview === undefined)).toBe(true);
      expect(claims(id, false).every((item) => item.preview === undefined)).toBe(true);
    }
  });
});

describe('worked examples: P1 Example Citrus Boost (good)', () => {
  const id = 'we-prod-citrus-boost';

  it('calculates the invented concentrations and previews both within their limits', () => {
    expect(additive(id, '445', true).concentration).toMatchObject({ status: 'calculated', value: '60', unit: 'mg/kg' });
    expect(additive(id, '950', true).concentration).toMatchObject({ status: 'calculated', value: '250', unit: 'mg/kg' });
    for (const code of ['445', '950']) {
      expect(additive(id, code, true).preview).toMatchObject({ eligible: true, illustrativeStatus: 'PASS' });
    }
  });

  it('previews Low sugars as meeting the condition', () => {
    expect(claimNamed(id, 'Low sugars', true).preview).toMatchObject({ eligible: true, illustrativeStatus: 'PASS' });
  });

  it('uses the person\'s stated benzoic acid basis for sodium benzoate', () => {
    const benzoate = additive(id, '211', true);
    expect(benzoate.concentration).toMatchObject({ status: 'calculated', value: '258', calculatedAs: 'benzoic acid' });
    expect(benzoate.preview).toMatchObject({ eligible: true, illustrativeStatus: 'PASS' });
  });

  it('lists added caffeine neither as an uncoded additive nor as a concentration blocker', () => {
    expect(report(id, true).uncodedAdditives).toEqual([]);
    expect(additive(id, '445', true).concentration.status).toBe('calculated');
  });
});

describe('worked examples: P2 Example Citrus Boost Max (problem)', () => {
  const id = 'we-prod-citrus-boost-max';

  it('previews the over-limit additive as exceeding its limit', () => {
    expect(additive(id, '445', true).concentration).toMatchObject({ value: '130', unit: 'mg/kg' });
    expect(additive(id, '445', true).preview).toMatchObject({ eligible: true, illustrativeStatus: 'FAIL' });
  });

  it('never previews an additive with a missing concentration or an unknown source', () => {
    const sulphite = additive(id, '223', true);
    expect(sulphite.preview?.eligible).toBe(false);
    expect(sulphite.preview?.blockedBy).toContain('CONCENTRATION_MISSING');
    const steviol = additive(id, '960', true);
    expect(steviol.preview?.eligible).toBe(false);
    expect(steviol.preview?.blockedBy).toContain('SOURCE_STATUS_NOT_ADDED');
  });

  it('previews Low sugars as not meeting the condition', () => {
    expect(claimNamed(id, 'Low sugars', true).preview).toMatchObject({ eligible: true, illustrativeStatus: 'FAIL' });
  });

  it('blocks Low energy (no figure entered) and the health claim (review-only)', () => {
    const energy = claimNamed(id, 'Low energy', true).preview;
    expect(energy?.eligible).toBe(false);
    expect(energy?.blockedBy).toContain('AMOUNT_MISSING');
    const health = claimNamed(id, 'Supports concentration', true).preview;
    expect(health?.eligible).toBe(false);
    expect(health?.blockedBy).toContain('HEALTH_REVIEW_ONLY');
  });
});

describe('worked examples: P3 Example Apple and Oat Puree (good)', () => {
  const id = 'we-prod-apple-oat';

  it('previews the additives within their limits', () => {
    expect(additive(id, '300', true).concentration).toMatchObject({ value: '300', unit: 'mg/kg' });
    expect(additive(id, '300', true).preview).toMatchObject({ eligible: true, illustrativeStatus: 'PASS' });
    expect(additive(id, '330', true).preview).toMatchObject({ eligible: true, illustrativeStatus: 'PASS' });
  });

  it('previews the sweetened-word check as not required', () => {
    expect(report(id, true).sweetenedPreview).toMatchObject({ eligible: true, illustrativeStatus: 'PASS' });
  });

  it('previews the fibre claim as meeting the condition', () => {
    expect(claimNamed(id, 'Good source of dietary fibre', true).preview)
      .toMatchObject({ eligible: true, illustrativeStatus: 'PASS' });
  });
});

describe('worked examples: P4 Example Honey and Oat Puree (problem)', () => {
  const id = 'we-prod-honey-oat';

  it('previews carrageenan (printed limit "10 000") as exceeding its limit', () => {
    expect(additive(id, '407', true).concentration).toMatchObject({ value: '12000', unit: 'mg/kg' });
    expect(additive(id, '407', true).preview).toMatchObject({ eligible: true, illustrativeStatus: 'FAIL' });
  });

  it('lists the sterilised-honey candidate for review', () => {
    const value = report(id, false).names?.value as { candidates?: { ruleId: string }[] } | undefined;
    expect(value?.candidates?.map((candidate) => candidate.ruleId)).toContain('name.infant.sterilised-honey');
  });

  it('blocks the sweetened-word preview while the sugars basis is unconfirmed', () => {
    const preview = report(id, true).sweetenedPreview;
    expect(preview?.eligible).toBe(false);
    expect(preview?.blockedBy).toContain('SUGARS_BASIS_NOT_CONFIRMED');
  });

  it('does not lift a prohibited context or an unconfirmed classification', () => {
    const fat = claimNamed(id, 'Low fat', true).preview;
    expect(fat?.eligible).toBe(false);
    expect(fat?.blockedBy).toContain('PROHIBITED_CONTEXT');
    const sodium = claimNamed(id, 'Low sodium', true).preview;
    expect(sodium?.eligible).toBe(false);
    expect(sodium?.blockedBy).toContain('CLASSIFICATION_NOT_CONFIRMED');
  });
});
