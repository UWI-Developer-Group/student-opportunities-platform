# Contributing

## Before you start

- Read `structure.md` for architecture, access-control requirements, and
  product decisions that are still open.
- Keep changes focused in the relevant route, feature, model, or shared
  infrastructure folder.
- Validate untrusted input on the server. Public listing queries must
  require both a published opportunity and an active organization.

## Development workflow

1. Create a short-lived feature, fix, or chore branch from the current
   working branch.
2. Make the smallest complete change and add tests when a test runner is
   available for that behavior.
3. Run `npm run lint` and `npm run build`.
4. Open a pull request with a summary, validation results, and any
   environment/configuration changes.
5. Request at least one teammate review before merging where team size
   permits.

Do not commit `.env.local`, credentials, build output, or `node_modules`.
Never push directly to `main`.
