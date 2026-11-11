import { expect, it } from "vitest";
import { isNotFound } from "../../src/index.ts";
import { createTestUser, describeE2E, newClient } from "./helpers.ts";

describeE2E("AvatarService", () => {
  it("get rejects a user without an avatar as not found", async () => {
    // Arrange
    const client = newClient();
    const { user } = await createTestUser(client);

    // Act
    const err: unknown = await client.avatar.get(user.id).catch((e: unknown) => e);

    // Assert
    expect(isNotFound(err)).toBe(true);
  });
});
