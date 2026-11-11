import { expect, it } from "vitest";
import { cleanup, createTestUser, describeE2E, newClient, signInAs, uniqueName } from "./helpers.js";

describeE2E("UsersService", () => {
  it("me returns the authenticated user", async () => {
    // Arrange
    const client = newClient();

    // Act
    const me = await client.users.me();

    // Assert
    expect(me.id).toBeGreaterThan(0);
    expect(me.username).toBeTruthy();
  });

  it("get returns the user's own account", async () => {
    // Arrange
    const client = newClient();
    const me = await client.users.me();

    // Act
    const got = await client.users.get(me.id);

    // Assert
    expect(got.id).toBe(me.id);
    expect(got.username).toBe(me.username);
  });

  it("create registers a user", async () => {
    // Arrange
    const client = newClient();
    const username = uniqueName("user");

    // Act
    const user = await client.users.create({ name: "Test User", username, password: uniqueName("password") });
    cleanup(() => client.users.delete(user.id));

    // Assert
    expect(user.id).toBeGreaterThan(0);
    expect(user.username).toBe(username);
  });

  it("list includes other users for the admin", async () => {
    // Arrange
    const client = newClient();
    const { user } = await createTestUser(client);

    // Act
    const users = await client.users.list();

    // Assert
    expect(users.map((u) => u.id)).toContain(user.id);
  });

  it("delete removes the user", async () => {
    // Arrange
    const client = newClient();
    const { user } = await createTestUser(client);

    // Act
    await client.users.delete(user.id);

    // Assert
    expect((await client.users.list()).map((u) => u.id)).not.toContain(user.id);
  });

  it("update changes the given fields and keeps the username", async () => {
    // Arrange
    const client = newClient();
    const { user, password } = await createTestUser(client);
    const asUser = await signInAs(user, password);

    // Act
    const updated = await asUser.users.update(user.id, { name: "Renamed User", preventDuplicateLinks: true });

    // Assert
    expect(updated.name).toBe("Renamed User");
    const got = await asUser.users.me();
    expect(got.name).toBe("Renamed User");
    expect(got.username).toBe(user.username);
    expect(got.preventDuplicateLinks).toBe(true);
  });

  it("updatePreferences changes the reading preferences", async () => {
    // Arrange
    const client = newClient();
    const { user, password } = await createTestUser(client);
    const asUser = await signInAs(user, password);

    // Act
    const prefs = await asUser.users.updatePreferences(user.id, {
      theme: "light",
      readableFontSize: "18px",
      shareUsageAnalytics: false,
    });

    // Assert
    expect(prefs.theme).toBe("light");
    expect(prefs.readableFontSize).toBe("18px");
    expect(prefs.shareUsageAnalytics).toBe(false);
  });
});
