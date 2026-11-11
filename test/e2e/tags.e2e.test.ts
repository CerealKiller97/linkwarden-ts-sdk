import { expect, it } from "vitest";
import { isNotFound } from "../../src/index.js";
import { cleanup, createTestTag, describeE2E, newClient, uniqueName } from "./helpers.js";

describeE2E("TagsService", () => {
  it("createOrUpdateBulk creates every tag", async () => {
    // Arrange
    const client = newClient();
    const first = uniqueName("tag");
    const second = uniqueName("tag");

    // Act
    const tags = await client.tags.createOrUpdateBulk([{ label: first }, { label: second }]);
    for (const tag of tags) {
      cleanup(() => client.tags.delete(tag.id));
    }

    // Assert
    expect(tags.map((t) => t.name).sort()).toEqual([first, second].sort());
  });

  it("createOrUpdateBulk accepts archive settings", async () => {
    // Arrange
    const client = newClient();
    const label = uniqueName("tag");

    // Act
    const tags = await client.tags.createOrUpdateBulk([{ label, archiveAsScreenshot: false, archiveAsPDF: true }]);
    for (const tag of tags) {
      cleanup(() => client.tags.delete(tag.id));
    }

    // Assert
    expect(tags).toHaveLength(1);
    expect(tags[0]?.name).toBe(label);
    expect(tags[0]?.archiveAsPDF).toBe(true);
    expect(tags[0]?.archiveAsScreenshot).toBe(false);
  });

  it("list filters by name", async () => {
    // Arrange
    const client = newClient();
    const tag = await createTestTag(client);

    // Act
    const tags = await client.tags.list({ search: tag.name });

    // Assert
    expect(tags.map((t) => [t.id, t.name])).toEqual([[tag.id, tag.name]]);
    expect(tags[0]?._count?.links).toBe(0);
  });

  it("get returns the tag", async () => {
    // Arrange
    const client = newClient();
    const tag = await createTestTag(client);

    // Act
    const got = await client.tags.get(tag.id);

    // Assert
    expect(got.id).toBe(tag.id);
    expect(got.name).toBe(tag.name);
  });

  it("get rejects a missing tag as not found", async () => {
    // Arrange
    const client = newClient();

    // Act
    const err: unknown = await client.tags.get(999_999_999).catch((e: unknown) => e);

    // Assert
    expect(isNotFound(err)).toBe(true);
  });

  it("update renames the tag", async () => {
    // Arrange
    const client = newClient();
    const tag = await createTestTag(client);
    const renamed = uniqueName("renamed");

    // Act
    const updated = await client.tags.update(tag.id, renamed);

    // Assert
    expect(updated.name).toBe(renamed);
    expect((await client.tags.get(tag.id)).name).toBe(renamed);
  });

  it("delete removes the tag", async () => {
    // Arrange
    const client = newClient();
    const tag = await createTestTag(client);

    // Act
    await client.tags.delete(tag.id);

    // Assert
    const err: unknown = await client.tags.get(tag.id).catch((e: unknown) => e);
    expect(isNotFound(err)).toBe(true);
  });

  it("bulkDelete removes only the given tags", async () => {
    // Arrange
    const client = newClient();
    const first = await createTestTag(client);
    const second = await createTestTag(client);
    const kept = await createTestTag(client);

    // Act
    await client.tags.bulkDelete([first.id, second.id]);

    // Assert
    for (const id of [first.id, second.id]) {
      const err: unknown = await client.tags.get(id).catch((e: unknown) => e);
      expect(isNotFound(err)).toBe(true);
    }
    await expect(client.tags.get(kept.id)).resolves.toMatchObject({ id: kept.id });
  });
});
