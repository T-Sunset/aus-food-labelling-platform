# ADR-001: Node.js and package manager

- Status: Accepted
- Date: 2026-11-05
- Requirements: Phase 0, P0-2

## Context

The workspace needs a reproducible Node.js runtime and package manager. The
implementation plan selects pnpm workspaces and asks that the Node.js current
LTS version be pinned.

## Decision

- Pin Node.js `26.13.0` in `.nvmrc`, the current LTS release as of this ADR.
- Allow the maintained Node.js 24 and 26 release lines in `engines.node`
  (`^24.13.1 || ^26.13.0`) so development also works on the existing Node 24
  environment.
- Use pnpm workspaces and pin pnpm `12.16.1` in the root `package.json`.

## Consequences

The committed pnpm lockfile will make dependency resolution reproducible.
Developers using Node 24 can work within the declared engine range; new
environments should use the pinned Node 26 LTS version.

## Sources

- Node.js 26.13.0 LTS release, 2026-10-28:
  https://nodejs.org/en/blog/release/v26.13.0
- pnpm package version: 12.16.1
