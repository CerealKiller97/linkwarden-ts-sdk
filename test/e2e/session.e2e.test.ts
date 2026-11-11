import { expect, it } from "vitest";
import { isNotFound } from "../../src/index.js";
import {
  cleanup,
  createTestUser,
  describeE2E,
  newAnonymousClient,
  newClient,
  signInAs,
  uniqueName,
} from "./helpers.js";

describeE2E("SessionService", () => {
  it("create signs in and returns a usable session token", async () => {
    // Arrange
    const client = newClient();
    const { user, password } = await createTestUser(client);

    // Act
    const token = await newAnonymousClient().session.create({
      username: user.username ?? "",
      password,
      sessionName: "sdk-test",
    });

    // Assert
    expect(token).not.toBe("");
    const me = await newClient(token).users.me();
    expect(me.id).toBe(user.id);
  });

  it("create rejects a wrong password", async () => {
    // Arrange
    const client = newClient();
    const { user } = await createTestUser(client);

    // Act
    const result = newAnonymousClient().session.create({ username: user.username ?? "", password: "wrong-password" });

    // Assert
    await expect(result).rejects.toMatchObject({ name: "LinkwardenApiError" });
  });

  it("delete revokes the session token", async () => {
    // Arrange
    const client = newClient();
    const { user, password } = await createTestUser(client);
    const asUser = await signInAs(user, password);

    // Act
    await asUser.session.delete();

    // Assert
    await expect(asUser.users.me()).rejects.toMatchObject({ status: 401 });
  });

  it("delete rejects an API token as not found and leaves it valid", async () => {
    // Arrange
    const client = newClient();
    const created = await client.tokens.create({ name: uniqueName("token"), expires: 0 });
    cleanup(() => client.tokens.revoke(created.token.id));
    const withToken = newClient(created.secretKey);

    // Act
    const err: unknown = await withToken.session.delete().catch((e: unknown) => e);

    // Assert
    expect(isNotFound(err)).toBe(true);
    await expect(withToken.users.me()).resolves.toMatchObject({ id: expect.any(Number) as number });
  });
});
