import { expect, it } from "vitest";
import { isApiError, PreservationResetAction } from "../../src/index.ts";
import { createTestCollection, createTestLink, createTestUser, describeE2E, newClient, signInAs } from "./helpers.ts";

// The test user is the instance's first user, which Linkwarden treats as the admin.
describeE2E("WorkerService", () => {
  it("stats returns the queue counts", async () => {
    // Arrange
    const client = newClient();
    await createTestLink(client, (await createTestCollection(client)).id);

    // Act
    const stats = await client.worker.stats();

    // Assert
    expect(stats.link.pending + stats.link.done + stats.link.failed).toBeGreaterThan(0);
    expect(stats.search.pending + stats.search.done).toBeGreaterThanOrEqual(0);
  });

  it("resetPreservation starts clearing broken archives", async () => {
    // Arrange
    const client = newClient();

    // Act
    const message = await client.worker.resetPreservation(PreservationResetAction.Broken);

    // Assert
    expect(message).not.toBe("");
  });

  it("stats rejects a user who isn't the admin", async () => {
    // Arrange
    const client = newClient();
    const { user, password } = await createTestUser(client);
    const asUser = await signInAs(user, password);

    // Act
    const err: unknown = await asUser.worker.stats().catch((e: unknown) => e);

    // Assert
    expect(isApiError(err)).toBe(true);
    expect([401, 403]).toContain(isApiError(err) ? err.status : 0);
  });
});
