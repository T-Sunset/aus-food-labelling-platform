import type {
  AdditiveDeclarationCandidate,
  AdditiveDeclarationCandidateInput,
} from '@aus-food/domain';

const routeSources = {
  schedule7Class: {
    provision: 'Standard 1.2.4—7(1)(a), (2); Schedule 7 S7—2; Schedule 8 S8—2',
    sourceIds: ['SRC-005', 'SRC-ADD-001', 'SRC-ADD-002'],
  },
  noSchedule7Class: {
    provision: 'Standard 1.2.4—7(1)(b); Schedule 8 S8—2',
    sourceIds: ['SRC-005', 'SRC-ADD-002'],
  },
  enzyme: {
    provision: 'Standard 1.2.4—7(3)',
    sourceIds: ['SRC-005'],
  },
  flavouring: {
    provision: 'Standard 1.2.4—7(4)',
    sourceIds: ['SRC-005'],
  },
  specifiedFlavouringSubstance: {
    provision: 'Standard 1.2.4—7(5); Schedule 8 S8—2',
    sourceIds: ['SRC-005', 'SRC-ADD-002'],
  },
  addedCaffeine: {
    provision: 'Standard 1.2.4—7(6)',
    sourceIds: ['SRC-005'],
  },
  unknown: {
    provision: 'Standard 1.2.4—7',
    sourceIds: ['SRC-005'],
  },
} as const;

function candidate(
  input: AdditiveDeclarationCandidateInput,
  text: string | undefined,
  reason: AdditiveDeclarationCandidate['reason'],
  explanation: string,
): AdditiveDeclarationCandidate {
  return {
    status: 'REVIEW REQUIRED',
    ...(text === undefined ? {} : { text }),
    route: input.route,
    provision: routeSources[input.route].provision,
    sourceIds: routeSources[input.route].sourceIds,
    ingredientId: input.ingredientId,
    sourcePath: [...input.sourcePath],
    reason,
    explanation,
  };
}

export function formatAdditiveDeclarationCandidate(
  input: AdditiveDeclarationCandidateInput,
): AdditiveDeclarationCandidate {
  const name = input.additiveName.trim();
  const codeNumber = input.codeNumber?.trim();
  const className = input.schedule7ClassName?.trim();

  if (input.sourcePath.length === 0 || !input.sourcePath.every((part) => part.trim())) {
    throw new TypeError('Additive declaration candidates require a complete ingredient source path');
  }
  if (!input.ingredientId.trim()) {
    throw new TypeError('Additive declaration candidates require an ingredient id');
  }

  switch (input.route) {
    case 'schedule7Class': {
      if (!className) {
        return candidate(
          input,
          undefined,
          'SCHEDULE_7_CLASS_UNVERIFIED',
          'Select a Schedule 7 class from a verified mapping and confirm it is the most appropriate class.',
        );
      }
      if (!name) {
        return candidate(
          input,
          undefined,
          'SCHEDULE_8_IDENTITY_UNVERIFIED',
          'A Schedule 8 name or code must be matched to the substance before a candidate can be formatted.',
        );
      }
      if (input.substanceChoice === 'schedule8CodeNumber' && !codeNumber) {
        return candidate(
          input,
          undefined,
          'SCHEDULE_8_CODE_UNAVAILABLE',
          'The selected code-number option has no recorded Schedule 8 code number.',
        );
      }
      if (
        input.substanceChoice !== 'schedule8Name'
        && input.substanceChoice !== 'schedule8CodeNumber'
      ) {
        return candidate(
          input,
          undefined,
          'SCHEDULE_8_IDENTITY_UNVERIFIED',
          'Choose the Schedule 8 name or code-number option after confirming the substance match.',
        );
      }
      return candidate(
        input,
        `${className} (${input.substanceChoice === 'schedule8CodeNumber' ? codeNumber : name})`,
        'SOURCE_MAPPING_UNVERIFIED',
        'Candidate wording only: Schedule 7 class fit and Schedule 8 substance identity have not been independently verified.',
      );
    }

    case 'noSchedule7Class':
      return name
        ? candidate(
            input,
            name,
            'SOURCE_MAPPING_UNVERIFIED',
            'Candidate wording only: both the Schedule 8 name and the conclusion that no Schedule 7 class applies require verification.',
          )
        : candidate(
            input,
            undefined,
            'SCHEDULE_8_IDENTITY_UNVERIFIED',
            'A Schedule 8 name is required when the additive cannot be classified into a Schedule 7 class.',
          );

    case 'enzyme':
      return candidate(
        input,
        'enzyme',
        'SOURCE_MAPPING_UNVERIFIED',
        'Candidate wording only: verify that this substance is an enzyme within the stated provision.',
      );

    case 'flavouring':
      if (input.flavouringWording === 'specificName') {
        return name
          ? candidate(
              input,
              name,
              'SOURCE_MAPPING_UNVERIFIED',
              'Candidate wording only: verify the substance is a flavouring and that the specific name or description is appropriate.',
            )
          : candidate(
              input,
              undefined,
              'SPECIFIC_NAME_REQUIRED',
              'Enter the selected specific flavouring name or description.',
            );
      }
      if (input.flavouringWording === 'flavouring' || input.flavouringWording === 'flavour') {
        return candidate(
          input,
          input.flavouringWording,
          'SOURCE_MAPPING_UNVERIFIED',
          'Candidate wording only: verify the substance meets the flavouring provision and that no more specific declaration applies.',
        );
      }
      return candidate(
        input,
        undefined,
        'DECLARATION_ROUTE_NOT_SELECTED',
        'Choose flavouring, flavour, or a specific name/description.',
      );

    case 'specifiedFlavouringSubstance':
      return candidate(
        input,
        undefined,
        'SCHEDULE_7_CLASS_UNVERIFIED',
        'This specified flavouring substance follows subsection (1); select and verify its Schedule 7 class or no-class route before formatting.',
      );

    case 'addedCaffeine':
      return candidate(
        input,
        'caffeine',
        'SOURCE_MAPPING_UNVERIFIED',
        'Candidate wording only: verify that the source is added caffeine covered by this provision.',
      );

    case 'unknown':
      return candidate(
        input,
        undefined,
        'DECLARATION_ROUTE_NOT_SELECTED',
        'Choose a declaration route after reviewing the additive identity and source evidence.',
      );
  }
}
