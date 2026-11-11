import { expect, it, vi } from "vitest";
import { cleanup, createTestCollection, describeE2E, linkIds, newClient, uniqueName, uniqueUrl } from "./helpers.js";

describeE2E("SearchService", () => {
  it("links finds a link by a word in its name", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    // One word with no separators, so the search can't match other links on a shared prefix.
    const word = uniqueName("searchable").replaceAll("-", "");
    const link = await client.links.create({ name: word, url: uniqueUrl(), collection: { id: collection.id } });
    cleanup(() => client.links.delete(link.id));

    // Act
    // New links reach the search index asynchronously, so retry until it finds one.
    const found = await vi.waitFor(
      async () => {
        const links = await client.search.links({ searchQueryString: word });
        if (links.length === 0) throw new Error("not indexed yet");
        return links;
      },
      { timeout: 60_000, interval: 1_000 },
    );

    // Assert
    expect(linkIds(found)).toEqual([link.id]);
  });

  it("links returns an empty array when nothing matches", async () => {
    // Arrange
    const client = newClient();
    // One made-up word: Meilisearch matches each word of a query on its own, so a real
    // word like "nothing" can match the archived text of some link.
    const query = uniqueName("zqxjv").replaceAll("-", "");

    // Act
    const links = await client.search.links({ searchQueryString: query });

    // Assert
    expect(links).toEqual([]);
  });
});
