# Student Opportunities Platform --- Repository Structure

> **Purpose:** This document is the shared implementation plan for the
> repository. It explains what belongs in each folder, which
> responsibilities each module owns, and the conventions contributors
> should follow.
>
> **Project direction:** A public-first student opportunities discovery
> platform built as a modular Next.js application. Students can browse
> without creating accounts and follow links to apply on external
> websites. Organizations need accounts to manage listings. Admins
> verify organizations and can moderate problematic content, but do
> **not** approve every listing before publication.

------------------------------------------------------------------------

## 1. Agreed technology and architecture

-   **Framework:** Next.js App Router with TypeScript.
-   **UI:** React and Tailwind CSS v4.
-   **Database:** MongoDB with Mongoose.
-   **Validation:** Zod schemas at trust boundaries (forms, Server
    Actions, and other incoming data).
-   **Application shape:** One Next.js application and one MongoDB
    database, organized as a modular monolith. Do not add a separate
    Express server unless a concrete requirement emerges.
-   **Rendering:** Prefer Server Components for public pages and data
    reads. Use Client Components only where browser interaction is
    needed.
-   **Mutations:** Use Server Actions for app-internal form submissions
    and mutations. Add Route Handlers only for endpoints that genuinely
    need an HTTP/API interface, such as an auth provider callback or a
    future external consumer.
-   **Authentication:** Use a maintained auth library. Final provider
    setup and exact callback route depend on the library/version
    selected; do not assume a legacy NextAuth v4 API.
-   **Public access:** Students and other visitors do not need accounts
    to browse or click through to an opportunity.
-   **Application flow:** Opportunities link to external application
    forms or organization websites. The platform does not process
    applications itself in the MVP.
-   **Image storage:** Store image URLs and related metadata in MongoDB;
    store image files with an image-storage provider (for example,
    Cloudinary or object storage), not as large binary files in MongoDB.
-   **Testing:** Each feature owner writes tests for their own behavior.
    Add shared integration/end-to-end tests for critical user journeys
    as the project matures.

### Important access rule

A listing is publicly visible only when **the opportunity is published
and its organization is active**. Enforce this in server-side
queries/services, not only in the UI.

------------------------------------------------------------------------

## 2. Full proposed repository tree

This is the target structure, not a requirement to create every file on
day one. Add files as the related feature is implemented. Keep the root
route (`/`) in `src/app/page.tsx`; route groups do not change URLs.

``` text
student-opportunities-platform/
├── public/
│   └── images/
│       ├── logo-placeholder.svg
│       └── opportunity-placeholder.svg
│
├── scripts/
│   ├── seed.ts
│   └── create-admin.ts
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── globals.css
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── not-found.tsx
│   │   ├── sitemap.ts
│   │   ├── robots.ts
│   │   │
│   │   ├── (public)/
│   │   │   ├── layout.tsx
│   │   │   ├── opportunities/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── loading.tsx
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── loading.tsx
│   │   │   │       ├── not-found.tsx
│   │   │   │       └── opengraph-image.tsx
│   │   │   ├── organizations/
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx
│   │   │   │       └── not-found.tsx
│   │   │   └── categories/
│   │   │       └── [category]/
│   │   │           └── page.tsx
│   │   │
│   │   ├── (auth)/
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── register/
│   │   │       └── page.tsx
│   │   │
│   │   ├── (org)/
│   │   │   ├── layout.tsx
│   │   │   └── dashboard/
│   │   │       ├── page.tsx
│   │   │       └── opportunities/
│   │   │           ├── page.tsx
│   │   │           ├── new/
│   │   │           │   └── page.tsx
│   │   │           └── [id]/
│   │   │               └── edit/
│   │   │                   └── page.tsx
│   │   │
│   │   ├── (admin)/
│   │   │   ├── layout.tsx
│   │   │   └── admin/
│   │   │       ├── page.tsx
│   │   │       ├── organizations/
│   │   │       │   └── page.tsx
│   │   │       └── opportunities/
│   │   │           └── page.tsx
│   │   │
│   │   └── api/
│   │       └── auth/
│   │           └── [...auth]/
│   │               └── route.ts
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   └── README.md
│   │   └── layout/
│   │       ├── PublicNavbar.tsx
│   │       ├── PublicFooter.tsx
│   │       ├── DashboardSidebar.tsx
│   │       └── UserMenu.tsx
│   │
│   ├── features/
│   │   ├── opportunities/
│   │   │   ├── components/
│   │   │   │   ├── OpportunityCard.tsx
│   │   │   │   ├── OpportunityGrid.tsx
│   │   │   │   ├── OpportunityFilters.tsx
│   │   │   │   ├── OpportunityForm.tsx
│   │   │   │   └── ApplyButton.tsx
│   │   │   ├── actions.ts
│   │   │   ├── queries.ts
│   │   │   ├── schemas.ts
│   │   │   ├── service.ts
│   │   │   └── service.test.ts
│   │   │
│   │   ├── organizations/
│   │   │   ├── components/
│   │   │   │   ├── OrganizationCard.tsx
│   │   │   │   └── OrganizationProfileForm.tsx
│   │   │   ├── actions.ts
│   │   │   ├── schemas.ts
│   │   │   ├── service.ts
│   │   │   └── service.test.ts
│   │   │
│   │   └── auth/
│   │       ├── components/
│   │       │   ├── LoginForm.tsx
│   │       │   └── RegisterForm.tsx
│   │       ├── actions.ts
│   │       ├── permissions.ts
│   │       └── schemas.ts
│   │
│   ├── models/
│   │   ├── User.ts
│   │   ├── Organization.ts
│   │   └── Opportunity.ts
│   │
│   └── lib/
│       ├── db.ts
│       ├── auth.ts
│       ├── env.ts
│       └── utils.ts
│
├── tests/
│   ├── integration/
│   └── e2e/
│
├── .env.example
├── .gitignore
├── .nvmrc
├── CONTRIBUTING.md
├── README.md
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── package-lock.json
├── postcss.config.mjs
├── tsconfig.json
└── structure.md
```

### Tree notes

1.  `src/app/` contains route entry points, layouts, route-level
    loading/error states, metadata, and page composition. Keep
    substantial business logic out of page files.
2.  `(public)`, `(auth)`, `(org)`, and `(admin)` are **route groups**.
    Their names do not appear in URLs. For example,
    `(public)/opportunities/page.tsx` maps to `/opportunities`.
3.  The root homepage is `src/app/page.tsx`, which maps to `/`. Do not
    create another page that also maps to `/` inside a route group.
4.  `src/features/` groups code by business domain. Feature components,
    schemas, actions, queries, services, and tests live together.
5.  `src/models/` contains Mongoose models. Keep model definitions and
    database schema concerns separate from UI components.
6.  `src/lib/` contains shared infrastructure and utilities used across
    features.
7.  `src/components/ui/` is for reusable UI primitives (for example,
    components generated or maintained with shadcn/ui).
    `src/components/layout/` is for shared navigation and layout
    components.
8.  `scripts/` contains local/operational scripts, not request handlers.
    Never commit real credentials or production secrets.
9.  `tests/` is for cross-feature integration and end-to-end tests.
    Feature-specific unit tests can remain next to their feature code.
10. The auth route shown is a **placeholder**. The actual route name and
    handler shape must match the chosen authentication library and
    version.
11. Do not add a `reports` feature until reporting is approved as part
    of the MVP. If it is added later, give it its own
    `features/reports/` folder and corresponding admin workflow.
12. Next.js has changed its request-interception convention across
    versions. Confirm the convention for the installed version before
    adding `middleware.ts` or `proxy.ts`; neither should replace
    server-side authorization checks.

------------------------------------------------------------------------

## 3. What belongs in each area

### `src/app/` --- routes and page composition

Route files should load the data needed by a page, call the relevant
feature query/service, and compose the UI.

-   `layout.tsx`: global HTML shell, fonts, and global providers only
    when needed.
-   `page.tsx`: public homepage with a clear route into discovery and
    selected recent opportunities.
-   `globals.css`: Tailwind import, design tokens, and global styles.
-   `loading.tsx`: loading UI for the route segment.
-   `error.tsx`: route-level error boundary UI. It must be a Client
    Component when required by Next.js.
-   `not-found.tsx`: user-friendly not-found experience.
-   `sitemap.ts` and `robots.ts`: search-engine metadata.
-   Opportunity detail page: fetch a published opportunity and active
    organization; generate page metadata; show deadline and external
    application link.
-   Organization profile page: show public details and that
    organization's published opportunities.
-   Category page: show published opportunities for a category.
-   Auth pages: sign-in and organization registration experiences.
-   Organization dashboard: organization-only listing management.
-   Admin pages: admin-only organization verification and opportunity
    moderation tools.

**Do not** put database connection setup, password hashing, permission
rules, or complicated write logic directly in page components.

### `src/features/opportunities/`

Owns opportunity discovery and listing management.

-   `components/OpportunityCard.tsx`: compact listing summary used in
    grids and homepage sections.
-   `components/OpportunityGrid.tsx`: responsive list/grid presentation,
    empty state, and pagination or load-more UI.
-   `components/OpportunityFilters.tsx`: search, category, type, and
    other agreed discovery controls.
-   `components/OpportunityForm.tsx`: create/edit fields with
    client-side UX validation; server-side validation remains mandatory.
-   `components/ApplyButton.tsx`: clearly labeled external application
    link.
-   `schemas.ts`: Zod schemas for create/update and query/filter inputs.
-   `queries.ts`: read-oriented discovery functions (search, filters,
    pagination, public visibility constraints).
-   `service.ts`: business rules and database operations for creating,
    updating, publishing, archiving, and retrieving opportunities.
-   `actions.ts`: Server Actions used by forms. Authenticate the caller,
    validate input, call the service, and revalidate affected paths.
-   `service.test.ts`: tests for opportunity business rules.

Avoid duplicating logic between `actions.ts` and `service.ts`. Actions
are the request boundary; services own reusable business rules.

### `src/features/organizations/`

Owns organization profile and verification workflows.

-   `OrganizationCard.tsx`: organization preview used in discovery or
    related-opportunity views.
-   `OrganizationProfileForm.tsx`: organization details and logo
    URL/upload flow.
-   `schemas.ts`: organization registration and profile-update
    validation.
-   `service.ts`: organization creation, profile changes, status
    transitions, and lookups.
-   `actions.ts`: authenticated actions for organization members and
    admin verification actions where appropriate. If admin actions grow
    substantially, move them into a dedicated admin feature later.
-   `service.test.ts`: tests for organization status and ownership
    rules.

An organization starts as `pending`. An admin verifies it and changes it
to `active` or rejects it. Only active organizations can publish
publicly visible listings.

### `src/features/auth/`

Owns authentication-related form behavior and authorization helpers.

-   `LoginForm.tsx` and `RegisterForm.tsx`: auth form UI.
-   `schemas.ts`: validate incoming sign-in/registration data.
-   `actions.ts`: only use if the selected auth library requires or
    benefits from app-owned Server Actions. Follow that library's
    recommended flow.
-   `permissions.ts`: reusable checks such as requiring an authenticated
    user, an organization member, or an admin.

Authentication proves who the user is; authorization determines what
that user is allowed to do. Both must be considered.

### `src/models/`

Mongoose model definitions and database-level schema rules. Models
should define field types, defaults, enums, validation where
appropriate, timestamps, and indexes. Use a model-reuse pattern that
avoids model recompilation issues during Next.js development.

#### `User.ts` --- proposed fields

-   `name`
-   `email` (normalized and unique)
-   `passwordHash` only if credentials-based authentication is selected;
    otherwise use the auth provider's identity fields
-   `role`: `org_member` or `admin` for the MVP
-   `organizationId` for organization members; absent for admins
-   timestamps (`createdAt`, `updatedAt`)

Do not let public registration choose the `admin` role. Admin
provisioning must be a trusted operational process.

#### `Organization.ts` --- proposed fields

-   `name`
-   `slug` (unique)
-   `description`
-   `logoUrl`
-   `websiteUrl`
-   `contactEmail`
-   `status`: `pending`, `active`, `rejected`, `suspended`
-   `verifiedAt` and optionally `verifiedBy`
-   timestamps

If an organization needs multiple members later, keep membership
explicit rather than assuming one user forever owns it.

#### `Opportunity.ts` --- proposed fields

-   `title`
-   `slug` (unique)
-   `summary` and/or `description`
-   `imageUrl` (optional)
-   `organizationId`
-   `category`
-   `type` (use a documented enum agreed by the team)
-   `location` (optional; define whether it is in-person, remote,
    hybrid, or a place)
-   `applicationUrl`
-   `additionalLinks` (optional list of labeled URLs)
-   `deadline` (optional)
-   `status`: `draft`, `published`, `archived`
-   `publishedAt` (set when published; do not substitute `createdAt`)
-   timestamps

The final fields and enum values should be agreed in a shared data
contract before parallel implementation begins.

### `src/lib/`

-   `db.ts`: connect to MongoDB and safely reuse the connection in
    development. Do not open a new connection for every query.
-   `auth.ts`: server-side auth configuration and helpers, aligned with
    the selected library.
-   `env.ts`: validate required environment variables with Zod and fail
    early with a useful server-side error.
-   `utils.ts`: small, genuinely shared helpers (for example, class-name
    merging or date formatting). Do not turn this into a miscellaneous
    dumping ground.

### `src/components/`

-   `ui/`: reusable primitives such as buttons, inputs, dialogs, badges,
    and dropdowns. Components here should not contain platform-specific
    business rules.
-   `layout/`: shared navigation, footer, dashboard sidebar, and user
    menu.
-   Feature-specific components belong in their
    `features/<feature>/components/` directory.

### `scripts/`

-   `seed.ts`: insert predictable development/demo organizations and
    opportunities. Make the script safe to rerun or document how to
    reset its data.
-   `create-admin.ts`: create or promote an admin through a deliberate
    trusted command. Read secrets from environment variables or a secure
    prompt; never hardcode passwords.
-   Scripts must load the same environment configuration as the app and
    use the shared database connection/model definitions where
    practical.

### `tests/`

-   `integration/`: test important interactions between services,
    database models, and permissions.
-   `e2e/`: test real user journeys in a browser if an E2E framework is
    adopted.
-   Unit tests for isolated feature logic can live beside the
    implementation, such as `features/opportunities/service.test.ts`.

------------------------------------------------------------------------

## 4. Core user journeys

The team should build and test these end-to-end paths.

### Public visitor

1.  Opens the homepage without an account.
2.  Browses published opportunities.
3.  Searches by keyword and filters by category.
4.  Opens an opportunity detail page.
5.  Follows the external application link.

### Organization member

1.  Registers an organization account.
2.  Organization is created with `pending` status.
3.  Waits for admin verification.
4.  Once active, creates a listing as a draft or publishes it.
5.  Edits or archives listings belonging to their own organization.
6.  Cannot edit listings owned by another organization or change their
    own role/status.

### Admin

1.  Signs in through the protected admin experience.
2.  Reviews pending organization registrations.
3.  Activates or rejects an organization.
4.  Can suspend an organization or hide/archive a problematic
    opportunity when necessary.
5.  Cannot accidentally expose drafts or listings from inactive
    organizations.

**Publication policy:** Admin verification applies to organizations, not
every opportunity. An authorized member of an active organization may
publish directly. Admin moderation is reactive and does not block every
listing by default.

------------------------------------------------------------------------

## 5. Access-control matrix

  ---------------------------------------------------------------------------------------
  Action                  Public visitor    Organization      Admin
                                            member            
  ----------------------- ----------------- ----------------- ---------------------------
  Browse published        Yes               Yes               Yes
  opportunities                                               

  View public             Yes               Yes               Yes
  organization profiles                                       

  Follow external         Yes               Yes               Yes
  application links                                           

  Create/edit own         No                Yes, within       As needed for
  organization profile                      assigned          administration
                                            organization      

  Publish an opportunity  No                Yes, if           Yes, for
                                            organization is   moderation/administration
                                            active and owns   
                                            it                

  Edit another            No                No                Yes, if moderation tools
  organization's                                              permit
  opportunity                                                 

  Verify/reject/suspend   No                No                Yes
  organizations                                               

  Promote a user to admin No                No                Trusted operational process
                                                              only
  ---------------------------------------------------------------------------------------

Every protected Server Action and service operation must check
authorization server-side. Hiding a button is not access control. Never
trust a client-submitted `organizationId`, `role`, or status without
verifying that the caller is allowed to use it.

------------------------------------------------------------------------

## 6. Shared conventions for contributors

### File and code conventions

-   Use TypeScript; avoid `any` unless there is a documented reason.
-   Use PascalCase for React component filenames and names (for example,
    `OpportunityCard.tsx`).
-   Use lower-case descriptive names for utility modules (for example,
    `queries.ts`, `service.ts`).
-   Prefer named exports for components and helpers unless a framework
    convention requires a default export.
-   Keep route files small; put reusable business logic in feature
    modules.
-   Derive types from Zod schemas or model definitions where practical
    instead of maintaining duplicate interfaces.
-   Use Server Components by default. Add `"use client"` only when a
    component needs client-side state, event handlers, effects, or
    browser APIs.
-   Do not import server-only database/auth modules into Client
    Components.
-   Keep feature boundaries clear. Avoid circular imports between
    features.

### Validation and security

-   Validate all external input on the server, even if the form also
    validates in the browser.
-   Normalize email addresses and validate URLs before saving.
-   Permit only expected URL protocols (normally `https:` and, where
    justified, `http:`) for external links. Do not allow `javascript:`
    URLs.
-   Use a maintained password/auth solution; never implement custom
    password storage casually.
-   Keep secrets in local environment variables or the deployment secret
    manager. Never commit `.env.local`.
-   Do not expose database connection strings, password hashes, internal
    moderation notes, or private contact details in public responses.
-   Apply public visibility constraints in database queries/services,
    not just in the page.
-   Use safe error messages for users and server-side logs for
    diagnostic details.
-   If using image uploads, validate file type and size and use
    signed/restricted upload flows from the chosen provider.

### Database and data rules

-   Use Mongoose models and a shared database connection helper.
-   Add indexes for real query patterns, such as unique slugs/emails and
    opportunity status, publication date, category, and organization
    reference.
-   Add indexes deliberately; confirm they support actual filters and
    sorting.
-   Use `publishedAt` for publication ordering and `deadline` only when
    a deadline exists.
-   Treat deadlines as dates consistently (document the timezone/display
    rule).
-   Public discovery must exclude drafts, archived items, and
    opportunities belonging to inactive organizations.
-   Use pagination for listing pages rather than returning an unbounded
    number of records.

### Git and pull requests

-   `main` should stay in a working, reviewable state.
-   Create short-lived feature branches, for example
    `feat/opportunity-filters`, `fix/org-ownership-check`, or
    `docs/contributing`.
-   Open a pull request for changes; request at least one teammate
    review where team size permits.
-   Before merging, run lint, tests, and a production build when
    feasible.
-   Commit `package-lock.json` and keep dependency changes intentional.
-   Do not commit build output, `node_modules`, real secrets, or local
    environment files.
-   Keep pull requests focused and explain what changed, how it was
    tested, and whether environment/configuration changes are needed.

------------------------------------------------------------------------

## 7. Environment variables

Commit `.env.example` with variable **names and safe placeholders
only**. Do not commit real values.

The exact auth variables depend on the selected provider/library, but
the application will likely need equivalents of:

``` dotenv
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/student_opportunities
APP_URL=http://localhost:3000

# Add only the variables required by the chosen auth library/provider.
# Example names below are placeholders, not a finalized auth configuration:
AUTH_SECRET=
AUTH_URL=http://localhost:3000

# Add provider-specific credentials only if that provider is selected.
# Add image-storage credentials only after the provider is selected.
```

Keep `.env.example` synchronized with the actual variables read by
`src/lib/env.ts`. Do not copy production secrets into issues, pull
requests, screenshots, or chat.

------------------------------------------------------------------------

## 8. MVP scope

### Included in the first release

-   Public homepage and opportunity discovery page.
-   Opportunity detail pages with organization information and external
    application links.
-   Keyword search and basic category filtering.
-   Public organization profiles.
-   Organization registration and sign-in.
-   Admin verification of organizations.
-   Organization dashboard to create, edit, publish, and archive its own
    opportunities.
-   Admin ability to suspend organizations and moderate problematic
    opportunities.
-   Responsive layout, loading/empty/error states, seed data, basic
    tests, README, and deployment configuration.
-   Basic page metadata and sitemap.

### Explicitly not required for the first release

-   Student accounts or student profiles.
-   In-platform applications or application tracking.
-   Student bookmarks, saved searches, or personalized recommendations.
-   Email notifications.
-   Approval of every opportunity before publication.
-   A reports/reporting workflow (unless the team explicitly adds it to
    the MVP).
-   Click analytics/redirect tracking.
-   Separate backend service or microservices.
-   Complex permissions beyond public visitor, organization member, and
    admin.

These items can be reconsidered after the core workflow is reliable.

------------------------------------------------------------------------

## 9. Suggested implementation milestones

### Milestone 1 --- Foundation

-   Confirm the data contract and opportunity categories/types.
-   Set up repo, linting, formatting, environment validation, and
    contribution instructions.
-   Implement MongoDB connection and Mongoose models.
-   Add seed script and sample data.
-   Agree on auth library and configure its server-side session helpers.

### Milestone 2 --- Public discovery

-   Build shared public layout, homepage, opportunity card/grid, listing
    page, and detail page.
-   Implement published/active visibility rules in server-side queries.
-   Add keyword search, category filters, pagination, and empty/loading
    states.
-   Confirm external links are validated and clearly labeled.

### Milestone 3 --- Organization workflow

-   Implement registration and pending organization creation.
-   Build organization dashboard and profile management.
-   Add create/edit/draft/publish/archive opportunity actions.
-   Enforce ownership and active-organization rules in server-side code.

### Milestone 4 --- Admin workflow

-   Build admin-only organization verification screen.
-   Add activate/reject/suspend actions with authorization checks.
-   Add opportunity moderation controls for problematic listings.
-   Create the initial admin safely through an operational script.

### Milestone 5 --- Hardening and release

-   Add integration and end-to-end tests for the core journey.
-   Test mobile layouts, accessibility, validation, and failure states.
-   Check SEO metadata, sitemap, and robots configuration.
-   Review secrets, authorization boundaries, indexes, logging, and
    deployment environment.
-   Document local setup, seed data, testing, and deployment.

------------------------------------------------------------------------

## 10. Definition of done for a feature

Before marking a feature complete, confirm:

-   [ ] It matches the agreed behavior and data contract.
-   [ ] Inputs are validated on the server.
-   [ ] Authentication and ownership/role checks are enforced where
    needed.
-   [ ] Loading, empty, error, and success states are handled.
-   [ ] The layout works on mobile and desktop.
-   [ ] Relevant tests are added or updated.
-   [ ] Lint and TypeScript checks pass.
-   [ ] The production build passes, where practical.
-   [ ] Any new environment variables are documented in `.env.example`.
-   [ ] README or relevant docs are updated.

------------------------------------------------------------------------

## 11. Decisions still to confirm

The structure is a starting contract; these decisions should be made by
the team before implementing dependent features:

1.  Which authentication library/provider will be used?
2.  Can one organization have multiple member accounts in the first
    release?
3.  Which opportunity categories and types are allowed?
4.  Will opportunity images be optional URLs initially, or will uploads
    be supported in the MVP?
5.  Which test runner and E2E framework will be used?
6.  Which deployment host and MongoDB provider will be used?
7.  What is the exact rule for expired deadlines: remain visible with an
    "expired" label, or be hidden automatically?
8.  What evidence or checks are required for an organization to become
    verified?

When a decision changes this structure, update this document in the same
pull request as the implementation.

------------------------------------------------------------------------

## 12. First files to implement

Do not create every file in the tree as an empty placeholder. Start with
the files needed for the first vertical slice:

1.  `src/lib/env.ts`
2.  `src/lib/db.ts`
3.  `src/models/Organization.ts`
4.  `src/models/Opportunity.ts`
5.  `src/models/User.ts` (once the auth approach is agreed)
6.  `src/features/opportunities/schemas.ts`
7.  `src/features/opportunities/queries.ts`
8.  `src/features/opportunities/service.ts`
9.  `src/app/page.tsx`
10. `src/app/(public)/opportunities/page.tsx`
11. `src/app/(public)/opportunities/[slug]/page.tsx`
12. `scripts/seed.ts`
13. `.env.example`
14. `README.md` and `CONTRIBUTING.md`

**First end-to-end goal:** seed an active organization and a published
opportunity, display the opportunity publicly, open its detail page, and
follow its external application link. Then implement organization
registration/verification and the protected listing-management flow.

------------------------------------------------------------------------

*This document describes the intended structure and rules. It does not
mean every listed file or dependency already exists. Keep it updated as
the team makes decisions and the codebase evolves.*
