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
