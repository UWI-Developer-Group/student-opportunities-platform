<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
# Student Opportunities Platform

## Project Overview

A discovery platform where students can discover opportunities
such as internships, scholarships, competitions, jobs, events,
and other student-focused opportunities.

Organizations can create and manage opportunity listings.

Students do not have accounts in the initial version.

## Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- MongoDB
- Mongoose
- Zod
- Node.js

## Architecture

### `src/app`

Next.js routes and pages.

### `src/components`

Reusable React components.

### `src/lib`

Shared utilities and infrastructure.

### `src/models`

MongoDB/Mongoose models.

### `src/services`

Business logic and database operations.

### `src/types`

Shared TypeScript types.

### `src/hooks`

Reusable React hooks.

## Development Rules

- Use TypeScript.
- Use Tailwind CSS for styling.
- Use the existing project structure.
- Do not create new top-level directories without discussing it with the team.
- Do not put database logic directly inside UI components.
- Keep reusable components in `src/components`.
- Keep business logic in `src/services`.
- Never commit secrets or `.env.local`.
- Use the configured import alias `@/*`.

## Git Workflow

Do not push directly to `main`.

Create a branch for each issue:

feature/<name>
fix/<name>
chore/<name>

All changes must go through a Pull Request.

At least one team member must review a Pull Request before merging.

Run linting and tests before opening a Pull Request.
