import {
  additivePermissionCatalog,
  allergenVocabulary,
  claimRuleCatalog,
  prescribedNameCandidateCatalog,
  sources,
} from '@aus-food/rules/release-0.1.0-draft.json';
import type {
  AdditivePermissionCatalogView,
  ClaimRuleView,
  PrescribedNameRuleView,
  RuleTraceMetadata,
} from '@aus-food/domain';

// Draft rule data shipped with the app. It is not reviewed and is never presented as an approved release.
export const RULE_RELEASE_LABEL = 'Draft rule data 0.1.0-draft (not reviewed)';

export const allergenChoices: readonly { id: string; label: string }[] = (
  allergenVocabulary.entries as readonly { id: string; summaryName: string }[]
).map((entry) => ({
  id: entry.id,
  label: entry.summaryName.charAt(0).toUpperCase() + entry.summaryName.slice(1),
}));

export const permissionCatalog = additivePermissionCatalog as unknown as AdditivePermissionCatalogView;
export const nameCatalogStatus = prescribedNameCandidateCatalog.status;
export const nameRules = prescribedNameCandidateCatalog.rules as unknown as readonly PrescribedNameRuleView[];

export interface ClaimRuleEntry extends ClaimRuleView {
  readonly mappingConfidence: RuleTraceMetadata['mappingConfidence'];
  readonly reviewStatus: 'draft' | 'reviewed';
  readonly sourceIds: readonly string[];
  readonly effectiveFrom: string;
  readonly notYetVerified: readonly string[];
}

export const claimRules = claimRuleCatalog.rules as unknown as readonly ClaimRuleEntry[];
export const claimCatalogReviewed = claimRuleCatalog.status === 'reviewed';

interface SourceEntry {
  readonly id: string;
  readonly instrument: string;
  readonly sourceUrl: string;
  readonly jurisdiction: string;
  readonly effectiveFrom: string;
}

function source(id: string): SourceEntry {
  const found = (sources as readonly SourceEntry[]).find((entry) => entry.id === id);
  if (!found) {
    throw new Error(`Draft rule data is missing source ${id}`);
  }
  return found;
}

function trace(
  id: string,
  name: string,
  provision: string,
  sourceId: string,
  mappingConfidence: RuleTraceMetadata['mappingConfidence'],
): RuleTraceMetadata {
  const entry = source(sourceId);
  return {
    id,
    name,
    instrument: entry.instrument,
    provision,
    sourceUrl: entry.sourceUrl,
    jurisdiction: entry.jurisdiction,
    effectiveFrom: entry.effectiveFrom,
    version: '0.1.0-draft',
    mappingConfidence,
  };
}

export function permissionRuleTrace(): RuleTraceMetadata {
  return trace(
    'additive.permission.draft',
    'Additive permission screening (draft data)',
    'Standard 1.3.1 and Schedule 15',
    'SRC-ADD-003',
    'Unmapped',
  );
}

export function nameRuleTrace(): RuleTraceMetadata {
  return trace(
    'name.candidates.draft',
    'Prescribed-name candidate identification (draft data)',
    'Standard 2.9.2 and Standard 2.6.4',
    'SRC-NAME-001',
    'Unmapped',
  );
}

export function sweetenedRuleTrace(): RuleTraceMetadata {
  const rule = nameRules.find((item) => item.id === 'name.infant.sweetened-word');
  return trace(
    'name.infant.sweetened-word',
    "Infant food 'sweetened' word (draft data)",
    rule?.provision ?? 'Standard 2.9.2-7(3)(d)',
    'SRC-NAME-001',
    rule?.mappingConfidence ?? 'Unmapped',
  );
}

export function sweetenedRuleApproved(): boolean {
  return nameRules.find((item) => item.id === 'name.infant.sweetened-word')?.reviewStatus === 'reviewed';
}

export function claimRuleTrace(rule: ClaimRuleEntry): RuleTraceMetadata {
  return trace(rule.id, `${rule.claimName} (draft data)`, rule.provision, rule.sourceIds[0] ?? 'SRC-CLAIM-001', rule.mappingConfidence);
}

// Used when a claim has no supported rule, so the result still carries rule metadata.
export function claimRoutingTrace(): RuleTraceMetadata {
  return trace(
    'claim.routing.draft',
    'Claim routing (draft data)',
    'Standard 1.2.7 and Schedule 4',
    'SRC-CLAIM-002',
    'Unmapped',
  );
}