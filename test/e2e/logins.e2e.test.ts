import { expect, it } from "vitest";
import { describeE2E, newAnonymousClient } from "./helpers.js";

describeE2E("LoginsService", () => {
  it("get returns the instance's sign-in methods", async () => {
    // Arrange
    const client = newAnonymousClient();

    // Act
    const logins = await client.logins.get();

    // Assert
    expect(logins.credentialsEnabled).toBe("true");
    expect(logins.buttonAuths).toBeInstanceOf(Array);
  });
});
