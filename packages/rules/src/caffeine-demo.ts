import type { ProvisionalCaffeineRule } from '@aus-food/domain';

export const demoCaffeineRule: ProvisionalCaffeineRule = {
  trace: {
    id: 'demo.fcb.caffeine-concentration.v1',
    name: 'Formulated caffeinated beverage caffeine concentration',
    instrument: 'Australia New Zealand Food Standards Code',
    provision: 'Standard 2.6.4-3(a); definition in 2.6.4-2',
    sourceUrl: 'https://www.legislation.gov.au/F2015L00467/asmade/2015-04-01/text/original/epub/OEBPS/document_1/document_1.html',
    jurisdiction: 'Australia',
    effectiveFrom: '2026-06-09',
    version: 'demo-caffeine-1; F2015L00467; checked 2026-11-11',
    mappingConfidence: 'Provision',
  },
  reviewStatus: 'draft',
  checkedOn: '2026-11-11',
  minimumMgPerL: '145',
  maximumMgPerL: '320',
  transition: {
    starts: '2026-06-09',
    ends: '2028-06-09',
    sourceUrl: 'https://www.legislation.gov.au/F2026L00700/asmade/2026-06-09/text/original/epub/OEBPS/document_1/document_1.html',
    note: 'P1056 transition permits either Code path; the caffeine range is unchanged. Caffeine-source permissions are a separate check and are not assessed here.',
  },
};
