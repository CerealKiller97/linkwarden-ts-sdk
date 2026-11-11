import { expect, it } from "vitest";
import { describeE2E, newClient } from "./helpers.js";

describeE2E("FaviconService", () => {
  it("get downloads a site's favicon", async () => {
    // Arrange
    const client = newClient();

    // Act
    const favicon = await client.favicon.get("https://go.dev");

    // Assert
    expect(favicon.data.length).toBeGreaterThan(0);
    expect(favicon.contentType).toContain("image/");
  });
});
