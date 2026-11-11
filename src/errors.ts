/**
 * Machine-readable error codes Linkwarden sends in {@link LinkwardenApiError.code}.
 */
export const ErrorCode = {
  /**
   * The credentials are right but the account's email isn't verified. Linkwarden
   * emails a code to send back in `CreateSessionRequest.code`.
   */
  EmailNotVerified: "EMAIL_NOT_VERIFIED",
  /** The email verification code is wrong or has expired. */
  InvalidVerificationCode: "INVALID_VERIFICATION_CODE",
  /**
   * Too many wrong passwords for the account. Wait
   * {@link LinkwardenApiError.retryAfterSeconds} before trying again.
   */
  TooManyAttempts: "TOO_MANY_ATTEMPTS",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Base class of every error the SDK throws itself: a failed request, a response it
 * couldn't decode, or a non-2xx answer ({@link LinkwardenApiError}). Aborted requests
 * are rethrown unchanged, so `err.name === "AbortError"` still works.
 */
export class LinkwardenError extends Error {
  public override name = "LinkwardenError";
}

export type LinkwardenApiErrorInit = {
  status: number;
  rawBody: string;
  retryAfterHeader?: string | null;
};

/** A non-2xx response from the Linkwarden API. */
export class LinkwardenApiError extends LinkwardenError {
  public override name = "LinkwardenApiError";
  /** The HTTP status code. */
  public readonly status: number;
  /** The API's own message, without the `linkwarden: <status>` prefix of `message`. */
  public readonly apiMessage: string;
  /**
   * The machine-readable error code, when the API sends one (see {@link ErrorCode}).
   * It's `undefined` for most errors.
   */
  public readonly code: string | undefined;
  /**
   * How long to wait before retrying, from the `Retry-After` header of a 429
   * response. It's 0 when the response has none.
   */
  public readonly retryAfterSeconds: number;
  /** The raw response body. */
  public readonly rawBody: string;

  public constructor(init: LinkwardenApiErrorInit) {
    const parsed = parseErrorBody(init.rawBody);
    const apiMessage = parsed.message || statusText(init.status);
    super(`linkwarden: ${init.status} ${apiMessage}`);

    this.status = init.status;
    this.apiMessage = apiMessage;
    this.code = parsed.code;
    this.retryAfterSeconds = parseRetryAfter(init.retryAfterHeader);
    this.rawBody = init.rawBody;
  }
}

/** Reports whether `err` is a {@link LinkwardenApiError}. */
export function isApiError(err: unknown): err is LinkwardenApiError {
  return err instanceof LinkwardenApiError;
}

/** Reports whether `err` is a {@link LinkwardenApiError} with a 404 status. */
export function isNotFound(err: unknown): err is LinkwardenApiError {
  return isApiError(err) && err.status === 404;
}

/** Reports whether `err` is a {@link LinkwardenApiError} with a 409 status. */
export function isConflict(err: unknown): err is LinkwardenApiError {
  return isApiError(err) && err.status === 409;
}

/**
 * Reports whether `err` is a {@link LinkwardenApiError} with a 429 status, such as
 * `session.create` after too many wrong passwords.
 * {@link LinkwardenApiError.retryAfterSeconds} says how long to wait.
 */
export function isTooManyRequests(err: unknown): err is LinkwardenApiError {
  return isApiError(err) && err.status === 429;
}

/**
 * Reads a `Retry-After` header given in seconds, which is the form Linkwarden
 * sends. Anything else is treated as absent (0).
 */
export function parseRetryAfter(value: string | null | undefined): number {
  if (!value || !/^\+?\d+$/.test(value.trim())) {
    return 0;
  }

  return Number.parseInt(value, 10);
}

function parseErrorBody(raw: string): { message: string; code: string | undefined } {
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return {
      message: "",
      code: undefined
    };
  }

  if (typeof body !== "object" || body === null) {
    return {
      message: "",
      code: undefined
    };
  }

  const record = body as Record<string, unknown>;
  const code = typeof record["code"] === "string" && record["code"] !== "" ? record["code"] : undefined;

  for (const key of ["message", "response"]) {
    const value = record[key];
    if (typeof value === "string" && value !== "") {
      return {
        message: value,
        code
      };
    }
  }

  return {
    message: "",
    code
  };
}

const STATUS_TEXT: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  405: "Method Not Allowed",
  409: "Conflict",
  413: "Payload Too Large",
  415: "Unsupported Media Type",
  422: "Unprocessable Entity",
  429: "Too Many Requests",
  500: "Internal Server Error",
  501: "Not Implemented",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout",
};

function statusText(status: number): string {
  return STATUS_TEXT[status] ?? `HTTP ${status}`;
}
