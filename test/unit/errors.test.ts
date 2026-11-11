import { describe, expect, it } from "vitest";
import {
  ErrorCode,
  isConflict,
  isNotFound,
  isTooManyRequests,
  LinkwardenApiError,
  LinkwardenError,
} from "../../src/index.js";
import { parseRetryAfter } from "../../src/errors.js";

describe("LinkwardenApiError", () => {
  it("reads the message field", () => {
    // Arrange
    // Act
    const err = new LinkwardenApiError({ status: 400, rawBody: '{"message":"Bad input."}' });

    // Assert
    expect(err.apiMessage).toBe("Bad input.");
    expect(err.message).toBe("linkwarden: 400 Bad input.");
    expect(err).toBeInstanceOf(LinkwardenError);
    expect(err.name).toBe("LinkwardenApiError");
  });

  it("reads the response field", () => {
    // Arrange
    // Act
    const err = new LinkwardenApiError({ status: 404, rawBody: '{"response":"Tag not found."}' });

    // Assert
    expect(err.apiMessage).toBe("Tag not found.");
    expect(isNotFound(err)).toBe(true);
    expect(isConflict(err)).toBe(false);
  });

  it("falls back to the status text", () => {
    // Arrange
    // Act
    const err = new LinkwardenApiError({ status: 500, rawBody: "Internal Server Error" });

    // Assert
    expect(err.apiMessage).toBe("Internal Server Error");
    expect(err.code).toBeUndefined();
  });

  it("reads the code and Retry-After header", () => {
    // Arrange
    // Act
    const err = new LinkwardenApiError({
      status: 429,
      rawBody: '{"response":"Too many incorrect passwords.","code":"TOO_MANY_ATTEMPTS"}',
      retryAfterHeader: "25",
    });

    // Assert
    expect(err.apiMessage).toBe("Too many incorrect passwords.");
    expect(err.code).toBe(ErrorCode.TooManyAttempts);
    expect(err.retryAfterSeconds).toBe(25);
    expect(isTooManyRequests(err)).toBe(true);
  });

  it("is not matched by the helpers when it isn't an API error", () => {
    // Arrange
    const err = new Error("boom");

    // Act
    // Assert
    expect(isNotFound(err)).toBe(false);
    expect(isConflict(undefined)).toBe(false);
  });
});

describe("parseRetryAfter", () => {
  it.each([
    { name: "seconds", header: "25", want: 25 },
    { name: "missing", header: null, want: 0 },
    { name: "HTTP date", header: "Wed, 21 Oct 2015 07:28:00 GMT", want: 0 },
    { name: "negative", header: "-1", want: 0 },
  ])("parses $name", ({ header, want }) => {
    // Arrange
    // Act
    const got = parseRetryAfter(header);

    // Assert
    expect(got).toBe(want);
  });
});
