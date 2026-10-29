# Coding standards

These conventions apply to handwritten code and documentation in Reng. Use the installed framework documentation and existing project contracts when implementing a change. Formatting is defined by `.prettierrc.json`; correctness and style checks live in `eslint.config.mjs`.

## Language and naming

- Use English for file/directory names, route segments, identifiers, comments, test descriptions and developer diagnostics. Use Vietnamese for the initial management UI and instructional language, Chinese for the service MVP learning content, and preserve existing Japanese content; translating user content is a separate task.
- Use lowercase kebab-case filenames: `kana-practice.tsx`, `generate-audio.ts`, `phase-1.md`. Keep framework/tool names such as `page.tsx`, `layout.tsx`, `AGENTS.md`, `README.md` and numbered migrations.
- Components and interfaces use PascalCase; functions, variables and hooks use camelCase. Hooks start with `use`; boolean names explain their meaning (`isCorrect`, `hasFeedback`). Fixed configuration collections use UPPER_SNAKE_CASE; schema instances, loaded datasets and derived state use camelCase.
- Name callbacks after their domain object (`item`, `record`, `group`, `event`), avoiding `x`, `r`, `s` or unclear abbreviations. Loop indices and standard names such as `id`, `url` and `db` are acceptable when their purpose is clear.
- Declare component props in a named `ComponentNameProps` interface, outside the component. Prefer `interface` for object contracts and `type` for unions or inferred schema types.

## Structure

```text
app/                     Route entry points, layout, global styles
components/
  kana/                  Kana feature components
  ui/                    Shared UI primitives
  audio-provider.tsx     Shared audio context and tightly related hook/status
lib/                     Pure domain logic, validators and data loading
  grading/               Shared client/server grading
  notifications/         Pure email scheduling, templates and signatures
  server/                Server-only data access, session and API helpers (`server-only`)
app/actions/             Server Actions for forms (each re-checks the caller)
scripts/                 Explicit CLI entry points, never imported by UI
content/                 Validated learning data and asset manifests
tests/                   Logic/database/pipeline tests
e2e/                     Browser tests without external services
e2e-supabase/            Browser tests against the local Supabase stack only
docs/
  basic-design/
  detail-design/
  testing/
```

- Pages load data and compose components. Feature components own the relevant interactions; `lib` owns pure validation/grading/session algorithms. Do not add an API for local static data without a use case.
- Split substantial configuration, question and result views into meaningful components. Aim for one main responsibility per component; do not extract every wrapper or add generic abstractions for one use.
- Prefer named exports. Use default exports where Next.js or a configuration loader expects them. Avoid barrel exports unless there is a concrete benefit.
- Use `@/` imports for application modules. Standalone Node scripts/tests may use relative imports. Do not move server-only SDKs or secrets into client dependencies.

## TypeScript and control flow

- Keep TypeScript strict. Validate external/JSON data at boundaries; narrow `unknown` errors. Do not introduce `any` or non-null assertions. Use a guard, invariant helper or explicit error when required data is absent.
- Use `import type` for type-only imports. Group imports as Node builtins, third-party packages, project modules, relative modules, then a separate type-import group; separate groups and declarations with blank lines. CSS imports keep their intentional order.
- Always use braces around control-flow bodies, even for a one-line return or throw.
- Prefer early returns and named conditions. Avoid nested ternaries and side effects inside JSX expressions. A simple ternary for two render alternatives is fine.
- Use descriptive exported function names (`normalizeRomaji`, `createSession`). Use `handle...` for component event handlers. Extract a handler when it changes multiple values or contains business decisions; a simple setter callback may stay inline.
- Keep data immutable when filtering/shuffling/reducing. Use reducers for related session transitions. Do not change grading rules while doing a style-only refactor.
- Comment on a constraint or reason, rather than paraphrasing the next line. Avoid speculative abstractions, unnecessary memoization and lint suppression to bypass these rules.

## React, CSS and accessibility

- Use Server Components by default; add `"use client"` only where interaction/browser APIs require it. Put a blank line after directives.
- Keep browser playback and cleanup in the audio owner. Preserve keyboard behavior, focus, live feedback, cancellation and timeouts during refactoring.
- Keep design tokens in CSS variables. Reuse component variants and meaningful classes; do not introduce hard-coded component colors or style changes during this cleanup.
- Maintain semantic controls, labels, visible focus and the 360px layout. Route names are English; displayed labels and learning content follow the relevant UI and course languages.
- When renaming an existing URL, update internal links, docs and tests; provide an explicit redirect for previously served URLs when appropriate.

## Verification and delivery

- Run `npm run check` for formatting, ESLint, TypeScript and unit/database tests. Run browser tests for interaction/route refactors and a build for framework integration changes. Scope additional checks to the change.
- Test product behavior and failure boundaries; do not add tests that only repeat a formatter rule. Never use a real cloud account for automated tests by default.
- Keep documentation references current when moving files. Distinguish prepared migrations/configuration from changes actually applied to a service.
- Make routine authorized edits and run local checks autonomously. Ask only when an unresolved product/technical decision requires the user's choice. Required environment approval mechanisms still apply; never claim they have been disabled.

## Git delivery policy

The user authorizes direct delivery to main, without feature branches or pull requests, for this repository. Make one or more focused English commits per completed, verified task and push to origin/main. Do not add AI generation/authorship/co-author trailers. Verify the requested GitHub identity and remote before authenticated writes; never substitute another account silently or force-push remote history.
