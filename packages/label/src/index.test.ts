import { describe, expect, it } from 'vitest';
import { layoutLabel, type LabelBlockInput, type LabelLayoutInput } from './index.js';

const warningSource = {
  label: 'Source URL fixture',
  url: 'https://www.legislation.gov.au/F2015L00386/latest',
};

type BlockOverrides = Partial<
  Omit<LabelBlockInput, 'minimumFontSizeMm' | 'minimumSizeSource'>
> & {
  readonly minimumFontSizeMm?: number | null;
  readonly minimumSizeSource?: LabelBlockInput['minimumSizeSource'] | null;
};

function block(overrides: BlockOverrides = {}): LabelBlockInput {
  const { minimumSizeSource, minimumFontSizeMm, ...otherOverrides } = overrides;
  const {
    minimumSizeSource: defaultSource,
    minimumFontSizeMm: defaultMinimumFontSizeMm,
    ...defaults
  } = {
    id: 'food-name',
    kind: 'foodName' as const,
    title: 'Food name',
    lines: ['Oat beverage'],
    fontSizeMm: 3,
    minimumFontSizeMm: 2,
    minimumSizeStatus: 'approved' as const,
    minimumSizeSource: warningSource,
  };
  return {
    ...defaults,
    ...otherOverrides,
    ...(minimumFontSizeMm === null
      ? {}
      : { minimumFontSizeMm: minimumFontSizeMm ?? defaultMinimumFontSizeMm }),
    ...(minimumSizeSource === null
      ? {}
      : { minimumSizeSource: minimumSizeSource ?? defaultSource }),
  };
}

function input(overrides: Partial<LabelLayoutInput> = {}): LabelLayoutInput {
  return {
    widthMm: 100,
    heightMm: 150,
    orientation: 'portrait',
    margins: { topMm: 5, rightMm: 5, bottomMm: 5, leftMm: 5 },
    blocks: [block()],
    requiredBlocks: ['foodName'],
    ...overrides,
  };
}

describe('layoutLabel', () => {
  it('emits exact physical SVG dimensions and deterministic escaped text', () => {
    const data = input({
      blocks: [block({ title: 'Food & name', lines: ['Oats < 5% "sweetened"'] })],
    });

    const first = layoutLabel(data);
    const second = layoutLabel(data);

    expect(first).toEqual(second);
    expect(first.status).toBe('ready_for_review');
    expect(first.svg).toContain('width="100mm" height="150mm" viewBox="0 0 100 150"');
    expect(first.svg).toContain('Food &amp; name');
    expect(first.svg).toContain('Oats &lt; 5% &quot;sweetened&quot;');
    expect(first.nonCertificationStatement).toContain('does not certify legal compliance');
  });

  it('reports absent required blocks and keeps them out of the generated SVG', () => {
    const result = layoutLabel(
      input({
        requiredBlocks: ['foodName', 'ingredients', 'nutritionInformation'],
      }),
    );

    expect(result.status).toBe('review_required');
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'MISSING_REQUIRED_BLOCK', blockKind: 'ingredients' }),
        expect.objectContaining({
          code: 'MISSING_REQUIRED_BLOCK',
          blockKind: 'nutritionInformation',
        }),
      ]),
    );
    expect(result.svg).not.toContain('undefined');
  });

  it('flags text below the supplied minimum without shrinking it', () => {
    const result = layoutLabel(
      input({
        blocks: [block({ fontSizeMm: 1.4, minimumFontSizeMm: 1.5 })],
      }),
    );

    expect(result.status).toBe('review_required');
    expect(result.svg).toContain('font-size="1.4"');
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'TEXT_BELOW_MINIMUM' }));
  });

  it('requires review when minimum-size policy is unverified', () => {
    const result = layoutLabel(
      input({
        blocks: [block({ minimumSizeStatus: 'review_required', minimumSizeSource: null })],
      }),
    );

    expect(result.status).toBe('review_required');
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'MINIMUM_SIZE_REVIEW_REQUIRED' }),
    );
  });

  it('keeps an absent minimum-size policy review-required without inventing a threshold', () => {
    const result = layoutLabel(
      input({
        blocks: [block({ minimumFontSizeMm: null })],
      }),
    );

    expect(result.status).toBe('review_required');
    expect(result.svg).toContain('font-size="3"');
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'MINIMUM_SIZE_REVIEW_REQUIRED' }),
    );
    expect(result.issues).not.toContainEqual(
      expect.objectContaining({ code: 'TEXT_BELOW_MINIMUM' }),
    );
  });

  it('requires a source before treating a minimum text size as approved', () => {
    const result = layoutLabel(
      input({
        blocks: [block({ minimumSizeSource: null })],
      }),
    );

    expect(result.status).toBe('review_required');
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'MINIMUM_SIZE_SOURCE_MISSING' }),
    );
  });

  it('reports vertical overflow and leaves authored font size unchanged', () => {
    const result = layoutLabel(
      input({
        heightMm: 24,
        orientation: 'landscape',
        margins: { topMm: 5, rightMm: 5, bottomMm: 5, leftMm: 5 },
        blocks: [block({ fontSizeMm: 3, lines: ['One', 'Two', 'Three', 'Four'] })],
      }),
    );

    expect(result.status).toBe('review_required');
    expect(result.svg.match(/font-size="3"/g)).toHaveLength(5);
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'BLOCK_OVERFLOW' }));
  });

  it('flags estimated horizontal overflow without shrinking the text', () => {
    const longLine = 'W'.repeat(50);
    const result = layoutLabel(
      input({
        blocks: [block({ fontSizeMm: 3, lines: [longLine] })],
      }),
    );

    expect(result.status).toBe('review_required');
    expect(result.svg).toContain(longLine);
    expect(result.issues).toContainEqual(
      expect.objectContaining({ code: 'LINE_OVERFLOW', lineIndex: 0 }),
    );
  });

  it('validates physical dimensions, orientation, and printable margins', () => {
    expect(() => layoutLabel(input({ widthMm: 0 }))).toThrow(
      'widthMm must be a positive finite number',
    );
    expect(() => layoutLabel(input({ orientation: 'landscape' }))).toThrow(
      'Landscape labels must not be higher',
    );
    expect(() =>
      layoutLabel(
        input({
          margins: { topMm: 70, rightMm: 5, bottomMm: 80, leftMm: 5 },
        }),
      ),
    ).toThrow('must leave a positive content area');
  });

  it('warns when content blocks are duplicated', () => {
    const result = layoutLabel(
      input({
        blocks: [block(), block({ id: 'another-food-name' })],
      }),
    );

    expect(result.status).toBe('review_required');
    expect(result.issues).toContainEqual(expect.objectContaining({ code: 'DUPLICATE_BLOCK' }));
  });
});
