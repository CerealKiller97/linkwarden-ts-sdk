import { expect, it } from "vitest";
import { DashboardSectionType } from "../../src/index.js";
import { cleanup, createTestCollection, createTestLink, describeE2E, linkIds, newClient } from "./helpers.js";

describeE2E("DashboardService", () => {
  it("getV1 includes recent links", async () => {
    // Arrange
    const client = newClient();
    const link = await createTestLink(client, (await createTestCollection(client)).id);

    // Act
    const links = await client.dashboard.getV1();

    // Assert
    expect(linkIds(links)).toContain(link.id);
  });

  it("getV2 includes recent links", async () => {
    // Arrange
    const client = newClient();
    const link = await createTestLink(client, (await createTestCollection(client)).id);

    // Act
    const data = await client.dashboard.getV2();

    // Assert
    expect(linkIds(data.links)).toContain(link.id);
    expect(data.numberOfTags).toBeGreaterThanOrEqual(0);
  });

  it("getV2 returns the links of collections shown on the dashboard", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const link = await createTestLink(client, collection.id);
    await client.dashboard.updateV2Layout([
      { type: DashboardSectionType.RecentLinks, enabled: true, order: 0 },
      { type: DashboardSectionType.Collection, collectionId: collection.id, enabled: true, order: 1 },
    ]);
    cleanup(() =>
      client.dashboard.updateV2Layout([{ type: DashboardSectionType.RecentLinks, enabled: true, order: 0 }]),
    );

    // Act
    const data = await client.dashboard.getV2();

    // Assert
    expect(linkIds(data.collectionLinks[String(collection.id)] ?? [])).toEqual([link.id]);
  });

  it("updateV2Layout replaces the layout", async () => {
    // Arrange
    const client = newClient();

    // Act
    const result = client.dashboard.updateV2Layout([
      { type: DashboardSectionType.Stats, enabled: true, order: 0 },
      { type: DashboardSectionType.RecentLinks, enabled: true, order: 1 },
      { type: DashboardSectionType.PinnedLinks, enabled: false, order: 2 },
    ]);

    // Assert
    await expect(result).resolves.toHaveProperty("links");
  });
});
