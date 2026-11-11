# linkwarden-ts-sdk

A typed TypeScript client for the [Linkwarden](https://linkwarden.app) API. It covers links,
collections, tags, search, archives, migrations, RSS, highlights, tokens and more, and has no
runtime dependencies: it uses the platform's `fetch`.

It's a port of [linkwarden-go-sdk](https://github.com/CerealKiller97/linkwarden-go-sdk), with the
same services and behaviour.

## Install

Requires **Node.js 22+** (or any runtime with `fetch`, `FormData`, `Blob` and
`AbortSignal.any`), and TypeScript 5.0+ for its types. The package is ESM-only. Each release is
tested against a specific Linkwarden version, listed in [CHANGELOG.md](CHANGELOG.md).

```bash
pnpm add linkwarden-ts-sdk
```

## Usage

```ts
import { LinkwardenClient } from "linkwarden-ts-sdk";

const client = new LinkwardenClient({
  baseUrl: "https://cloud.linkwarden.app",
  token: process.env.LINKWARDEN_TOKEN,
  timeoutMs: 15_000,
});

// Create a collection…
const collection = await client.collections.create({
  name: "Reading List",
  color: "#f59e0b",
});

// …and save a tagged link into it.
const link = await client.links.create({
  name: "Effective TypeScript",
  url: "https://effectivetypescript.com",
  collection: { id: collection.id },
  tags: [{ name: "typescript" }, { name: "books" }],
});

console.log(`saved #${link.id} → ${link.url}`);
```

### Services

| Service              | What it covers                                         |
| -------------------- | ------------------------------------------------------ |
| `client.links`       | CRUD, bulk update/delete, reorder, archive, highlights |
| `client.collections` | CRUD, nesting, sharing                                 |
| `client.tags`        | List, bulk create, rename, delete                      |
| `client.search`      | Full-text link search                                  |
| `client.archives`    | Get and upload PNG / JPEG / PDF / Readability / HTML   |
| `client.migrations`  | Export and import (Linkwarden, HTML, Pocket, …)        |
| `client.rss`         | Feed subscriptions                                     |
| `client.highlights`  | Create and delete highlights                           |
| `client.tokens`      | Create, list, revoke API tokens                        |
| `client.dashboard`   | v1/v2 dashboard data and layout                        |
| `client.config`      | Public instance configuration                          |
| `client.favicon`     | Favicon lookup for any URL                             |
| `client.users`       | Current user, registration, profile and preferences    |
| `client.session`     | Sign in for a session token, and sign out              |
| `client.auth`        | Password reset and email verification codes            |
| `client.logins`      | Sign-in methods the instance offers                    |
| `client.public`      | Read-only access to public collections, links, users   |
| `client.avatar`      | User avatar images                                     |
| `client.preserved`   | Signed URLs for archives on the user content domain    |
| `client.worker`      | Preservation queue stats and resets (admin only)       |

Client options:

| Option      | What it does                                                        |
| ----------- | ------------------------------------------------------------------- |
| `baseUrl`   | The instance URL. A trailing slash is fine.                         |
| `token`     | An API token or session token. Optional for unauthenticated calls.  |
| `timeoutMs` | Aborts each request that takes longer than this.                    |
| `fetch`     | A custom `fetch`, for proxies, retries, logging or tests.           |
| `headers`   | Extra headers sent with every request.                              |

Every method also takes a last, optional `{ signal }` argument to cancel that one call.

All models are plain `type` aliases matching the JSON the API sends. Dates are ISO 8601
strings; `null` means the API sent `null`.

## Examples

### Links

<details>
<summary><b>Search, filter and list</b></summary>

```ts
import { Sort } from "linkwarden-ts-sdk";

const hits = await client.search.links({ searchQueryString: "kubernetes" });

const pinned = await client.links.list({
  collectionId: 7,
  pinnedOnly: true,
  sort: Sort.DateNewestFirst,
});
```

</details>

<details>
<summary><b>Page through every link</b></summary>

Lists are cursor-paginated: pass the ID of the last link you received to get the next page.

```ts
import type { Link } from "linkwarden-ts-sdk";

const all: Link[] = [];
let cursor: number | undefined;
for (;;) {
  const page = await client.links.list({ cursor });
  if (page.length === 0) break;
  all.push(...page);
  cursor = page.at(-1)?.id;
}
```

</details>

<details>
<summary><b>Update, reorder, archive and delete</b></summary>

```ts
// Only the fields you pass are changed; the rest are kept from the
// current link.
await client.links.update(412, {
  name: "Effective TypeScript (2nd ed.)",
  tags: [{ name: "typescript" }],
});

// Move a link to the top of its collection's custom order, or below
// another link.
await client.links.reorder(412);
await client.links.reorder(418, { beforeId: 412 });

// Re-run the archiver (screenshot, PDF, readability…) for a link.
await client.links.archive(412);

await client.links.delete(412);
await client.links.bulkDelete([418, 419, 420]);
```

</details>

<details>
<summary><b>Bulk move and retag</b></summary>

```ts
const links = await client.links.list({ collectionId: 3 });

await client.links.bulkUpdate({
  links,
  removePreviousTags: true,
  newData: { collectionId: 7, tags: [{ name: "weekend" }] },
});
```

</details>

### Collections and tags

<details>
<summary><b>Nested collections and sharing</b></summary>

```ts
const parent = await client.collections.create({ name: "Programming" });
const child = await client.collections.create({
  name: "TypeScript",
  parentId: parent.id,
});

// Make it public and give user 3 read/write access.
await client.collections.update(child.id, {
  isPublic: true,
  members: [{ userId: 3, canCreate: true, canUpdate: true }],
});
```

</details>

<details>
<summary><b>Manage tags</b></summary>

```ts
const tags = await client.tags.list({ search: "ts" });
for (const tag of tags) {
  console.log(tag.name.padEnd(20), tag._count?.links ?? 0, "links");
}

await client.tags.createOrUpdateBulk([
  { label: "to-read" },
  { label: "reference", archiveAsPDF: true },
]);

await client.tags.update(12, "typescript"); // rename
await client.tags.bulkDelete([13, 14]);
```

</details>

### Archives, highlights and RSS

<details>
<summary><b>Download an archived PDF</b></summary>

```ts
import { writeFile } from "node:fs/promises";
import { ArchiveFormat } from "linkwarden-ts-sdk";

const pdf = await client.archives.get(link.id, { format: ArchiveFormat.PDF });
await writeFile("effective-ts.pdf", pdf.data);
```

</details>

<details>
<summary><b>Upload your own archive file</b></summary>

`file` takes a `Blob`, `ArrayBuffer` or any typed array (a Node `Buffer` works). The file's
content type comes from the filename's extension, or is sniffed from its first bytes.

```ts
import { readFile } from "node:fs/promises";

// Attach it to an existing link…
await client.archives.upload(link.id, {
  format: ArchiveFormat.PNG,
  filename: "snapshot.png",
  file: await readFile("snapshot.png"),
});

// …or create a new link from a file in one call.
await client.archives.uploadStandalone({
  url: "https://example.com/paper",
  format: ArchiveFormat.PDF,
  filename: "paper.pdf",
  file: await readFile("paper.pdf"),
});
```

</details>

<details>
<summary><b>Highlights</b></summary>

```ts
const highlight = await client.highlights.create({
  linkId: link.id,
  color: "yellow",
  text: "Types are sets of values",
  comment: "the classic",
  startOffset: 120,
  endOffset: 144,
});

const highlights = await client.links.highlights(link.id);
await client.highlights.delete(highlight.id);
```

</details>

<details>
<summary><b>Subscribe to an RSS feed</b></summary>

New feed items are saved into the collection automatically.

```ts
const feed = await client.rss.create({
  name: "TypeScript Blog",
  url: "https://devblogs.microsoft.com/typescript/feed/",
  collectionName: "TypeScript",
});

const feeds = await client.rss.list();
await client.rss.delete(feed.id);
```

</details>

### Import, export and account

<details>
<summary><b>Back up everything</b></summary>

```ts
await writeFile("backup.json", await client.migrations.export());
```

</details>

<details>
<summary><b>Import browser bookmarks</b></summary>

```ts
import { ImportFormat } from "linkwarden-ts-sdk";

// Exported from Chrome, Firefox, Safari…
const html = await readFile("bookmarks.html", "utf8");

const message = await client.migrations.import(
  ImportFormat.BookmarksHTML,
  html,
);
console.log(message); // the import runs in the background on the server
```

Other formats: `ImportFormat.LinkwardenJSON`, `WallabagJSON`, `OmnivoreJSON`, `PocketJSON`.

</details>

<details>
<summary><b>API tokens</b></summary>

```ts
import { TokenExpiry } from "linkwarden-ts-sdk";

const created = await client.tokens.create({
  name: "ci-bot",
  expires: TokenExpiry.Never,
});
console.log(created.secretKey); // only returned once — store it now

const tokens = await client.tokens.list();
await client.tokens.revoke(created.token.id);
```

</details>

<details>
<summary><b>Sign in with a username and password</b></summary>

`session`, `auth`, `logins`, `public` and `config` work without a token.

```ts
const anon = new LinkwardenClient({ baseUrl });

const token = await anon.session.create({
  username: "dev",
  password: process.env.LINKWARDEN_PASSWORD!,
});

const client = new LinkwardenClient({ baseUrl, token });
const me = await client.users.me();

// Revoke the session token when you're done with it.
await client.session.delete();
```

An account whose email isn't verified yet fails with `err.code === ErrorCode.EmailNotVerified`,
and Linkwarden emails a 6-digit code: call `session.create` again with it in `code`. After too
many wrong passwords it fails with `ErrorCode.TooManyAttempts`, and `err.retryAfterSeconds` says
how long to wait.

</details>

<details>
<summary><b>Read a public collection</b></summary>

```ts
const anon = new LinkwardenClient({ baseUrl });

const collection = await anon.public.collection(7);
const links = await anon.public.collectionLinks(collection.id, {
  searchQueryString: "ts",
  searchByName: true,
  searchByTags: true,
});
```

</details>

<details>
<summary><b>Instance config and favicons</b></summary>

```ts
const config = await client.config.get();
console.log("Linkwarden", config.INSTANCE_VERSION);

const icon = await client.favicon.get("https://www.typescriptlang.org");
await writeFile("ts.ico", icon.data);
```

</details>

### Client behaviour

<details>
<summary><b>Timeouts and cancellation</b></summary>

```ts
const client = new LinkwardenClient({ baseUrl, token, timeoutMs: 30_000 });

// Every method takes a last { signal } argument for per-call cancellation.
const links = await client.links.list(
  {},
  { signal: AbortSignal.timeout(5_000) },
);
```

An aborted request rejects with the runtime's own `AbortError` / `TimeoutError`, unchanged.

</details>

<details>
<summary><b>Handle API errors</b></summary>

A non-2xx response rejects with a `LinkwardenApiError`; network failures and responses that
can't be decoded reject with its base class, `LinkwardenError`.

```ts
import { isConflict, isNotFound, LinkwardenApiError } from "linkwarden-ts-sdk";

try {
  await client.links.get(999_999);
} catch (err) {
  if (isNotFound(err)) {
    console.log("no such link");
  } else if (isConflict(err)) {
    console.log("already exists");
  } else if (err instanceof LinkwardenApiError) {
    console.log(err.status, err.apiMessage, err.code);
  } else {
    throw err;
  }
}
```

</details>

## Development

The E2E tests run against a real, throwaway Linkwarden instance instead of mocked responses.
Start one in Docker (it also creates a test user and API token), then run the tests against it:

```bash
pnpm install
scripts/dev-linkwarden.sh up
eval "$(scripts/dev-linkwarden.sh env)"
pnpm test          # unit + E2E
pnpm typecheck
pnpm lint
pnpm build
```

There's one E2E suite per service in [`test/e2e`](test/e2e), and unit tests for the pure helpers
in [`test/unit`](test/unit). Without `LINKWARDEN_URL` and `LINKWARDEN_TOKEN` the E2E tests are
skipped locally, and fail in CI. `scripts/dev-linkwarden.sh reset` deletes the instance and its
data.

The tested Linkwarden version is pinned in [`.linkwarden-version`](.linkwarden-version); CI and
`scripts/dev-linkwarden.sh` both run it.

Object shapes are declared with `type`, never `interface`, and class members always say
`public` or `private`; ESLint enforces both.

`tsc` is TypeScript 7, installed as `@typescript/native`. typescript-eslint doesn't support the
TypeScript 7 API yet, so the `typescript` package is aliased to `@typescript/typescript6` for it,
as the TypeScript 7 release notes recommend.

CI runs on pushes to `main` and on pull requests: `lint` (ESLint), `typecheck` (`tsc` and the
build), and `test` (unit tests on Node 22, 24 and 26, plus the E2E tests against Docker).

Relative imports name the `.ts` file (`import { Transport } from "./http.ts"`), and
`rewriteRelativeImportExtensions` turns them into `.js` in the build. The published `.d.ts` files
keep the `.ts` paths, which TypeScript 5.0 and later resolve to the declaration files.

### Releases

Releases are SemVer git tags (`v0.1.0`, `v1.0.0`, …). Pushing a tag runs the
[release workflow](.github/workflows/release.yml): it checks the tag, runs the tests on the tagged
commit, publishes the package to npm and creates a GitHub release with the tag's CHANGELOG
section as its notes.

To cut a release:

1. Set `version` in `package.json` to the new version.
2. In `CHANGELOG.md`, rename `[Unreleased]` to `## [x.y.z] - YYYY-MM-DD`, keep its
   `🧪 Tested against Linkwarden: <version>` line, and start a new empty `[Unreleased]`.
3. Check the notes: `scripts/release-notes.sh vX.Y.Z`
4. Merge that to `main`, then tag and push: `git tag -a vX.Y.Z -m vX.Y.Z && git push origin vX.Y.Z`

The workflow fails before publishing if the tag doesn't match `package.json`, if the changelog
has no section for it, or if that section names a different Linkwarden version than
[`.linkwarden-version`](.linkwarden-version). Pre-release tags such as `v1.0.0-rc.1` are published
under npm's `next` dist-tag. To retry a failed release, run the workflow by hand with the tag;
a version already on npm is skipped.

npm authentication uses [trusted publishing](https://docs.npmjs.com/trusted-publishers), so no
npm token is stored in GitHub. Set it up once on npmjs.com, in the package's settings, for this
repository and the workflow file `release.yml`. Until that's in place (for example, for the very
first publish), add an npm automation token as the `NPM_TOKEN` repository secret: the workflow
uses it when it's set. npm only attaches provenance to packages published from a public
repository.

## License

[GPL-3.0](LICENSE)
