import { expect, it } from "vitest";
import { describeE2E, newAnonymousClient, uniqueName } from "./helpers.js";

describeE2E("AuthService", () => {
  it("forgotPassword succeeds for an unknown email", async () => {
    // Arrange
    const client = newAnonymousClient();

    // Act
    const message = await client.auth.forgotPassword(`${uniqueName("nobody")}@example.com`);

    // Assert
    // Since v2.17 the answer doesn't reveal whether an account has that email.
    expect(message).not.toBe("");
  });

  // The test instance has no email provider and no reset tokens, so each call is
  // rejected; this checks the requests reach the right endpoints and decode errors.
  it.each([
    {
      name: "resetPassword",
      call: () =>
        newAnonymousClient().auth.resetPassword({ token: "invalid-token", password: "a-long-enough-password" }),
    },
    {
      name: "requestVerificationEmail",
      call: () => newAnonymousClient().auth.requestVerificationEmail(`${uniqueName("nobody")}@example.com`),
    },
    {
      name: "verifyEmail",
      call: () => newAnonymousClient().auth.verifyEmail("invalid-token"),
    },
  ])("$name rejects invalid input with a 400", async ({ call }) => {
    // Arrange
    // Act
    const result = call();

    // Assert
    await expect(result).rejects.toMatchObject({
      name: "LinkwardenApiError",
      status: 400,
      apiMessage: expect.stringMatching(/.+/) as string,
    });
  });
});
