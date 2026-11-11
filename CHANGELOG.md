# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[Semantic Versioning](https://semver.org/).

## [Unreleased]

🧪 Tested against Linkwarden: v2.17.0

### ✨ Added

- TypeScript port of [linkwarden-go-sdk](https://github.com/CerealKiller97/linkwarden-go-sdk)
  v1.1.0, covering all 20 services: links, collections, tags, search, archives, migrations, RSS,
  highlights, tokens, dashboard, config, favicon, users, session, auth, logins, public, avatar,
  preserved and worker.
- `LinkwardenApiError` with `status`, `apiMessage`, `code` and `retryAfterSeconds`, plus the
  `isNotFound`, `isConflict` and `isTooManyRequests` helpers.
- Client options for a custom `fetch`, extra headers and a per-request timeout; every method
  takes an `AbortSignal`.
- E2E tests for every service against a real Linkwarden instance.
- Built and type-checked with TypeScript 7. Requires Node.js 22 or later.
- Requires TypeScript 5.0 or later for type checking: the published `.d.ts` files import
  each other with `.ts` paths.
- Release workflow: pushing a version tag runs the tests, publishes the package to npm with
  trusted publishing, and creates a GitHub release from the CHANGELOG.
