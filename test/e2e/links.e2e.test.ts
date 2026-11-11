import { expect, it } from "vitest";
import { isApiError, type LinkwardenClient, Sort } from "../../src/index.js";
import {
  cleanup,
  createTestCollection,
  createTestHighlight,
  createTestLink,
  createTestTag,
  deleteTagByName,
  describeE2E,
  linkIds,
  newClient,
  uniqueName,
  uniqueUrl,
} from "./helpers.js";

async function listInCustomOrder(client: LinkwardenClient, collectionId: number): Promise<number[]> {
  return linkIds(await client.links.list({ collectionId, sort: Sort.Custom }));
}

describeE2E("LinksService", () => {
  it("create saves a link with tags into a collection", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const url = uniqueUrl();
    const tagName = uniqueName("tag");

    // Act
    const link = await client.links.create({
      name: "New",
      url,
      description: "created by the SDK tests",
      tags: [{ name: tagName }],
      collection: { id: collection.id },
    });
    cleanup(() => client.links.delete(link.id));
    cleanup(() => deleteTagByName(client, tagName));

    // Assert
    expect(link.id).toBeGreaterThan(0);
    expect(link.name).toBe("New");
    expect(link.url).toBe(url);
    expect(link.collectionId).toBe(collection.id);
    expect(link.tags?.map((tag) => tag.name)).toEqual([tagName]);
  });

  it("get returns the link", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const link = await createTestLink(client, collection.id);

    // Act
    const got = await client.links.get(link.id);

    // Assert
    expect(got.id).toBe(link.id);
    expect(got.url).toBe(link.url);
    expect(got.collection?.id).toBe(collection.id);
    expect(got.pinnedBy).toEqual([]);
  });

  it("get rejects an inaccessible link with an API error", async () => {
    // Arrange
    const client = newClient();

    // Act
    const result = client.links.get(999_999_999);

    // Assert
    const err: unknown = await result.catch((e: unknown) => e);
    expect(isApiError(err)).toBe(true);
    expect(isApiError(err) && err.apiMessage).not.toBe("");
  });

  it("list filters by collection", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const other = await createTestCollection(client);
    const first = await createTestLink(client, collection.id);
    const second = await createTestLink(client, collection.id);
    await createTestLink(client, other.id);

    // Act
    const links = await client.links.list({ collectionId: collection.id });

    // Assert
    expect(linkIds(links).sort()).toEqual([first.id, second.id].sort());
  });

  it("list returns an empty array for an empty collection", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);

    // Act
    const links = await client.links.list({ collectionId: collection.id });

    // Assert
    expect(links).toEqual([]);
  });

  it("list filters by tag", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const tag = await createTestTag(client);
    const tagged = await client.links.create({
      name: uniqueName("tagged"),
      url: uniqueUrl(),
      tags: [{ name: tag.name }],
      collection: { id: collection.id },
    });
    cleanup(() => client.links.delete(tagged.id));
    await createTestLink(client, collection.id);

    // Act
    const links = await client.links.list({ tagId: tag.id });

    // Assert
    expect(linkIds(links)).toEqual([tagged.id]);
  });

  it("update changes the given fields", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const link = await createTestLink(client, collection.id);

    // Act
    const updated = await client.links.update(link.id, { name: "Renamed", description: "updated" });

    // Assert
    expect(updated.id).toBe(link.id);
    const got = await client.links.get(link.id);
    expect(got.name).toBe("Renamed");
    expect(got.description).toBe("updated");
  });

  it("update keeps the tags and collection it isn't given", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const tag = await createTestTag(client);
    const link = await client.links.create({
      name: uniqueName("link"),
      url: uniqueUrl(),
      tags: [{ name: tag.name }],
      collection: { id: collection.id },
    });
    cleanup(() => client.links.delete(link.id));

    // Act
    await client.links.update(link.id, { name: "Renamed" });

    // Assert
    const got = await client.links.get(link.id);
    expect(got.name).toBe("Renamed");
    expect(got.url).toBe(link.url);
    expect(got.collection?.id).toBe(collection.id);
    expect(got.tags?.map((t) => t.name)).toEqual([tag.name]);
  });

  it("update moves the link to another collection", async () => {
    // Arrange
    const client = newClient();
    const from = await createTestCollection(client);
    const to = await createTestCollection(client);
    const link = await createTestLink(client, from.id);

    // Act
    await client.links.update(link.id, { collection: { id: to.id } });

    // Assert
    const got = await client.links.get(link.id);
    expect(got.collection?.id).toBe(to.id);
  });

  it("delete removes the link", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const link = await createTestLink(client, collection.id);

    // Act
    await client.links.delete(link.id);

    // Assert
    expect(await client.links.list({ collectionId: collection.id })).toEqual([]);
  });

  it("bulkUpdate moves and retags links", async () => {
    // Arrange
    const client = newClient();
    const from = await createTestCollection(client);
    const to = await createTestCollection(client);
    const first = await createTestLink(client, from.id);
    const second = await createTestLink(client, from.id);
    const tag = await createTestTag(client);

    // Act
    await client.links.bulkUpdate({
      links: [first, second],
      removePreviousTags: true,
      newData: { collectionId: to.id, tags: [{ name: tag.name }] },
    });

    // Assert
    const moved = await client.links.list({ collectionId: to.id });
    expect(linkIds(moved).sort()).toEqual([first.id, second.id].sort());
    for (const link of moved) {
      expect(link.tags?.map((t) => t.name)).toEqual([tag.name]);
    }
  });

  it("bulkDelete removes only the given links", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const first = await createTestLink(client, collection.id);
    const second = await createTestLink(client, collection.id);
    const kept = await createTestLink(client, collection.id);

    // Act
    await client.links.bulkDelete([first.id, second.id]);

    // Assert
    expect(linkIds(await client.links.list({ collectionId: collection.id }))).toEqual([kept.id]);
  });

  it("archive queues the link for archiving", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const link = await createTestLink(client, collection.id);

    // Act
    const result = client.links.archive(link.id);

    // Assert
    await expect(result).resolves.toBeUndefined();
  });

  it("deleteArchive deletes the link's archived files", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const link = await createTestLink(client, collection.id);

    // Act
    const result = client.links.deleteArchive([link.id]);

    // Assert
    await expect(result).resolves.toBeUndefined();
  });

  it("highlights returns an empty array for a link without highlights", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const link = await createTestLink(client, collection.id);

    // Act
    const highlights = await client.links.highlights(link.id);

    // Assert
    expect(highlights).toEqual([]);
  });

  it("highlights returns the link's highlights", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const link = await createTestLink(client, collection.id);
    const created = await createTestHighlight(client, link.id);

    // Act
    const highlights = await client.links.highlights(link.id);

    // Assert
    expect(highlights.map((h) => h.id)).toEqual([created.id]);
  });

  it("reorder moves a link to the top of its collection", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const oldest = await createTestLink(client, collection.id);
    const middle = await createTestLink(client, collection.id);
    const newest = await createTestLink(client, collection.id);

    // Act
    const moved = await client.links.reorder(oldest.id);

    // Assert
    expect(moved.id).toBe(oldest.id);
    expect(moved.collectionOrder).toBeGreaterThan(0);
    expect(await listInCustomOrder(client, collection.id)).toEqual([oldest.id, newest.id, middle.id]);
  });

  it("reorder moves a link below another one", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const oldest = await createTestLink(client, collection.id);
    const middle = await createTestLink(client, collection.id);
    const newest = await createTestLink(client, collection.id);

    // Act
    await client.links.reorder(newest.id, { beforeId: oldest.id });

    // Assert
    expect(await listInCustomOrder(client, collection.id)).toEqual([middle.id, oldest.id, newest.id]);
  });

  it("reorder rejects a link from another collection", async () => {
    // Arrange
    const client = newClient();
    const link = await createTestLink(client, (await createTestCollection(client)).id);
    const other = await createTestLink(client, (await createTestCollection(client)).id);

    // Act
    const result = client.links.reorder(link.id, { beforeId: other.id });

    // Assert
    await expect(result).rejects.toMatchObject({ name: "LinkwardenApiError", status: 400 });
  });
});
