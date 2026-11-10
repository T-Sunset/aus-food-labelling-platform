import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { evaluateAdditivePermission } from '../packages/engine/src/additive-permission.ts';

const release = JSON.parse(
  readFileSync(new URL('../packages/rules/data/release-0.1.0-draft.json', import.meta.url), 'utf8'),
);

describe('shipped draft additive permission catalog', () => {
  it('never yields a deterministic result, even for fully supplied inputs', () => {
    const catalog = release.additivePermissionCatalog;
    let evaluated = 0;
    for (const row of catalog.rows) {
      for (const code of row.additiveIdentifiers) {
        const result = evaluateAdditivePermission({
          catalog,
          rule: {
            id: 'additive.permission',
            name: 'Additive permission',
            instrument: 'Australia New Zealand Food Standards Code',
            provision: 'Standard 1.3.1—3; Schedule 15 S15—5',
            sourceUrl: 'https://www.legislation.gov.au/F2015L00439/latest/text',
            jurisdiction: 'Australia and New Zealand',
            effectiveFrom: '2026-04-30',
            version: catalog.version,
            mappingConfidence: 'Unmapped',
          },
          confirmedCategoryId: row.categoryId,
          additiveCodeNumber: code,
          technologicalPurpose: 'Preservative',
          foodState: 'asSold',
          sourceStatus: 'added',
          gmpConfirmed: true,
          finalConcentration: { value: '0', unit: 'mg/kg' },
          evidence: { reference: 'test', sourceDate: '2026-11-09' },
        });
        expect(result.status).toBe('REVIEW REQUIRED');
        evaluated += 1;
      }
    }
    expect(evaluated).toBeGreaterThan(0);
  });
});
