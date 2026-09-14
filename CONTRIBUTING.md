# Contributing to QNAHUT

Thanks for taking the time to contribute. This document covers how to get set
up, the project's conventions, and how to submit changes.

## Getting set up

```bash
git clone https://github.com/your-org/qnahut.git
cd qnahut
npm install
npm run dev
```

The dev server prints a local address (open it in your browser) on startup.

## Project structure

```
src/
├── components/     # UI, grouped by area (landing, wizard, host, projector, join, team, common)
├── context/        # React context providers (theme, quiz state)
├── state/          # The quiz reducer and action creators
├── data/           # Default theme tokens and the bundled demo quiz
├── hooks/          # Shared hooks (timer ticking, keyboard shortcuts)
├── utils/          # Small pure helper functions
└── styles/         # Global stylesheet and theme variables
```

## Before you open a pull request

1. Run `npm run lint` and `npm run format:check` — fix anything they flag.
2. Run `npm run build` to confirm the production build succeeds.
3. Keep pull requests focused on one change; large unrelated diffs are harder
   to review and more likely to be asked to split up.
4. Describe **what** changed and **why** in the PR description. Screenshots
   or a short clip are appreciated for UI changes.

## Commit messages

Use short, imperative commit subjects (`Add buzzer reset shortcut`, not
`Added` or `Adding`). Reference an issue number when relevant (`Fixes #12`).

## Reporting bugs / requesting features

Please use the issue templates under `.github/ISSUE_TEMPLATE`. Include
reproduction steps for bugs, and the problem you're solving for feature
requests (not just the solution).

## Code style

- Function components with hooks only — no class components.
- Keep components focused; if a file is doing more than one job, split it.
- Co-locate a component's small helper functions in the same file; move
  anything reused across components into `src/utils`.
- Prefer plain CSS custom properties (see `src/styles`) over inline magic
  numbers, so imported themes keep working.

By contributing, you agree your contributions will be licensed under the
project's [MIT License](./LICENSE).
