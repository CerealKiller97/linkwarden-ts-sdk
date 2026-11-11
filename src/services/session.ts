import { decodeResponseEnvelope, type RequestOptions, type Transport } from "../http.js";

/** The payload for `session.create`. */
export type CreateSessionRequest = {
  username: string;
  password: string;
  /**
   * The 6-digit code emailed to a user whose email isn't verified yet (see
   * `auth.requestVerificationEmail`). Sent with the password, it verifies the email
   * and signs in. A wrong or expired code fails with a 400 whose code is
   * `ErrorCode.InvalidVerificationCode`. Linkwarden v2.17 or later.
   */
  code?: string;
  sessionName?: string;
};

/** Accesses the `/api/v1/session` endpoint. */
export class SessionService {
  private readonly transport: Transport;

  public constructor(transport: Transport) {
    this.transport = transport;
  }

  /**
   * Signs in with a username and password, returning a session token usable as the
   * client's bearer token.
   *
   * When the account's email isn't verified yet, it fails with a 401 whose code is
   * `ErrorCode.EmailNotVerified` and Linkwarden emails a verification code; call
   * `create` again with that code. After too many wrong passwords it fails with a 429
   * whose code is `ErrorCode.TooManyAttempts` and whose `retryAfterSeconds` says how
   * long to wait.
   */
  public async create(req: CreateSessionRequest, options?: RequestOptions): Promise<string> {
    const res = await this.transport.request({
      method: "POST",
      path: "/api/v1/session",
      json: req,
      signal: options?.signal,
    });

    return decodeResponseEnvelope<{ token: string }>(res.body).token;
  }

  /**
   * Signs out: revokes the session token the client was created with. It only works
   * for session tokens from `create` (or a mobile sign-in). An API token fails with a
   * 404 and stays valid; revoke it with `tokens.revoke`. Linkwarden v2.17 or later.
   */
  public async delete(options?: RequestOptions): Promise<void> {
    await this.transport.request({ method: "DELETE", path: "/api/v1/session", signal: options?.signal });
  }
}

