# AGENTS.md - Australian Food Labelling Platform

## What this project is

A privacy-focused Australian food-labelling and formulation product. Users model ingredients, nested formulations and products locally; the system calculates nutrition, declarations and allergens, evaluates regulatory rules with an explanation and source for every result, and produces a label preview and PDF. It assists compliance and never certifies it. Primary legal focus is Victoria, within the Australia New Zealand Food Standards Code.

## Read first

1. `docs/implementation-plan.md` - roadmap, locked decisions, current phase and progress tracker.
2. `docs/requirements.md` - the requirements contract. Cite requirement IDs (for example TRACE-015, CALC-001) in work and commit messages.
3. `docs/reviewer-questions.md` - open questions for the human food-regulatory reviewer.

## Current state

The reviewer-ready Phase 1 engineering baseline is available. Phase 2 groundwork is the current workstream; product classification, NIP presentation, additive results and prescribed-name results remain `REVIEW REQUIRED` where their reviewer gates are unresolved. Do not treat this milestone as regulatory acceptance or public-release approval.

## Rules that always apply

- Never state or imply that the product, a label or a rule result certifies legal compliance.
- Unknown input is never zero and never PASS. Missing data returns REVIEW REQUIRED.
- Formulation data stays on the user's device. Do not add analytics, telemetry, third-party scripts or logging of formulation content.
- Do not invent regulatory facts, thresholds, clause numbers or URLs. Regulatory values belong in versioned rule data with a source, a mapping confidence and an effective date. If you cannot verify something, tag it `TO BE VERIFIED` or `TO BE RESEARCHED` and say so.
- A rule below Provision-level mapping confidence must not produce a deterministic FAIL without reviewer approval.
- Keep the compliance engine pure: no DOM, no network, no storage inside `packages/engine`.
- Approved versions are immutable. Reject circular ingredient references on edit, import, restore and sync.
- Status must never rely on colour alone.

## Working agreements

- Work on the current phase and step from the plan. Do not start later phases early.
- Record technology and design decisions as ADRs in `docs/adr/`. Do not change locked decisions (plan section 3) without asking the user.
- Tick the progress tracker in the plan when a step meets its exit criteria.
- Ask before destructive actions: deleting `archive/`, rewriting history, force pushes, removing data. Do not commit or push unless asked.
- Prefer small changes with tests. Every rule and calculation needs boundary tests, including missing inputs and non-applicability.
- For regulatory research use the `Australian Food Requirements Analyst` agent (`.github/agents/`). It is a research and documentation agent and must not write application code.
- Keep research bounded: read primary sources only for the provisions a task needs, and report what was and was not verified.

## Legacy code

`frontend/` is a throwaway prototype and is moved to `archive/legacy-frontend/` in plan step P0-1. Do not extend it. Do not copy its regulatory data (`src/config/*.ts`) or engines into new code without verifying against primary sources. Its committed Firebase config and Analytics must not be reused.

## Repo map (target)

- `apps/web` - Vue 3 application.
- `packages/domain`, `packages/engine`, `packages/rules`, `packages/label` - shared types, pure engine, rule data, label output.
- `docs/` - requirements, plan, reviewer questions, ADRs.
- `archive/` - out-of-use legacy code, to be deleted with user approval.

## Commands

- Use Node.js `26.13.0` as pinned in `.nvmrc`; pnpm `12.16.1` is pinned in the root `package.json`.
- Install dependencies: `pnpm install`
- Build: `pnpm build`
- Type-check: `pnpm typecheck`
- Lint: `pnpm lint`
- Unit tests: `pnpm test`
- End-to-end tests: `pnpm test:e2e`
- Rule-data validation: `pnpm validate:rules`
