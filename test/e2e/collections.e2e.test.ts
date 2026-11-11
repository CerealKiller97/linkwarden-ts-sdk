import { expect, it } from "vitest";
import { isNotFound } from "../../src/index.ts";
import { cleanup, createTestCollection, describeE2E, newClient, uniqueName } from "./helpers.ts";

describeE2E("CollectionsService", () => {
  it("create creates a collection", async () => {
    // Arrange
    const client = newClient();
    const name = uniqueName("collection");

    // Act
    const collection = await client.collections.create({
      name,
      description: "created by the SDK tests",
      color: "#f59e0b",
    });
    cleanup(() => client.collections.delete(collection.id));

    // Assert
    expect(collection.id).toBeGreaterThan(0);
    expect(collection.name).toBe(name);
    expect(collection.description).toBe("created by the SDK tests");
    expect(collection.color).toBe("#f59e0b");
  });

  it("create nests a collection inside its parent", async () => {
    // Arrange
    const client = newClient();
    const parent = await createTestCollection(client);

    // Act
    const child = await client.collections.create({ name: uniqueName("child"), parentId: parent.id });
    cleanup(() => client.collections.delete(child.id));

    // Assert
    expect(child.parentId).toBe(parent.id);
  });

  it("list includes the user's collections", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);

    // Act
    const collections = await client.collections.list();

    // Assert
    const found = collections.find((c) => c.id === collection.id);
    expect(found?.name).toBe(collection.name);
  });

  it("get returns the collection", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);

    // Act
    const got = await client.collections.get(collection.id);

    // Assert
    expect(got.id).toBe(collection.id);
    expect(got.name).toBe(collection.name);
  });

  it("get rejects a missing collection as not found", async () => {
    // Arrange
    const client = newClient();

    // Act
    const err: unknown = await client.collections.get(999_999_999).catch((e: unknown) => e);

    // Assert
    expect(isNotFound(err)).toBe(true);
  });

  it("update changes the given fields", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const renamed = uniqueName("renamed");

    // Act
    const updated = await client.collections.update(collection.id, {
      name: renamed,
      description: "updated",
      color: "#10b981",
    });

    // Assert
    expect(updated.name).toBe(renamed);
    const got = await client.collections.get(collection.id);
    expect(got.name).toBe(renamed);
    expect(got.description).toBe("updated");
    expect(got.color).toBe("#10b981");
  });

  it("update keeps the fields it isn't given", async () => {
    // Arrange
    const client = newClient();
    const collection = await client.collections.create({
      name: uniqueName("collection"),
      description: "kept",
      color: "#f59e0b",
    });
    cleanup(() => client.collections.delete(collection.id));

    // Act
    await client.collections.update(collection.id, { color: "#10b981" });

    // Assert
    const got = await client.collections.get(collection.id);
    expect(got.name).toBe(collection.name);
    expect(got.description).toBe("kept");
    expect(got.color).toBe("#10b981");
  });

  it("update makes a collection public", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);

    // Act
    await client.collections.update(collection.id, { isPublic: true });

    // Assert
    expect((await client.collections.get(collection.id)).isPublic).toBe(true);
  });

  it("update keeps a collection public when isPublic is left out", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    await client.collections.update(collection.id, { isPublic: true });

    // Act
    await client.collections.update(collection.id, { color: "#10b981" });

    // Assert
    expect((await client.collections.get(collection.id)).isPublic).toBe(true);
  });

  it("update makes a collection private again", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    await client.collections.update(collection.id, { isPublic: true });

    // Act
    await client.collections.update(collection.id, { isPublic: false });

    // Assert
    expect((await client.collections.get(collection.id)).isPublic).toBe(false);
  });

  it("delete removes the collection", async () => {
    // Arrange
    const client = newClient();
    const collection = await client.collections.create({ name: uniqueName("collection") });

    // Act
    await client.collections.delete(collection.id);

    // Assert
    const ids = (await client.collections.list()).map((c) => c.id);
    expect(ids).not.toContain(collection.id);
  });

  it("delete rejects an inaccessible collection", async () => {
    // Arrange
    const client = newClient();

    // Act
    const result = client.collections.delete(999_999_999);

    // Assert
    await expect(result).rejects.toMatchObject({ name: "LinkwardenApiError" });
  });
});
