import { expect, it } from "vitest";
import { isApiError, LinkwardenClient, LinkwardenError } from "../../src/index.js";
import { describeE2E, env, newClient } from "./helpers.js";

describeE2E("LinkwardenClient", () => {
  it("authenticates with the token", async () => {
    // Arrange
    const client = newClient();

    // Act
    const result = client.collections.list();

    // Assert
    await expect(result).resolves.toBeInstanceOf(Array);
  });

  it("rejects an invalid token with a 401 API error", async () => {
    // Arrange
    const client = newClient("invalid-token");

    // Act
    const err: unknown = await client.collections.list().catch((e: unknown) => e);

    // Assert
    expect(isApiError(err)).toBe(true);
    if (!isApiError(err)) return;
    expect(err.status).toBe(401);
    expect(err.apiMessage).not.toBe("");
    expect(err.rawBody).not.toBe("");
    expect(err.message).toBe(`linkwarden: 401 ${err.apiMessage}`);
  });

  it("accepts a base URL with a trailing slash", async () => {
    // Arrange
    const client = new LinkwardenClient({ baseUrl: `${env.url}/`, token: env.token });

    // Act
    const result = client.config.get();

    // Assert
    await expect(result).resolves.toHaveProperty("INSTANCE_VERSION");
  });

  it("sends custom headers through a custom fetch", async () => {
    // Arrange
    const seen: Headers[] = [];
    const client = new LinkwardenClient({
      baseUrl: env.url,
      token: env.token,
      headers: { "X-Test": "linkwarden-ts-sdk" },
      fetch: (input, init) => {
        seen.push(new Headers(init.headers));
        return fetch(input, init);
      },
    });

    // Act
    await client.users.me();

    // Assert
    expect(seen).toHaveLength(1);
    expect(seen[0]?.get("X-Test")).toBe("linkwarden-ts-sdk");
    expect(seen[0]?.get("Authorization")).toBe(`Bearer ${env.token}`);
  });

  it("rethrows an aborted request unchanged", async () => {
    // Arrange
    const client = newClient();
    const controller = new AbortController();
    controller.abort();

    // Act
    const err: unknown = await client.users.me({ signal: controller.signal }).catch((e: unknown) => e);

    // Assert
    expect(err).toBeInstanceOf(Error);
    expect((err as Error).name).toBe("AbortError");
    expect(err).not.toBeInstanceOf(LinkwardenError);
  });

  it("aborts requests that exceed timeoutMs", async () => {
    // Arrange
    const client = new LinkwardenClient({
      baseUrl: env.url,
      token: env.token,
      timeoutMs: 1,
      fetch: (input, init) =>
        new Promise((resolve, reject) => {
          init.signal?.addEventListener("abort", () => {
            reject(init.signal?.reason as Error);
          });
          setTimeout(() => {
            resolve(fetch(input, init));
          }, 1_000);
        }),
    });

    // Act
    const err: unknown = await client.users.me().catch((e: unknown) => e);

    // Assert
    expect((err as Error).name).toBe("TimeoutError");
  });

  it("wraps network failures in a LinkwardenError", async () => {
    // Arrange
    const client = new LinkwardenClient({ baseUrl: "http://127.0.0.1:1", token: env.token });

    // Act
    const err: unknown = await client.users.me().catch((e: unknown) => e);

    // Assert
    expect(err).toBeInstanceOf(LinkwardenError);
    expect(isApiError(err)).toBe(false);
    expect((err as Error).message).toContain("GET /api/v1/users/me");
  });
});
