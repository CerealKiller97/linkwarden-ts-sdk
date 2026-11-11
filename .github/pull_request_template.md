## What changed

<!-- What this PR does, in a sentence or two. -->

## Why

<!-- The problem it solves or the reason for the change. Link the issue it closes, e.g. "Closes #12". -->

## Type of change

- [ ] 🐛 Bug fix
- [ ] ✨ New feature or endpoint
- [ ] 💥 Breaking change (changes a public type, method signature or the supported Node / TypeScript / Linkwarden versions)
- [ ] ♻️ Refactor, tooling or CI
- [ ] 📝 Documentation

## Checklist

- [ ] `pnpm typecheck`, `pnpm lint` and `pnpm build` pass
- [ ] `pnpm test` passes against a Linkwarden instance (`scripts/dev-linkwarden.sh up`)
- [ ] New or changed endpoints have E2E tests in `test/e2e/`
- [ ] Object shapes use `type`, never `interface`, and class members say `public` or `private`
- [ ] `README.md` and the `[Unreleased]` section of `CHANGELOG.md` are updated, if users will notice the change

## Notes for reviewers

<!-- Anything a reviewer should know: trade-offs, follow-ups, or how you tested it. Delete if there's nothing. -->
