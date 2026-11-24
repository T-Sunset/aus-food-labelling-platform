import type {
  EvaluationInputTrace,
  ProductClassificationFact,
  ProvisionalCaffeineInput,
  ProvisionalCaffeineResult,
} from '@aus-food/domain';
import { compareDecimals } from './decimal.js';

function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validInputTrace(trace: EvaluationInputTrace, evaluationDate: string): boolean {
  return trace.name.trim() !== '' && trace.value.trim() !== ''
    && (trace.sourceDate === '' || (validDate(trace.sourceDate) && trace.sourceDate <= evaluationDate))
    && trace.sourcePath.length > 0
    && trace.sourcePath.every((part) => part.trim() !== '');
}

export function evaluateProvisionalCaffeine(input: ProvisionalCaffeineInput): ProvisionalCaffeineResult {
  const { rule, evaluationDate, concentration } = input;
  const reasons: string[] = [];
  const inputs: EvaluationInputTrace[] = [];
  const facts: readonly [string, ProductClassificationFact][] = [
    ['Beverage', input.classification.beverage],
    ['Flavoured', input.classification.flavoured],
    ['Non-alcoholic', input.classification.nonAlcoholic],
    ['Contains caffeine', input.classification.containsCaffeine],
    ['Purpose of enhancing mental performance', input.classification.mentalPerformancePurpose],
  ];
  const limitations = [
    rule.transition.note,
    `Transition: ${rule.transition.starts} to ${rule.transition.ends}; ${rule.transition.sourceUrl}`,
    'The selected product workflow is a routing choice, not a legal product classification.',
    'This check does not assess caffeine-source permissions, other substances, labelling requirements or analytical uncertainty.',
    'The calculation uses recorded ingredient caffeine facts and recipe amounts; it does not estimate processing losses or gains.',
    'User-entered facts and any supplied sources have not been independently verified. Obtain independent expert review.',
  ];
  let notApplicable = false;
  const dateUsable = validDate(evaluationDate);
  if (!dateUsable || !validDate(rule.trace.effectiveFrom) || !validDate(rule.checkedOn)
    || evaluationDate < rule.trace.effectiveFrom || evaluationDate > rule.checkedOn
    || (rule.trace.effectiveTo !== undefined
      && (!validDate(rule.trace.effectiveTo) || evaluationDate > rule.trace.effectiveTo))) {
    reasons.push('The evaluation date is outside the verified rule period.');
  }
  if (rule.trace.id !== 'demo.fcb.caffeine-concentration.v1'
    || rule.trace.mappingConfidence !== 'Provision'
    || !rule.trace.version.trim() || !rule.trace.sourceUrl.trim()
    || !validDate(rule.transition.starts) || !validDate(rule.transition.ends)
    || !rule.transition.sourceUrl.trim()) {
    reasons.push('The selected rule or provision mapping is not supported.');
  }
  for (const [name, fact] of facts) {
    const traces = fact.evidence.length
      ? fact.evidence.map((item): EvaluationInputTrace => ({
          name, value: fact.answer, sourceId: item.id, sourceDate: item.sourceDate,
          sourcePath: item.reference ? [item.reference] : ['Product classification', name],
        }))
      : [{
          name, value: fact.answer, sourceId: '', sourceDate: '',
          sourcePath: ['Product classification', name],
        }];
    inputs.push(...traces);
    if (fact.answer === 'conflicting' || fact.answer === 'unknown') {
      reasons.push(`${name}: ${fact.answer === 'conflicting' ? 'evidence conflicts' : 'not established'}.`);
    } else if (!traces.every((trace) => validInputTrace(trace, evaluationDate))) {
      reasons.push(`${name}: the recorded answer or its optional source date is invalid.`);
    } else if (fact.answer === 'no') {
      notApplicable = true;
    }
  }
  if (concentration?.completeness === 'complete' && concentration.value !== undefined) {
    try {
      const totalIsZero = compareDecimals(concentration.value, '0') === 0;
      if (input.classification.containsCaffeine.answer === 'yes' && totalIsZero) {
        reasons.push('Caffeine is recorded as present, but complete ingredient evidence totals zero; resolve the conflicting inputs.');
      } else if (input.classification.containsCaffeine.answer === 'no' && !totalIsZero) {
        reasons.push('Caffeine is recorded as absent, but complete ingredient evidence reports caffeine; resolve the conflicting inputs.');
      }
    } catch (error) {
      if (!(error instanceof TypeError)) throw error;
      reasons.push('The calculated caffeine concentration is invalid.');
    }
  }
  if (concentration) inputs.push(...concentration.evidence);
  let status: ProvisionalCaffeineResult['status'] = 'REVIEW REQUIRED';
  if (notApplicable && reasons.length === 0) {
    status = 'NOT APPLICABLE';
  } else if (!notApplicable) {
    if (!concentration || concentration.completeness !== 'complete' || (concentration.issues?.length ?? 0) > 0) {
      const concentrationIssues = concentration?.issues ?? [];
      reasons.push(...(concentrationIssues.length
        ? concentrationIssues
        : ['Total caffeine from every source is missing, incomplete or conflicting.']));
    } else {
      const source = concentration.evidence[0];
      if (source !== undefined && concentration.value !== undefined) {
        inputs.push({
          name: 'Evaluated total caffeine',
          value: concentration.value,
          unit: concentration.unit,
          sourceId: 'Derived from complete ingredient and density evidence',
          sourceDate: concentration.evidence.map((trace) => trace.sourceDate).filter(validDate).sort().at(-1) ?? source.sourceDate,
          sourcePath: ['Calculated from complete ingredient caffeine and final-density evidence'],
        });
      } else {
        reasons.push('The complete concentration calculation did not provide a value.');
      }
      if (concentration.foodState !== 'readyToDrinkAsSold') {
        reasons.push('The supported food state is a ready-to-drink beverage as sold.');
      }
      if (!concentration.evidence.length || !concentration.evidence.every((trace) => validInputTrace(trace, evaluationDate))) {
        reasons.push('Concentration inputs or their source paths are missing or invalid.');
      }
      const value = concentration.value;
      try {
        if (value === undefined || concentration.unit !== 'mg/L' || compareDecimals(value, '0') < 0
          || compareDecimals(rule.minimumMgPerL, '0') < 0
          || compareDecimals(rule.minimumMgPerL, rule.maximumMgPerL) > 0) {
          reasons.push('The caffeine concentration or rule bounds are invalid.');
        } else if (reasons.length === 0) {
          status = compareDecimals(value, rule.minimumMgPerL) >= 0
            && compareDecimals(value, rule.maximumMgPerL) <= 0
            ? 'WITHIN RANGE' : 'OUTSIDE RANGE';
        }
      } catch (error) {
        if (!(error instanceof TypeError)) throw error;
        reasons.push('The caffeine concentration or rule bounds are invalid.');
      }
    }
  }
  const explanation = status === 'REVIEW REQUIRED'
    ? reasons.join(' ')
    : status === 'NOT APPLICABLE'
      ? 'The recorded facts do not meet the formulated caffeinated beverage definition; this check does not assess other applicable rules.'
      : `The total caffeine is ${concentration?.value} mg/L, ${status === 'WITHIN RANGE' ? 'within' : 'outside'} the ${rule.minimumMgPerL}-${rule.maximumMgPerL} mg/L range.`;
  return {
    status,
    resultBasis: status === 'REVIEW REQUIRED' ? 'unresolved' : 'provisional',
    ruleReviewStatus: rule.reviewStatus,
    rule: rule.trace,
    evaluationDate,
    inputs,
    explanation,
    limitations,
    nonCertificationStatement: 'This result assists review and does not certify legal compliance.',
  };
}
