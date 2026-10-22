# Authentication Architecture Decisions

> **Project:** Student Opportunities Platform  
> **Status:** Proposed — pending team approval  
> **Database:** MongoDB  
> **Framework:** Next.js App Router with TypeScript

## Purpose

This document records the proposed authentication and account-management decisions for the Student Opportunities Platform.

The existing repository structure and models are scaffolding, not binding requirements. They may be changed to support the agreed architecture.

The goal is to keep the MVP simple while supporting clubs, societies, volunteer groups, and businesses, including multiple people managing an organization and one person managing multiple organizations.

## Fit with the current project structure

The proposal fits the repository's modular Next.js App Router structure and does not require a separate server or a new top-level directory. The documented target structure reserves `src/lib/auth.ts`, `src/app/api/auth/`, and `src/features/auth/` for authentication integration and authorization behavior; these authentication paths have not been implemented yet.

There is one important model change: the current `src/models/User.ts` stores a single `organizationId` and a global role. That cannot represent the proposed many-to-many memberships or organization-specific roles. Implementing this proposal will require replacing that relationship with a membership model (or the selected auth library's equivalent), while keeping platform administrator permissions separate. The existing models are scaffolding, as stated above.

`src/lib/env.ts` already validates the database and application URL. Add any authentication and email-provider configuration there when those features are selected.

## Part A — Recommended Decisions

### 1. Authentication Library

**Recommendation:** Better Auth

Better Auth is the preferred candidate because it provides a TypeScript-oriented authentication framework with support for email/password authentication, sessions, password recovery, and organization-related functionality.

Before adoption, confirm that the selected version's MongoDB adapter, session behavior, and required features meet the application's needs.

**Compatibility checklist**

- Confirm compatibility with the installed Next.js and TypeScript versions.
- Confirm that the selected version supports the required MongoDB adapter.
- Confirm how authentication users and organization memberships map to application data.
- Confirm that the required features are available in the selected version.
- Test the integration before committing to the library.

### 2. Sign-in Method

**Recommendation:** Email/password for the initial release

Email/password authentication provides a straightforward way for organization representatives to create accounts without requiring an external identity provider. OAuth providers such as Google can be introduced later if user needs justify the additional configuration.

**Implementation checklist**

- Confirm email verification behavior.
- Confirm password recovery behavior.
- Decide whether OAuth is needed for the MVP.
- Confirm how duplicate accounts and account linking are handled.

### 3. Session Strategy

**Recommendation:** Database-backed sessions

Database-backed sessions allow the application to validate and revoke sessions on the server. This suits a Next.js application where organization-management operations must verify the current user's identity and permissions.

**Implementation checklist**

- Confirm session creation, persistence, and expiry behavior.
- Confirm session revocation capabilities.
- Verify secure cookie settings for production.
- Test logout and invalid-session behavior.

### 4. Password Recovery

**Recommendation:** One-time email reset links

Email reset links provide a familiar recovery experience without requiring administrators to reset passwords manually. The authentication library should handle token generation, expiration, and single-use enforcement through its supported recovery flow.

**Implementation checklist**

- Confirm token expiration and single-use enforcement.
- Select an email delivery provider.
- Confirm rate limiting and account-enumeration protections.
- Test successful, expired, and reused reset links.

### 5. Organization Membership

**Recommendation:** Many-to-many user–organization relationships

A separate membership relationship allows one person to manage multiple clubs, societies, volunteer groups, or businesses while allowing each organization to have several authorized members. This avoids tying a user's account to a single organization and supports changes in organizational leadership over time.

**Implementation checklist**

- Define the initial organization roles and permissions.
- Confirm whether Better Auth's organization functionality meets the requirements.
- Decide which system owns organization and membership records.
- Confirm membership uniqueness and relevant database indexes.
- Test users belonging to multiple organizations with different roles.

### 6. Organization Registration

**Recommendation:** Create a user account as part of organization registration

The initial sign-up journey should guide organization representatives through creating an account and submitting an organization for verification. The user account and organization remain separate entities connected by a membership record.

This keeps onboarding focused on the MVP, where authenticated users primarily manage organizational listings rather than student profiles.

**Implementation checklist**

- Define the registration and email-verification flow.
- Decide how incomplete registrations can be resumed.
- Decide how duplicate organization submissions are handled.
- Confirm that new organizations begin with pending status.
- Ensure public registration cannot grant administrator privileges.

### 7. Invitations and Ownership Recovery

**Recommendation:** Basic invitations and administrator-assisted ownership recovery

Existing organization managers should be able to invite additional members. If the original owner becomes unavailable and no other authorized manager remains, a platform administrator should be able to review the situation and reassign ownership.

**Implementation checklist**

- Define who can invite members.
- Decide how invitations expire and are accepted.
- Define the minimum permissions required to manage membership.
- Define the administrator-assisted ownership-transfer process.
- Record ownership transfers for accountability.

### 8. Authorization

**Recommendation:** Separate platform-level permissions from organization-specific roles

Platform administrators need permissions to verify organizations and moderate content, while organization members need permissions scoped to the organizations they manage. A person's role in one organization should not automatically grant the same role in another.

**Implementation checklist**

- Define the initial permission matrix.
- Implement server-side authorization checks.
- Test that members cannot modify another organization's listings.
- Test that pending or suspended organizations cannot publish publicly.
- Ensure administrator privileges can only be assigned through a trusted process.

### 9. Student Accounts

**Recommendation:** Defer student accounts until a later release

Public browsing and external application links do not require authentication. Deferring student accounts keeps the initial release focused on opportunity discovery and organization-managed listings while leaving room for future features such as saved opportunities, followed organizations, and notifications.

**Future consideration checklist**

- Reassess whether saved opportunities are needed.
- Reassess whether students should follow organizations.
- Determine whether notifications justify student accounts.
- Review the additional data and maintenance requirements before expanding scope.

### 10. Authentication and Database Integration

**Recommendation:** Keep authentication and application-domain data ownership explicit

Better Auth should manage authentication-related records according to its supported configuration, while the application maintains clear ownership of organization verification, opportunities, and related business rules. MongoDB can support these relationships through document references and a dedicated membership collection.

**Implementation checklist**

- Document the source of truth for authentication identities.
- Define the relationship between authentication users and application-domain records.
- Confirm the membership data model and indexes.
- Verify any transaction requirements against the selected MongoDB deployment.
- Test database persistence and authorization across organization boundaries.

### 11. Environment Configuration

**Recommendation:** Validate environment variables with Zod

The application should validate required environment variables when its configuration is first accessed, failing early with useful server-side errors when configuration is missing or invalid. Local development secrets belong in .env.local, while .env.example documents variable names and safe placeholders.

**Implementation checklist**

- Define the required environment variables.
- Add Zod validation in `src/lib/env.ts`.
- Synchronize `.env.example` with the validated configuration.
- Keep development and production credentials separate.
- Test behavior when required variables are missing or invalid.

### 12. Testing Strategy

**Recommendation:** Test authentication incrementally, from unit tests to database integration

Unit tests can cover validation and authorization rules without a live database. Integration tests should verify registration, sessions, membership persistence, and access control against an isolated MongoDB-compatible test setup.

**Completion checklist**

- Test registration, email verification, and sign-in.
- Test session persistence, expiry, and revocation.
- Test password recovery, including expired and reused tokens.
- Test multiple memberships and organization-specific roles.
- Test unauthorized cross-organization access.
- Run linting, TypeScript checks, automated tests, and a production build.

## Part B — Alternatives Considered

### 1. Authentication Library

#### Auth.js

Auth.js is a viable alternative, particularly for applications prioritizing OAuth and Next.js integration. Evaluate the desired credentials flow, supported database integration, and amount of application-owned authentication logic required.

#### Clerk or Auth0

Managed authentication services can reduce the amount of authentication infrastructure the project maintains. Trade-offs include provider dependency, pricing, and integration with the application's organization and membership models.

#### Passport.js

Passport.js is flexible but less attractive for this project because more of the surrounding authentication lifecycle would need to be assembled.

#### Custom Authentication

Custom authentication is not recommended because implementing password storage, sessions, reset tokens, and related security behavior independently adds avoidable risk.

### 2. Sign-in Method

#### OAuth-only

OAuth-only authentication could simplify sign-in for users with supported external identity providers, but introduces provider dependencies and may not suit every organization representative.

#### Email/password plus OAuth

This is a reasonable future enhancement if users request it. It adds account-linking and provider-configuration considerations.

#### Invitation-only accounts

Invitation-only accounts give administrators or organization owners more control over account creation but make onboarding new organizations unnecessarily restrictive.

### 3. Session Strategy

#### JWT-based sessions

JWT-based sessions can be useful when independent API consumers, mobile applications, or particular deployment requirements justify them. Trade-offs include revocation complexity and the need to handle session invalidation carefully.

#### Stateless cookie sessions

Stateless cookie sessions can reduce session-storage requirements but are less attractive if immediate server-side revocation is important.

### 4. Password Recovery

#### Administrator-assisted recovery

This requires administrators to intervene in routine account recovery and is not recommended.

#### Recovery codes

Recovery codes can be useful for specialized account-security scenarios but introduce additional user experience and recovery-management requirements.

#### No password recovery

This is not acceptable for a production email/password system.

### 5. User and Organization Relationship

#### One organization per user

This is too restrictive because a person may represent multiple clubs, societies, volunteer groups, or businesses.

#### Separate user accounts for each organization

This creates unnecessary account duplication and makes people managing multiple organizations harder to support.

#### Embedded membership arrays

MongoDB can store membership information inside user or organization documents. This may suit simple, bounded relationships, but a dedicated membership collection is easier to query and extend when invitations, roles, and membership lifecycle management become important.

### 6. Organization Registration

#### General-purpose account registration

This allows users to create accounts without an immediate organization. It may become appropriate if student accounts are introduced, but creates an account type without a clear initial product purpose for the current MVP.

#### Administrator-created organizations only

This offers more control but adds administrative overhead and prevents organizations from initiating their own registration.

#### Invitation-only organization registration

This can work for a closed pilot or trusted institutional rollout but is unnecessarily restrictive for an open discovery platform.

### 7. Invitations and Ownership Recovery

#### Single-owner organizations

These are simpler initially but create an access-continuity problem if the owner leaves.

#### Multiple managers without invitations

This could work if membership is assigned manually by administrators, but scales poorly and adds avoidable administrative work.

#### Full organization administration system

A full system could include granular roles, invitation expiration management, ownership disputes, audit workflows, and detailed approval rules. Defer this level of complexity until the platform needs it.

### 8. Authorization

#### One global role per user

This is simple but insufficient when someone administers one organization and is an ordinary member of another.

#### Organization roles only

This is insufficient for platform-wide administration because verifying organizations and moderating content are distinct from managing an individual organization.

#### Client-side-only authorization

This is not secure because hiding buttons or pages does not protect server-side operations.

### 9. Student Accounts

#### Student accounts in the initial release

These could support saved opportunities, followed organizations, and personalized features immediately, but expand the scope of account management and testing.

#### Public browsing only

This is recommended for the initial release because it preserves the platform's core discovery value with less implementation work.

### 10. Authentication and Database Integration

#### Store all application data in Better Auth's organization model

This could reduce duplication if the provider's organization model fully supports the domain requirements. However, the platform must still handle its verification workflow, opportunity ownership, and business rules.

#### Duplicate authentication and domain user records

This can be justified by a clear integration boundary, but creates synchronization and identity-consistency risks if both records are treated as authoritative.

#### Move to a relational database

A relational database would support these relationships, but changing databases is unnecessary merely because the application has many-to-many relationships. MongoDB is capable of supporting the proposed model.

### 11. Environment Configuration

#### Commit real development credentials

This exposes secrets through version control and is not recommended.

#### Use production credentials locally

This increases the risk of accidental production changes and data exposure.

#### Hardcode environment values in application code

This makes configuration harder to change safely and encourages accidental secret exposure.

### 12. Testing Strategy

#### Mock every database interaction

Mocks are useful for unit tests but insufficient to establish that the real authentication adapter and database integration work correctly.

#### Test directly against production

This risks corrupting real user or organization data and must be avoided.

#### Require a cloud database for every test

This is unnecessary for most automated tests. Use an isolated in-memory database or dedicated test database, then perform explicit integration tests against the supported MongoDB configuration.

## Part C — Decisions Awaiting Approval

| Decision                                | Current proposal                                   |
| --------------------------------------- | -------------------------------------------------- |
| Authentication library                  | Better Auth                                        |
| Sign-in method                          | Email/password first                               |
| Session strategy                        | Database-backed sessions                           |
| Password recovery                       | One-time email reset links                         |
| Membership architecture                 | Many-to-many                                       |
| Organization registration               | User account followed by organization registration |
| Invitation workflow                     | Basic invitations                                  |
| Ownership recovery                      | Administrator-assisted reassignment                |
| Student accounts                        | Deferred                                           |
| Email delivery provider                 | Open                                               |
| OAuth providers                         | Deferred                                           |
| Authentication/domain model integration | Pending compatibility review                       |

> **Approval rule:** All recommendations remain proposals until explicitly accepted by the team. Update this document alongside implementation and tests when a decision changes.
