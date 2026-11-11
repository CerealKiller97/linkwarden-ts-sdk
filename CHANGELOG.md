# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Each release also names the Linkwarden version its tests passed against: the one pinned in
[`.linkwarden-version`](.linkwarden-version) when it was tagged. Other Linkwarden versions
may work, but they weren't tested.

<!--
How to write an entry:
- Add changes under [Unreleased] as you go. On release, rename it to
  "## [x.y.z] - YYYY-MM-DD", start a new empty [Unreleased], and update the links at the bottom.
- Keep the "🧪 Tested against Linkwarden: vX.Y.Z" line first in every section. The release
  workflow checks it against .linkwarden-version.
- Group changes under these headings, in this order, and leave out empty ones:
    ### ✨ Added       new features
    ### 🔄 Changed     changes to existing behaviour
    ### ⚠️ Deprecated  features that will be removed in a future release
    ### 🗑️ Removed     features removed in this release
    ### 🐛 Fixed       bug fixes
    ### 🔒 Security    vulnerability fixes
- Mark breaking changes with "💥 **Breaking:**" at the start of the entry.
- A pulled release gets " [YANKED]" after its date.

`pnpm lint` checks all of this (scripts/changelog.ts), and so does CI on every pull request.
-->

## [Unreleased]

🧪 Tested against Linkwarden: v2.17.0

🎉 First release: a TypeScript port of
[linkwarden-go-sdk](https://github.com/CerealKiller97/linkwarden-go-sdk) v1.1.0.

### ✨ Added

- `LinkwardenClient` with services for links, collections, tags, search, archives,
  migrations, RSS, highlights, tokens, dashboard, config, favicon, users, session, auth,
  logins, public collections, avatars, preserved files and the background worker.
- `LinkwardenApiError` with `status`, `apiMessage`, `code` and `retryAfterSeconds`, plus the
  `isNotFound`, `isConflict` and `isTooManyRequests` helpers.
- Client options for a custom `fetch`, extra headers and a per-request timeout. Every method
  takes an `AbortSignal`.
- Requires Node.js 22 or later, and TypeScript 5.0 or later for type checking: the published
  `.d.ts` files import each other with `.ts` paths.
- E2E tests for every service against a real Linkwarden instance.
- Release workflow: pushing a version tag runs the tests, publishes the package to npm with
  trusted publishing, and creates a GitHub release from this changelog.

[unreleased]: https://github.com/CerealKiller97/linkwarden-ts-sdk/commits/main
