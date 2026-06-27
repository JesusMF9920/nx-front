# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Stack

Next.js 16 (App Router) + React 19 + Tailwind CSS v4 + TypeScript, managed with pnpm.

## Commands

- `pnpm dev` — start the dev server (http://localhost:3000)
- `pnpm build` — production build
- `pnpm start` — serve the production build
- `pnpm lint` — run ESLint
- `pnpm test` — run Vitest once (`vitest run`)
- `pnpm test:watch` — Vitest in watch mode
- `pnpm exec vitest run path/to/file.test.ts` — a single file

Tests live in `lib/`, `components/`, and `app/` (`*.test.ts`/`*.test.tsx`). The default
environment is `node`; specs needing the DOM opt in per-file with
`// @vitest-environment happy-dom`. See `vitest.config.ts`.

## Conventions

- TypeScript path alias `@/*` resolves to the repo root.
- Tailwind v4 is wired through `@tailwindcss/postcss`; there is no `tailwind.config.*` — configure via CSS in `app/globals.css`.
- ESLint uses flat config (`eslint.config.mjs`); `eslint-config-next` is composed manually from its `core-web-vitals` and `typescript` presets.
- `pnpm-workspace.yaml` exists only to allow-list native build deps (`sharp`, `unrs-resolver`); this is not a multi-package workspace.

## Next.js 16 docs

Version-pinned docs for the installed Next.js live at `node_modules/next/dist/docs/` (`01-app/`, `02-pages/`, `03-architecture/`). Consult these before writing or modifying Next.js code — APIs may have changed from earlier major versions.
