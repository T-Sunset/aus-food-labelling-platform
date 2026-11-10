export type FormulationReferenceGraph = ReadonlyMap<string, readonly string[]>;

export type MassUnit = 'mg' | 'g' | 'kg';
export type FoodState =
  | 'asAdded'
  | 'asProcessed'
  | 'asSold'
  | 'asPrepared'
  | 'asReconstituted'
  | 'asDrained';

export type ClassificationAnswer = 'yes' | 'no' | 'unknown' | 'conflicting';

export type ClassificationEvidenceKind =
  | 'supplierSpecification'
  | 'formulationRecord'
  | 'productPackaging'
  | 'productBrief'
  | 'processRecord'
  | 'other';

export interface ProductClassificationEvidence {
  readonly id: string;
  readonly reference: string;
  readonly sourceDate: string;
  readonly kind: ClassificationEvidenceKind;
}

export interface ProductClassificationFact {
  readonly answer: ClassificationAnswer;
  readonly evidence: readonly ProductClassificationEvidence[];
}

export interface ProductClassificationProfile {
  readonly intendedUseDescription: string;
  readonly intendedConsumerDescription: string;
  readonly processingDescription: string;
  readonly presentationDescription: string;
  readonly identityEvidence: readonly ProductClassificationEvidence[];
  readonly formulatedCaffeinatedBeverage: {
    readonly flavoured: ProductClassificationFact;
    readonly nonAlcoholic: ProductClassificationFact;
    readonly containsCaffeine: ProductClassificationFact;
    readonly representedForMentalPerformance: ProductClassificationFact;
  };
  readonly foodForInfants: {
    readonly intendedAsNourishmentForInfants: ProductClassificationFact;
    readonly infantFormulaProduct: ProductClassificationFact;
    readonly formulatedMealReplacement: ProductClassificationFact;
    readonly formulatedSupplementaryFood: ProductClassificationFact;
    readonly unprocessedFruitOrVegetables: ProductClassificationFact;
  };
}

export type AdditiveConcentrationUnit =
  | 'mgPerKg'
  | 'gPerKg'
  | 'mgPerL'
  | 'gPerL'
  | 'mgPer100g'
  | 'gPer100g'
  | 'mgPer100mL'
  | 'gPer100mL'
  | 'percentByMass'
  | 'percentByVolume';

export type AdditiveConcentrationBasis =
  | 'asSupplied'
  | 'dryMatter'
  | 'asAdded'
  | 'asPrepared'
  | 'asReconstituted'
  | 'asDrained'
  | 'unknown';

export type AdditiveSourceStatus = 'added' | 'carriedOver' | 'processingAid' | 'unknown';

export type AdditiveSourceEvidenceKind =
  | 'supplierSpecification'
  | 'certificateOfAnalysis'
  | 'formulationRecord'
  | 'productPackaging'
  | 'processRecord'
  | 'other';

export type AdditiveDeclarationRoute =
  | 'schedule7Class'
  | 'noSchedule7Class'
  | 'enzyme'
  | 'flavouring'
  | 'specifiedFlavouringSubstance'
  | 'addedCaffeine'
  | 'unknown';

export type AdditiveDeclarationSubstanceChoice = 'schedule8Name' | 'schedule8CodeNumber';

export interface AdditiveDeclarationSelection {
  readonly route: AdditiveDeclarationRoute;
  readonly schedule7ClassName?: string;
  readonly substanceChoice?: AdditiveDeclarationSubstanceChoice;
  readonly flavouringWording?: 'flavouring' | 'flavour' | 'specificName';
}

export interface AdditiveDeclarationFormatInput {
  readonly route: AdditiveDeclarationRoute;
  readonly additiveName: string;
  readonly codeNumber?: string;
  readonly schedule7ClassName?: string;
  readonly substanceChoice?: AdditiveDeclarationSubstanceChoice;
  readonly flavouringWording?: 'flavouring' | 'flavour' | 'specificName';
}

export interface AdditiveDeclarationCandidateInput extends AdditiveDeclarationFormatInput {
  readonly ingredientId: string;
  readonly sourcePath: readonly string[];
}

export interface AdditiveSourceEvidence {
  readonly id: string;
  readonly reference: string;
  readonly sourceDate: string;
  readonly kind: AdditiveSourceEvidenceKind;
}

export interface AdditiveConcentration {
  readonly value: string;
  readonly unit: AdditiveConcentrationUnit;
  readonly basis: AdditiveConcentrationBasis;
}

export interface IngredientAdditiveSource {
  readonly id: string;
  readonly additiveName: string;
  readonly codeNumber?: string;
  readonly technologicalPurposes?: readonly string[];
  readonly concentration?: AdditiveConcentration;
  readonly sourceEvidence?: readonly AdditiveSourceEvidence[];
  readonly sourceStatus: AdditiveSourceStatus;
  readonly declarationSelection?: AdditiveDeclarationSelection;
  readonly allergenAssessments?: Readonly<Record<string, AllergenEvidenceStatus>>;
}

export interface ExpandedAdditiveSource {
  readonly ingredientId: string;
  readonly sourcePath: readonly string[];
  readonly source: IngredientAdditiveSource;
}

export interface AdditiveDeclarationCandidate {
  readonly status: 'REVIEW REQUIRED';
  readonly text?: string;
  readonly route: AdditiveDeclarationRoute;
  readonly provision: string;
  readonly sourceIds: readonly string[];
  readonly ingredientId: string;
  readonly sourcePath: readonly string[];
  readonly reason:
    | 'DECLARATION_ROUTE_NOT_SELECTED'
    | 'SCHEDULE_7_CLASS_UNVERIFIED'
    | 'SCHEDULE_8_IDENTITY_UNVERIFIED'
    | 'SCHEDULE_8_CODE_UNAVAILABLE'
    | 'SPECIFIC_NAME_REQUIRED'
    | 'SOURCE_MAPPING_UNVERIFIED';
  readonly explanation: string;
}

export type AdditivePermissionFoodState = 'asSold' | 'asPrepared' | 'asReconstituted' | 'asDrained';

export interface AdditivePermissionCatalogRow {
  readonly id: string;
  readonly categoryId: string;
  readonly additiveIdentifiers: readonly string[];
  readonly calculationBasisIds: readonly string[];
  readonly description: string;
  readonly limit: {
    readonly type: 'GMP' | 'maximum';
    readonly printedValue?: string;
    readonly unit: 'not-applicable' | 'mg/kg-default' | 'mg/L';
    readonly reviewStatus: 'draft' | 'reviewed';
  };
  readonly conditions: readonly { readonly type: 'sourceText'; readonly text: string }[];
  readonly aggregationGroup?: string;
  readonly sourceValidation: 'transcribed' | 'table-presentation-unverified';
  readonly sourceIds: readonly string[];
  readonly reviewStatus: 'draft' | 'reviewed';
}

export interface AdditivePermissionCatalogView {
  readonly version: string;
  readonly checkedOn: string;
  readonly status: 'draft' | 'reviewed';
  readonly categories: readonly {
    readonly id: string;
    readonly code: string;
    readonly name: string;
    readonly reviewStatus: 'draft' | 'reviewed';
  }[];
  readonly typeGrants: readonly { readonly categoryId: string; readonly description: string }[];
  readonly rows: readonly AdditivePermissionCatalogRow[];
  readonly calculationBases: readonly {
    readonly id: string;
    readonly calculatedAs: string;
  }[];
  readonly purposes: readonly {
    readonly name: string;
    readonly subClasses: readonly string[];
  }[];
}

export interface AdditivePermissionEvaluationInput {
  readonly catalog: AdditivePermissionCatalogView;
  readonly rule: RuleTraceMetadata;
  // Category id the user or reviewer has confirmed; screening candidates are not enough.
  readonly confirmedCategoryId?: string | undefined;
  readonly additiveCodeNumber?: string | undefined;
  readonly technologicalPurpose?: string | undefined;
  readonly foodState?: AdditivePermissionFoodState | undefined;
  readonly sourceStatus: AdditiveSourceStatus;
  readonly gmpConfirmed?: boolean | undefined;
  readonly finalConcentration?: {
    readonly value: string;
    readonly unit: 'mg/kg' | 'mg/L';
    readonly calculatedAs?: string | undefined;
  } | undefined;
  readonly evidence?: { readonly reference: string; readonly sourceDate: string } | undefined;
  readonly sourcePath?: readonly string[] | undefined;
}

export type AdditivePermissionReviewReason =
  | 'RULE_BELOW_PROVISION_CONFIDENCE'
  | 'CATALOG_NOT_REVIEWED'
  | 'CATEGORY_NOT_CONFIRMED'
  | 'CATEGORY_NOT_IN_CATALOG'
  | 'ADDITIVE_IDENTITY_MISSING'
  | 'PURPOSE_MISSING'
  | 'PURPOSE_NOT_IN_SCHEDULE_14'
  | 'FOOD_STATE_MISSING'
  | 'SOURCE_STATUS_NOT_ADDED'
  | 'NO_ROW_IDENTIFIED'
  | 'AMBIGUOUS_ROWS'
  | 'ROW_NOT_REVIEWED'
  | 'ROW_SOURCE_UNVERIFIED'
  | 'ROW_CONDITIONS_NOT_EVALUATED'
  | 'ROW_AGGREGATED_LIMIT'
  | 'GMP_NOT_CONFIRMED'
  | 'CONCENTRATION_MISSING'
  | 'EVIDENCE_MISSING'
  | 'UNIT_MISMATCH'
  | 'CALCULATION_BASIS_MISMATCH';

export interface AdditivePermissionEvaluationValue {
  readonly outcome: 'within_limit' | 'exceeds_limit' | 'permitted_at_gmp' | 'review';
  readonly reasons: readonly AdditivePermissionReviewReason[];
  readonly selectedRowId?: string | undefined;
  readonly categoryId?: string | undefined;
  readonly maximum?: { readonly value: string; readonly unit: string } | undefined;
  readonly conditions: readonly string[];
}

export interface MassQuantity {
  readonly value: string;
  readonly unit: MassUnit;
}

export interface IngredientLine {
  readonly id: string;
  readonly kind: 'ingredient';
  readonly ingredientId: string;
  readonly quantity: MassQuantity;
}

export interface FormulationLine {
  readonly id: string;
  readonly kind: 'formulation';
  readonly formulationId: string;
  readonly quantity: MassQuantity;
}

export type FormulationComponent = IngredientLine | FormulationLine;

export interface Formulation {
  readonly id: string;
  readonly lines: readonly FormulationComponent[];
}

export interface ExpandedIngredient {
  readonly ingredientId: string;
  readonly mass: MassQuantity;
  readonly sourcePath: readonly string[];
}

export interface IngoingIngredientPercentage {
  readonly ingredientId: string;
  readonly mass: MassQuantity;
  readonly percentage: string;
  readonly sourcePath: readonly string[];
}

export interface ProcessMassChange {
  readonly id: string;
  readonly kind: 'addition' | 'gain' | 'loss';
  readonly mass: MassQuantity;
}

export interface ProcessMassProfile {
  readonly changes: readonly ProcessMassChange[];
  readonly declaredFinalMass?: MassQuantity;
}

export type ProcessMassBalance =
  | {
      readonly status: 'review_required';
      readonly reason: 'PROCESS_MASS_PROFILE_MISSING';
      readonly ingoingMass: MassQuantity;
    }
  | {
      readonly status: 'calculated';
      readonly ingoingMass: MassQuantity;
      readonly finalMass: MassQuantity;
      readonly yieldPercentage: string;
      readonly changes: readonly ProcessMassChange[];
    };

export type AdditiveConcentrationOutputUnit = 'mg/kg' | 'mg/L';

export interface AdditiveDensityEvidence {
  readonly gramsPerMillilitre: string;
  readonly evidenceReference: string;
  readonly sourceDate: string;
}

export type AdditiveConcentrationReviewReason =
  | 'ADDITIVE_CODE_MISSING'
  | 'FOOD_STATE_MISSING'
  | 'PROCESS_MASS_PROFILE_MISSING'
  | 'NO_MATCHING_SOURCE'
  | 'SOURCE_IDENTITY_MISSING'
  | 'SOURCE_NOT_ADDED'
  | 'CONCENTRATION_MISSING'
  | 'EVIDENCE_MISSING'
  | 'BASIS_NOT_SUPPORTED'
  | 'INGREDIENT_DENSITY_MISSING'
  | 'FINAL_DENSITY_MISSING';

export interface AdditiveConcentrationContribution {
  readonly sourceId: string;
  readonly ingredientId: string;
  readonly sourcePath: readonly string[];
  readonly ingredientMass: MassQuantity;
  readonly additiveMilligrams: string;
  readonly evidenceReference: string;
  readonly evidenceDate: string;
}

export interface AdditiveFinalConcentrationInput {
  readonly additiveCodeNumber?: string | undefined;
  readonly foodState?: AdditivePermissionFoodState | undefined;
  readonly outputUnit: AdditiveConcentrationOutputUnit;
  readonly ingredients: readonly ExpandedIngredient[];
  readonly sourcesByIngredient: ReadonlyMap<string, readonly IngredientAdditiveSource[]>;
  readonly processBalance: ProcessMassBalance;
  readonly ingredientDensities?: ReadonlyMap<string, AdditiveDensityEvidence> | undefined;
  readonly finalDensity?: AdditiveDensityEvidence | undefined;
}

export type AdditiveFinalConcentration =
  | {
      readonly status: 'review_required';
      readonly reasons: readonly AdditiveConcentrationReviewReason[];
      readonly detail: readonly string[];
    }
  | {
      readonly status: 'calculated';
      readonly additiveCodeNumber: string;
      readonly foodState: AdditivePermissionFoodState;
      readonly value: string;
      readonly unit: AdditiveConcentrationOutputUnit;
      readonly totalAdditiveMilligrams: string;
      readonly finalMass: MassQuantity;
      readonly yieldPercentage: string;
      readonly finalDensity?: AdditiveDensityEvidence;
      readonly contributions: readonly AdditiveConcentrationContribution[];
    };

export type NutrientId =
  | 'protein'
  | 'fat'
  | 'saturatedFat'
  | 'carbohydrate'
  | 'availableCarbohydrate'
  | 'unavailableCarbohydrate'
  | 'sugars'
  | 'sodium'
  | 'dietaryFibre'
  | 'organicAcids'
  | 'alcohol'
  | 'polyols'
  | 'erythritol'
  | 'glycerol'
  | 'dAllulose'
  | 'isomalt'
  | 'lactitol'
  | 'maltitol'
  | 'mannitol'
  | 'polydextrose'
  | 'sorbitol'
  | 'dTagatose'
  | 'xylitol';

export type NutrientUnit = 'g/100g' | 'mg/100g';

export type NutrientEvidenceType =
  | 'supplier'
  | 'analysis'
  | 'database'
  | 'calculated';

export interface NutrientEvidence {
  readonly value: string;
  readonly unit: NutrientUnit;
  readonly sourceId: string;
  readonly sourceDate: string;
  readonly evidenceType: NutrientEvidenceType;
  readonly method?: string;
}

export interface IngredientNutrientProfile {
  readonly ingredientId: string;
  readonly values: Partial<Record<NutrientId, NutrientEvidence>>;
}

export interface IngredientNutrientInput {
  readonly ingredient: ExpandedIngredient;
  readonly profile?: IngredientNutrientProfile;
}

export interface NutrientContributionSource {
  readonly sourcePath: readonly string[];
  readonly sourceId: string;
  readonly sourceDate: string;
  readonly evidenceType: NutrientEvidenceType;
  readonly method?: string;
}

export interface AggregatedNutrient {
  readonly nutrient: NutrientId;
  readonly value: string;
  readonly unit: NutrientUnit;
  readonly sources: readonly NutrientContributionSource[];
}

export type NutrientAggregationResult =
  | {
      readonly status: 'review_required';
      readonly reason: 'MISSING_NUTRIENT_EVIDENCE';
      readonly missing: readonly {
        readonly ingredientId: string;
        readonly sourcePath: readonly string[];
        readonly nutrient: NutrientId;
      }[];
    }
  | {
      readonly status: 'calculated';
      readonly basis: 'ingoing';
      readonly totalMass: MassQuantity;
      readonly nutrients: readonly AggregatedNutrient[];
    };

export type EnergyComponentCategory =
  | 'alcohol'
  | 'availableCarbohydrate'
  | 'unavailableCarbohydrate'
  | 'fat'
  | 'protein'
  | 'dAllulose'
  | 'erythritol'
  | 'glycerol'
  | 'isomalt'
  | 'lactitol'
  | 'maltitol'
  | 'mannitol'
  | 'organicAcids'
  | 'polydextrose'
  | 'sorbitol'
  | 'dTagatose'
  | 'xylitol';

export interface EnergyFactor {
  readonly value: string;
  readonly unit: 'kJ/g';
  readonly clause: 'S11-2(2)' | 'S11-2(3)';
}

export interface EnergyFactorSet {
  readonly id: string;
  readonly compilation: string;
  readonly effectiveDate: string;
  readonly sourceUrl: string;
  readonly factors: Partial<Record<EnergyComponentCategory, EnergyFactor>>;
}

export interface EnergyComponentInput {
  readonly id: string;
  readonly category?: EnergyComponentCategory;
  readonly mappingStatus: 'resolved' | 'review_required';
  readonly quantity?: string;
  readonly unit: NutrientUnit;
  readonly source?: NutrientContributionSource;
}

export type EnergyReviewReason =
  | 'MISSING_FACTOR_SET'
  | 'INCOMPLETE_COMPONENT_DATA'
  | 'NO_COMPONENTS'
  | 'MISSING_FOOD_STATE'
  | 'UNCLASSIFIED_COMPONENT'
  | 'MISSING_COMPONENT_QUANTITY'
  | 'MISSING_COMPONENT_SOURCE'
  | 'COMPONENT_MAPPING_REVIEW'
  | 'MISSING_ENERGY_FACTOR';

export type Schedule11EnergyResult =
  | {
      readonly status: 'review_required';
      readonly reasons: readonly {
        readonly code: EnergyReviewReason;
        readonly componentId?: string;
        readonly category?: EnergyComponentCategory;
      }[];
    }
  | {
      readonly status: 'calculated';
      readonly foodState: FoodState;
      readonly energyKjPer100g: string;
      readonly rule: {
        readonly id: string;
        readonly compilation: string;
        readonly effectiveDate: string;
        readonly sourceUrl: string;
        readonly clause: 'S11-2(1)';
      };
      readonly contributions: readonly {
        readonly componentId: string;
        readonly category: EnergyComponentCategory;
        readonly quantity: string;
        readonly factor: EnergyFactor;
        readonly contributionKjPer100g: string;
        readonly source: NutrientContributionSource;
      }[];
    };

export type ResultStatus =
  | 'PASS'
  | 'FAIL'
  | 'WARNING'
  | 'REVIEW REQUIRED'
  | 'INFORMATIONAL';

export type ApplicationMode =
  | 'APPLIED'
  | 'CANDIDATE'
  | 'CONTEXT'
  | 'UNDETERMINABLE';

export type MappingConfidence =
  | 'Provision'
  | 'Standard'
  | 'Instrument'
  | 'Guidance-only'
  | 'Unmapped';

export interface RuleTraceMetadata {
  readonly id: string;
  readonly name: string;
  readonly instrument: string;
  readonly provision: string;
  readonly sourceUrl: string;
  readonly jurisdiction: string;
  readonly effectiveFrom: string;
  readonly effectiveTo?: string;
  readonly version: string;
  readonly mappingConfidence: MappingConfidence;
}

export interface EvaluationInputTrace {
  readonly name: string;
  readonly value: string;
  readonly unit?: string;
  readonly sourceId: string;
  readonly sourceDate: string;
  readonly sourcePath: readonly string[];
}

interface EngineResultBase<T> {
  readonly title: string;
  readonly whatWasChecked: string;
  readonly rule: RuleTraceMetadata;
  readonly inputs: readonly EvaluationInputTrace[];
  readonly explanation: string;
  readonly suggestedAction?: string;
  readonly value?: T;
  readonly nonCertificationStatement: 'This result assists review and does not certify legal compliance.';
}

export type EngineResult<T> = EngineResultBase<T> & (
  | {
      readonly status: 'PASS' | 'FAIL' | 'WARNING' | 'REVIEW REQUIRED';
      readonly applicationMode: 'APPLIED';
    }
  | {
      readonly status: 'REVIEW REQUIRED';
      readonly applicationMode: 'CANDIDATE' | 'UNDETERMINABLE';
    }
  | {
      readonly status: 'INFORMATIONAL';
      readonly applicationMode: 'CONTEXT';
    }
);

export type AllergenEvidenceStatus =
  | 'present'
  | 'absent'
  | 'unknown'
  | 'exemption_review'
  | 'conflict';

export type AllergenSourceKind =
  | 'ingredient'
  | 'additive'
  | 'carrier'
  | 'processingAid';

export interface AllergenEvidenceSource {
  readonly id: string;
  readonly subjectId: string;
  readonly kind: AllergenSourceKind;
  readonly sourceId: string;
  readonly sourceDate: string;
  readonly sourcePath: readonly string[];
  readonly assessments: Readonly<Record<string, AllergenEvidenceStatus>>;
}

export interface AllergenVocabularyEntry {
  readonly id: string;
  readonly ingredientListName: string;
  readonly summaryName: string;
  readonly requiresFinalFoodEvaluation?: boolean;
}

export interface PropagatedAllergen {
  readonly id: string;
  readonly ingredientListName: string;
  readonly summaryName: string;
  readonly sourcePaths: readonly (readonly string[])[];
}

export type AllergenPropagationResult =
  | {
      readonly status: 'review_required';
      readonly reason: 'INCOMPLETE_ALLERGEN_EVIDENCE';
      readonly allergens: readonly PropagatedAllergen[];
      readonly unresolved: readonly {
        readonly sourceId?: string;
        readonly allergenId: string;
        readonly status: AllergenEvidenceStatus | 'missing' | 'final_food_evaluation';
        readonly sourcePath?: readonly string[];
      }[];
    }
  | {
      readonly status: 'propagated';
      readonly allergens: readonly PropagatedAllergen[];
    };

export interface IngredientDeclarationNode {
  readonly ingredientId: string;
  readonly displayName: string;
  readonly nameSourceId: string;
  readonly mass: MassQuantity;
  readonly sourcePath: readonly string[];
  readonly kind: 'atomic' | 'compound';
  readonly compositionStatus: 'complete' | 'review_required' | 'not_applicable';
  readonly children: readonly IngredientDeclarationNode[];
}

export interface OrderedIngredientDeclarationNode extends IngredientDeclarationNode {
  readonly children: readonly OrderedIngredientDeclarationNode[];
}

export type IngredientDeclarationResult =
  | {
      readonly status: 'review_required';
      readonly basis: 'ingoing';
      readonly ingredients: readonly OrderedIngredientDeclarationNode[];
      readonly unresolvedPaths: readonly (readonly string[])[];
    }
  | {
      readonly status: 'ordered';
      readonly basis: 'ingoing';
      readonly ingredients: readonly OrderedIngredientDeclarationNode[];
    };
