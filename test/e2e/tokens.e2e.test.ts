import { expect, it } from "vitest";
import { TokenExpiry } from "../../src/index.ts";
import { cleanup, createTestToken, describeE2E, newClient, uniqueName } from "./helpers.ts";

describeE2E("TokensService", () => {
  it("create returns a working secret", async () => {
    // Arrange
    const client = newClient();

    // Act
    const created = await client.tokens.create({ name: uniqueName("token"), expires: TokenExpiry.Never });
    cleanup(() => client.tokens.revoke(created.token.id));

    // Assert
    expect(created.secretKey).not.toBe("");
    expect(created.token.id).toBeGreaterThan(0);
    expect(created.token.revoked).toBe(false);
    // The new secret works as a bearer token on its own.
    await expect(newClient(created.secretKey).collections.list()).resolves.toBeInstanceOf(Array);
  });

  it("create with a short expiry sets an expiry date in the near future", async () => {
    // Arrange
    const client = newClient();

    // Act
    const created = await client.tokens.create({ name: uniqueName("token"), expires: TokenExpiry.SevenDays });
    cleanup(() => client.tokens.revoke(created.token.id));

    // Assert
    const days = (Date.parse(created.token.expires) - Date.now()) / 86_400_000;
    expect(days).toBeGreaterThan(6);
    expect(days).toBeLessThan(8);
  });

  it("list includes the user's tokens", async () => {
    // Arrange
    const client = newClient();
    const created = await createTestToken(client);

    // Act
    const tokens = await client.tokens.list();

    // Assert
    expect(tokens.map((t) => t.name)).toContain(created.token.name);
  });

  it("revoke stops the token from working", async () => {
    // Arrange
    const client = newClient();
    const created = await createTestToken(client);

    // Act
    await client.tokens.revoke(created.token.id);

    // Assert
    await expect(newClient(created.secretKey).collections.list()).rejects.toMatchObject({ status: 401 });
  });

  it("revoke rejects an unauthenticated caller", async () => {
    // Arrange
    const client = newClient();
    const created = await createTestToken(client);

    // Act
    const result = newClient("invalid-token").tokens.revoke(created.token.id);

    // Assert
    await expect(result).rejects.toMatchObject({ status: 401 });
  });
});
