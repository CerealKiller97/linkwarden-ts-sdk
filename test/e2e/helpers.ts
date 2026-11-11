/**
 * The E2E tests run against a real Linkwarden instance, set through LINKWARDEN_URL and
 * LINKWARDEN_TOKEN. `scripts/dev-linkwarden.sh up` starts a throwaway one locally, and CI
 * starts one per run. Without them the tests are skipped locally but fail in CI (see
 * global-setup.ts), so a broken workflow can't pass by skipping everything.
 *
 * Every test creates its own uniquely named data and deletes it afterwards, so tests can
 * share one instance and run in any order.
 */
import { randomBytes } from "node:crypto";
import { deflateSync } from "node:zlib";
import { describe, onTestFinished } from "vitest";
import {
  type Collection,
  type CreatedToken,
  type Highlight,
  type Link,
  LinkwardenClient,
  type RssSubscription,
  type Tag,
  TokenExpiry,
  type User,
} from "../../src/index.js";

export const env = {
  url: process.env["LINKWARDEN_URL"] ?? "",
  token: process.env["LINKWARDEN_TOKEN"] ?? "",
};

export const isConfigured = env.url !== "" && env.token !== "";

/** A `describe` that's skipped when no Linkwarden instance is configured. */
export const describeE2E = describe.skipIf(!isConfigured);

/** Returns a client for the test instance, authenticated as the admin test user by default. */
export function newClient(token: string | undefined = env.token): LinkwardenClient {
  return new LinkwardenClient({ baseUrl: env.url, token });
}

/** Returns a client with no token, for the unauthenticated endpoints. */
export function newAnonymousClient(): LinkwardenClient {
  return newClient(undefined);
}

/** Runs `fn` once the current test finishes, ignoring its errors (like Go's t.Cleanup). */
export function cleanup(fn: () => Promise<unknown>): void {
  onTestFinished(async () => {
    try {
      await fn();
    } catch {
      // Best-effort: the data may already be gone.
    }
  });
}

/** Returns `prefix` followed by a random suffix, for names that must not clash. */
export function uniqueName(prefix: string): string {
  return `${prefix}-${randomBytes(6).toString("hex")}`;
}

/** Returns a URL that no other link on the instance uses. */
export function uniqueUrl(): string {
  return `https://example.com/${uniqueName("e2e")}`;
}

export function linkIds(links: Link[]): number[] {
  return links.map((link) => link.id);
}

export async function createTestCollection(client: LinkwardenClient): Promise<Collection> {
  const collection = await client.collections.create({ name: uniqueName("collection") });
  cleanup(() => client.collections.delete(collection.id));

  return collection;
}

export async function createTestLink(client: LinkwardenClient, collectionId: number): Promise<Link> {
  const link = await client.links.create({
    name: uniqueName("link"),
    url: uniqueUrl(),
    collection: { id: collectionId },
  });
  cleanup(() => client.links.delete(link.id));

  return link;
}

export async function createTestTag(client: LinkwardenClient): Promise<Tag> {
  const [tag] = await client.tags.createOrUpdateBulk([{ label: uniqueName("tag") }]);
  if (!tag) {
    throw new Error("createOrUpdateBulk returned no tags");
  }
  cleanup(() => client.tags.delete(tag.id));

  return tag;
}

export async function deleteTagByName(client: LinkwardenClient, name: string): Promise<void> {
  const tags = await client.tags.list({ search: name });
  await Promise.all(tags.filter((tag) => tag.name === name).map((tag) => client.tags.delete(tag.id)));
}

export async function createTestHighlight(client: LinkwardenClient, linkId: number): Promise<Highlight> {
  const highlight = await client.highlights.create({
    color: "yellow",
    comment: "worth rereading",
    startOffset: 0,
    endOffset: 5,
    text: "Hello",
    linkId,
  });
  cleanup(() => client.highlights.delete(highlight.id));

  return highlight;
}

export async function createTestToken(client: LinkwardenClient): Promise<CreatedToken> {
  const created = await client.tokens.create({ name: uniqueName("token"), expires: TokenExpiry.Never });
  cleanup(() => client.tokens.revoke(created.token.id));

  return created;
}

export const testFeedUrl = "https://go.dev/blog/feed.atom";

export async function createTestSubscription(client: LinkwardenClient, collectionId: number): Promise<RssSubscription> {
  const subscription = await client.rss.create({ name: uniqueName("feed"), url: testFeedUrl, collectionId });
  cleanup(() => client.rss.delete(subscription.id));

  return subscription;
}

/**
 * Registers a new user with a random password, returning it and the password. The
 * calling client must be the instance admin to delete it afterwards.
 */
export async function createTestUser(client: LinkwardenClient): Promise<{ user: User; password: string }> {
  const password = uniqueName("password");
  const user = await client.users.create({ name: "Test User", username: uniqueName("user"), password });
  cleanup(() => client.users.delete(user.id));

  return { user, password };
}

/**
 * Returns a client signed in as `user`, so a test can change that user's account
 * without touching the shared test account.
 */
export async function signInAs(user: User, password: string): Promise<LinkwardenClient> {
  const token = await newAnonymousClient().session.create({ username: user.username ?? "", password });

  return newClient(token);
}

/** Creates a public collection holding one tagged link. */
export async function createPublicTestCollection(
  client: LinkwardenClient,
): Promise<{ collection: Collection; link: Link }> {
  const collection = await createTestCollection(client);
  await client.collections.update(collection.id, { isPublic: true });

  const link = await client.links.create({
    name: uniqueName("link"),
    url: uniqueUrl(),
    collection: { id: collection.id },
    tags: [{ name: uniqueName("tag") }],
  });
  cleanup(() => client.links.delete(link.id));

  return { collection, link };
}

/** Returns a small, valid 4×4 PNG image to upload as an archive. */
export function testPng(): Uint8Array<ArrayBuffer> {
  const width = 4;
  const height = 4;
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA, no interlace

  const row = [0, ...Array.from({ length: width }, () => [245, 158, 11, 255]).flat()];
  const pixels = Buffer.from(Array.from({ length: height }, () => row).flat());

  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", header),
    pngChunk("IDAT", deflateSync(pixels)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);

  return Uint8Array.from(png);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));

  return Buffer.concat([length, typeAndData, crc]);
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}
