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
2. Copy `.env.example` to `.env.local` and configure `MONGODB_URI` and
   `APP_URL`.
3. Start the development server with `npm run dev`.
4. Open [http://localhost:3000](http://localhost:3000).

The public routes and initial opportunity data modules are scaffolded.
The routes are not yet connected to the database; adding seed data and
completing the public discovery flow are the next implementation steps.

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
