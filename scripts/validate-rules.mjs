import { readFile } from 'node:fs/promises';
import { validateRuleRelease } from '../packages/rules/dist/index.js';

const manifestUrl = new URL(
  '../packages/rules/data/release-0.1.0-draft.json',
  import.meta.url,
);
const manifestText = await readFile(manifestUrl, 'utf8');
const manifest = JSON.parse(manifestText);

validateRuleRelease(manifest);

console.log(
  `Validated ${manifest.rules.length} draft rules and ${manifest.sources.length} sources in ${manifest.version}; no rules are enabled.`,
);
