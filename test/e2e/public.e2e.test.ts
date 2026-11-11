import { expect, it, vi } from "vitest";
import {
  cleanup,
  createPublicTestCollection,
  createTestCollection,
  describeE2E,
  linkIds,
  newAnonymousClient,
  newClient,
  uniqueName,
  uniqueUrl,
} from "./helpers.js";

describeE2E("PublicService", () => {
  it("collection returns a public collection without a token", async () => {
    // Arrange
    const { collection } = await createPublicTestCollection(newClient());
    const anon = newAnonymousClient();

    // Act
    const got = await anon.public.collection(collection.id);

    // Assert
    expect(got.id).toBe(collection.id);
    expect(got.name).toBe(collection.name);
  });

  it("collection rejects a private collection", async () => {
    // Arrange
    const collection = await createTestCollection(newClient());
    const anon = newAnonymousClient();

    // Act
    const result = anon.public.collection(collection.id);

    // Assert
    await expect(result).rejects.toMatchObject({ name: "LinkwardenApiError" });
  });

  it("collectionLinks returns the links in a public collection", async () => {
    // Arrange
    const { collection, link } = await createPublicTestCollection(newClient());
    const anon = newAnonymousClient();

    // Act
    const links = await anon.public.collectionLinks(collection.id);

    // Assert
    expect(linkIds(links)).toEqual([link.id]);
  });

  it("collectionLinks filters by search", async () => {
    // Arrange
    const client = newClient();
    const { collection } = await createPublicTestCollection(client);
    // One word with no separators, since the search index splits words on them.
    const word = uniqueName("public").replaceAll("-", "");
    const link = await client.links.create({ name: word, url: uniqueUrl(), collection: { id: collection.id } });
    cleanup(() => client.links.delete(link.id));
    const anon = newAnonymousClient();

    // Act
    // New links reach the search index asynchronously, so retry until it finds one.
    const matching = await vi.waitFor(
      async () => {
        const links = await anon.public.collectionLinks(collection.id, { searchQueryString: word, searchByName: true });
        if (links.length === 0) throw new Error("not indexed yet");
        return links;
      },
      { timeout: 60_000, interval: 1_000 },
    );

    // Assert
    expect(linkIds(matching)).toEqual([link.id]);
  });

  it("collectionTags returns the tags used in a public collection", async () => {
    // Arrange
    const { collection, link } = await createPublicTestCollection(newClient());
    const anon = newAnonymousClient();

    // Act
    const tags = await anon.public.collectionTags(collection.id);

    // Assert
    expect(tags.map((t) => t.name)).toContain(link.tags?.[0]?.name);
  });

  it("link returns a link from a public collection", async () => {
    // Arrange
    const { link } = await createPublicTestCollection(newClient());
    const anon = newAnonymousClient();

    // Act
    const got = await anon.public.link(link.id);

    // Assert
    expect(got.id).toBe(link.id);
    expect(got.url).toBe(link.url);
  });

  it("user returns a user's public profile", async () => {
    // Arrange
    const me = await newClient().users.me();
    const anon = newAnonymousClient();

    // Act
    const got = await anon.public.user(me.id);

    // Assert
    expect(got.id).toBe(me.id);
    expect(got.username).toBe(me.username);
  });
});
