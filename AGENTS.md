# Masu project instructions

Read and follow [coding standards](docs/coding-standards.md) before editing source. The project uses English filenames, route segments and identifiers; user-facing learning content remains Vietnamese/Japanese.

- Apply `/home/vietlv/.codex/RTK.md`: prefix shell commands with `rtk`.
- Work autonomously within the user's authorized scope: inspect, edit, refactor, install required project dependencies and run relevant local checks without repeated confirmation. Ask when a technical/product decision cannot reasonably be settled from project evidence. Respect platform permission controls and never bypass a rejection.
- Preserve existing user edits and secrets. Keep cloud credentials server-side and distinguish local verification from deployment or cloud mutation.
- Keep `docs/basic-design`, `docs/detail-design`, `docs/testing` and README references synchronized with behavior and file moves.
- Use ESLint/Prettier/EditorConfig as the executable style baseline. Run `npm run check`; for affected routes/interactions run `npm run test:e2e`, and build when framework integration changes.
- The generated Next.js block below must be retained. Read relevant installed docs before changing framework integration.

## Git workflow

- Repository: `git@github.com:KaitoKid1612/masu.git`. The personal SSH key labeled `leviet1612@gmail.com` authenticates as GitHub account `KaitoKid1612`; the key label is not a GitHub username.
- Use repository-local commit identity `Lê Viết Việt <43107595+KaitoKid1612@users.noreply.github.com>` and the verified personal SSH identity. Keep private keys and local SSH configuration outside the repository.
- Work directly on `main`. Do not create a feature branch or PR unless the user changes this instruction.
- After each completed, verified task, create one or more focused commits and push to `origin/main` without asking again. The user has explicitly authorized this workflow.
- Commit messages must be concise English summaries. Do not append AI authorship, generation notices, co-author trailers or similar attribution.
- Review staged paths and diff, exclude secrets/build artifacts and verify the remote before pushing. Never force-push or overwrite remote history; reconcile new remote work safely first. Do not push using a different GitHub account when the requested account is unavailable.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
