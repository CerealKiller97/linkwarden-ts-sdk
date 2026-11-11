import { expect, it } from "vitest";
import { describeE2E, newAnonymousClient, newClient } from "./helpers.js";

describeE2E("ConfigService", () => {
  it("get returns the instance version", async () => {
    // Arrange
    const client = newClient();

    // Act
    const config = await client.config.get();

    // Assert
    expect(config.INSTANCE_VERSION).toMatch(/^v?\d+\.\d+/);
  });

  it("get works without a token", async () => {
    // Arrange
    const client = newAnonymousClient();

    // Act
    const config = await client.config.get();

    // Assert
    expect(config.INSTANCE_VERSION).toBeTruthy();
  });
});
