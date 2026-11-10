# Coding standards

These conventions apply to handwritten code and documentation in Reng. Use the installed framework documentation and existing project contracts when implementing a change. Formatting is defined by `.prettierrc.json`; correctness and style checks live in `eslint.config.mjs`.

## Language and naming

- Use English for file/directory names, route segments, identifiers, comments, test descriptions and developer diagnostics. Use Vietnamese for the initial management UI and instructional language; learning content is Japanese for the current pilot (Minna no Nihongo lesson order) and Chinese for the Vietnamese–Chinese path; translating user content is a separate task.
- Use lowercase kebab-case filenames: `kana-practice.tsx`, `generate-audio.ts`, `phase-1.md`. Keep framework/tool names such as `page.tsx`, `layout.tsx`, `AGENTS.md`, `README.md` and timestamped migrations. A file that exports a hook is named after it: `use-draft-sync.ts`.
- Components and interfaces use PascalCase; functions, variables and hooks use camelCase. Hooks start with `use`; boolean names explain their meaning (`isCorrect`, `hasFeedback`). Fixed configuration collections use UPPER_SNAKE_CASE; schema instances, loaded datasets and derived state use camelCase.
- Name callbacks after their domain object (`item`, `record`, `group`, `event`, `question`), avoiding `x`, `q`, `r`, `s` or unclear abbreviations. Loop indices and standard names such as `id`, `url` and `db` are acceptable when their purpose is clear.
- Declare component props in a named `ComponentNameProps` interface, outside the component, also for small helper components in the same file. Sibling components that render the same data may share one props interface (`SlideContentProps`). Prefer `interface` for object contracts and `type` for unions or inferred schema types.

## Structure

```text
app/                        Routes: pages, layouts, route handlers, metadata
  actions/                  Server Actions for forms (each re-checks the caller)
  api/                      Route handlers for client fetches, cron jobs and webhooks
  globals.css               Imports the files in app/styles/ in cascade order (see Styles)
  lesson-visuals.css        Lesson pictures and slide visuals
  charts.css                Score charts
app/styles/                 One stylesheet per area: tokens, base, shell, home, kana, practice,
                            responsive, lessons, slides, components, assignment-fixes, questions,
                            teach, learner, editor, chinese-lessons, admin, public-pages
components/
  ui/                       Shared primitives: button variants, pending link, outcome filter
  auth/ settings/ admin/    Sign-in and sign-up, account and email settings, platform admin
  lessons/ slides/          Reading a lesson, furigana text, slide deck and presenter
  editor/                   Japanese lesson editor (/teach/lessons/[id]/edit)
  teaching/                 Chinese lesson authoring in five steps (schema v2)
  teach/                    Teacher area under /teach: classes, assignments, sessions, reports
  classroom/                Learner area: classes, attempts, results (/classes, /assignments)
  review/ daily-history/ progress/ charts/   Review cards, daily scores, progress charts
  kana/ kanji/ listening/ self-study/        Self-study tools
  audio-provider.tsx        Shared audio context; root files are used across the whole app
lib/                        Pure domain logic, validators and data loading for client and server
  <domain>-<topic>.ts       One topic per module, prefixed by its domain (lesson-, class-,
                            daily-, teaching-, audio-, jlpt-, assignment-)
  grading/                  Shared client/server grading
  notifications/            Pure email scheduling, templates and signatures
  server/                   Server-only data access, session and API helpers (`server-only`)
scripts/                    TypeScript CLI entry points run through npm scripts, never imported by UI
content/                    Validated learning data: kana, starter lessons, review banks,
                            listening sets, JLPT drafts and audio manifests; content/jlpt also
                            keeps source research (links and rights notes only)
public/                     Static files served as is: fonts, icons, lesson audio (audio/lessons)
proxy.ts                    Next.js proxy: refreshes the Supabase session cookie on each request
tests/                      node:test unit, database (PGlite) and content tests
e2e/                        Browser tests without external services
e2e-supabase/               Browser tests against the local Supabase stack only
supabase/                   config.toml, email templates and migrations; name a new migration
                            with a 14-digit UTC timestamp (docs/operations.md)
.github/workflows/          CI: npm run check on every push to main and every pull request
docs/                       Requirements, design, operations and dated test reports
  basic-design/  detail-design/  testing/
```

- `teach/` and `teaching/` are different features: `teach/` is the teacher's class management, `teaching/` is the Chinese lesson author. Put a new teacher-side view in `teach/`, a new learner-side view in `classroom/`.
- A feature folder may keep the hooks (`use-*.ts`), labels and client request helpers that only its components use (`components/editor/slide-labels.ts`, `components/review/review-request.ts`). Move such code to `lib` once a page, script, server module or test needs it too.
- Pages load data and compose components. Feature components own the relevant interactions; `lib` owns pure validation/grading/session algorithms. Do not add an API for local static data without a use case.
- Split substantial configuration, question and result views into meaningful components. Aim for one main responsibility per component; do not extract every wrapper or add generic abstractions for one use.
- When a page or component draws several independent views or grows past about 300 lines, move the views into named components of its feature folder and keep the page as data loading plus section order. Examples: `app/teach/classes/[id]/page.tsx` with `components/teach/class-*.tsx`; `components/teach/assignment-fix-table.tsx` with its form in `question-fix-form.tsx`.
- Write a helper once: a check needed by several modules lives in the `lib` module of its subject (`containsKanji` in `lib/japanese-text.ts`). Name types derived from a loader once, beside it (`ClassReport`, `ClassReportAssignment` in `lib/server/reports.ts`), instead of repeating `Awaited<ReturnType<…>>` in each consumer.
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
- Styles are plain CSS classes. `app/globals.css` only imports Tailwind and the files in `app/styles/`, one per area, and their order is part of the cascade: a later file may override an earlier one (`responsive.css` adjusts the shell, home, kana and practice files before it). Put a rule in the file of its feature, next to the rules it adjusts, with its media query beside it. A feature that fits no file gets a new file, imported after the files it builds on. Lesson pictures and slide visuals go in `app/lesson-visuals.css`, charts in `app/charts.css`; `app/layout.tsx` loads both after `globals.css`.
- Colours come from the tokens in `app/styles/tokens.css`, never as values in a rule, so the dark theme follows. Slides, the presenter previews, the editor preview and the print view keep the light tokens in the dark theme. After changing colours, check contrast (axe) in both themes.
- Maintain semantic controls, labels, visible focus and the 360px layout. Route names are English; displayed labels and learning content follow the relevant UI and course languages.
- When renaming an existing URL, update internal links, docs and tests; provide an explicit redirect for previously served URLs when appropriate.

## Scripts and content data

- Scripts are TypeScript, started as `node --import tsx scripts/<name>.ts` through an npm script named `<area>:<action>` (`bank:sql`, `jlpt:drafts`, `audit:jlpt-audio`). Read options with `parseArgs`, let an async `main()` throw on bad input, and end with `main().catch((error: unknown) => …)` that prints the message and sets a failing exit code. Say at the top what the script writes and what it never touches.
- A script never changes a database by itself: SQL generators write a file for a person to review that ends in `ROLLBACK` unless `--commit` is given (`bank:sql`, `listening:sql`).
- JSON written by a script goes through Prettier (`format` with `resolveConfig`) so `npm run format:check` passes on the result.
- Each kind of content file has a Zod schema in `lib` (`lesson-schema.ts`, `listening-set.ts`, `jlpt-question-draft.ts`) and a test that parses the committed files. A generated file is rebuilt by its script, and a test fails when it no longer matches its source.

## Verification and delivery

- Run `npm run check` for formatting, ESLint, TypeScript and unit/database tests. Run browser tests for interaction/route refactors and a build for framework integration changes. Scope additional checks to the change.
- Test product behavior and failure boundaries; do not add tests that only repeat a formatter rule. Never use a real cloud account for automated tests by default.
- Unit tests live in `tests/<subject>.test.ts`, import `{ test }` from `node:test` and `assert` from `node:assert/strict`, and name the behaviour they check (`JLPT drafts accept only original single-answer questions that fit an exam section`).
- Keep documentation references current when moving files. Distinguish prepared migrations/configuration from changes actually applied to a service.
- Make routine authorized edits and run local checks autonomously. Ask only when an unresolved product/technical decision requires the user's choice. Required environment approval mechanisms still apply; never claim they have been disabled.

## Git delivery policy

The user authorizes direct delivery to main, without feature branches or pull requests, for this repository. Make one or more focused English commits per completed, verified task. Each push to origin/main deploys production, so keep the commits local and push once the user's whole batch of work is finished and the user says to push. Do not add AI generation/authorship/co-author trailers. Verify the requested GitHub identity and remote before authenticated writes; never substitute another account silently or force-push remote history.

Write the commit subject as one plain English sentence in the imperative that says what changed for users or for the code, without type prefixes such as `feat:` or `fix(scope):` (`Let teachers copy a ready message about an assignment for the class chat group`, `Port the JLPT draft and audio audit tools to TypeScript`). Add a body when the reason is not obvious from the subject.
