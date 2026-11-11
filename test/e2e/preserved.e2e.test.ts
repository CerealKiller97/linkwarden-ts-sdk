import { expect, it } from "vitest";
import { ArchiveFormat } from "../../src/index.ts";
import { createTestCollection, createTestLink, describeE2E, newClient } from "./helpers.ts";

// The test instance has no USER_CONTENT_DOMAIN, so the preserved endpoints can only be
// checked for the error they return; the happy path needs a separately hosted domain.
describeE2E("PreservedService", () => {
  it("token rejects a request when no user content domain is configured", async () => {
    // Arrange
    const client = newClient();
    const link = await createTestLink(client, (await createTestCollection(client)).id);

    // Act
    const result = client.preserved.token(link.id, ArchiveFormat.PNG);

    // Assert
    await expect(result).rejects.toMatchObject({ name: "LinkwardenApiError", status: 400 });
  });

  it("view rejects an invalid token", async () => {
    // Arrange
    const client = newClient();

    // Act
    const result = client.preserved.view("invalid-token", { download: true });

    // Assert
    await expect(result).rejects.toMatchObject({ name: "LinkwardenApiError" });
  });
});
