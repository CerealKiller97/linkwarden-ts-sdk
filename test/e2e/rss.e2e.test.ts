import { expect, it } from "vitest";
import { isNotFound } from "../../src/index.ts";
import {
  cleanup,
  createTestCollection,
  createTestSubscription,
  describeE2E,
  newClient,
  testFeedUrl,
  uniqueName,
} from "./helpers.ts";

describeE2E("RssService", () => {
  it("create subscribes to a feed", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);

    // Act
    const subscription = await client.rss.create({
      name: uniqueName("feed"),
      url: testFeedUrl,
      collectionId: collection.id,
    });
    cleanup(() => client.rss.delete(subscription.id));

    // Assert
    expect(subscription.id).toBeGreaterThan(0);
    expect(subscription.url).toBe(testFeedUrl);
    expect(subscription.collectionId).toBe(collection.id);
  });

  it("list includes the user's subscriptions", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const subscription = await createTestSubscription(client, collection.id);

    // Act
    const subscriptions = await client.rss.list();

    // Assert
    const found = subscriptions.find((s) => s.id === subscription.id);
    expect(found?.collection?.name).toBe(collection.name);
  });

  it("delete removes the subscription", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const subscription = await createTestSubscription(client, collection.id);

    // Act
    await client.rss.delete(subscription.id);

    // Assert
    expect((await client.rss.list()).map((s) => s.id)).not.toContain(subscription.id);
  });

  it("delete rejects a missing subscription as not found", async () => {
    // Arrange
    const client = newClient();

    // Act
    const err: unknown = await client.rss.delete(999_999_999).catch((e: unknown) => e);

    // Assert
    expect(isNotFound(err)).toBe(true);
  });
});
