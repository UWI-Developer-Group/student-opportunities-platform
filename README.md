# Student Opportunities Platform

A public-first platform for discovering internships, scholarships,
competitions, jobs, events, and other student-focused opportunities.
Visitors can browse without accounts; organizations will manage listings
after an authentication approach is selected.

## Technology

- Next.js App Router, React, and TypeScript
- Tailwind CSS v4
- MongoDB with Mongoose
- Zod for validation

## Getting started

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and configure `MONGODB_URI`,
   `APP_URL`, and a `BETTER_AUTH_SECRET` with at least 32 characters.
3. Start the development server with `npm run dev`.
4. Open [http://localhost:3000](http://localhost:3000).

The public routes and initial opportunity data modules are scaffolded.
The routes are not yet connected to the database; adding seed data and
completing the public discovery flow are the next implementation steps.

## Manually create an organization and opportunity

1. Start the app with `npm run dev`.
2. In another terminal, run `npm run organization:create` and enter the
   organization and first member's details. This creates a Better Auth login
   and a pending organization. An email that already has an account cannot be
   reused.
3. Run `npm run opportunity:create`, sign in with the new member account, and
   enter the opportunity details.

The CLIs send requests to app API routes, so account creation, validation,
organization membership, and opportunity authorization run on the server.
Opportunities created by pending organizations are published but remain hidden
until the organization is active.

## Project structure

- `src/app/`: route entry points, layouts, and route-level states.
- `src/components/`: shared UI and layout components.
- `src/features/`: feature-specific schemas, queries, services, and UI.
- `src/lib/`: shared infrastructure such as environment validation and
  database connection management.
- `src/models/`: Mongoose model definitions.
- `structure.md`: architecture contract, milestones, and outstanding
  product decisions.

## Available scripts

- `npm run dev`: run the local development server.
- `npm run lint`: run ESLint.
- `npm run build`: create a production build.

Testing, authentication, opportunity categories/types, and deployment
choices are intentionally not locked in yet; see `structure.md`.
