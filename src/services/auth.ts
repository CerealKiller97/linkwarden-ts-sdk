import { decodeResponseEnvelope, Query, type RequestOptions, type Transport } from "../http.ts";

/** The payload for `auth.resetPassword`. */
export type ResetPasswordRequest = {
  /** The reset token from the `forgotPassword` email. */
  token: string;
  /** At least 8 characters. */
  password: string;
};

/** Accesses the unauthenticated `/api/v1/auth` endpoints. Each call returns the API's status message. */
export class AuthService {
  private readonly transport: Transport;

  public constructor(transport: Transport) {
    this.transport = transport;
  }

  /**
   * Sends a password reset email. Since Linkwarden v2.17 it succeeds whether or not
   * an account has that email, so the answer doesn't reveal which are registered.
   */
  public async forgotPassword(email: string, options?: RequestOptions): Promise<string> {
    return this.post("/api/v1/auth/forgot-password", { email }, options);
  }

  /** Sets a new password using a reset token from the `forgotPassword` email. */
  public async resetPassword(req: ResetPasswordRequest, options?: RequestOptions): Promise<string> {
    return this.post("/api/v1/auth/reset-password", req, options);
  }

  /**
   * Emails a 6-digit verification code to the unverified account with the given
   * email or username. Sign in with that code in `CreateSessionRequest.code`. It
   * fails with a 400 when the instance has no email server or the email is already
   * verified.
   */
  public async requestVerificationEmail(emailOrUsername: string, options?: RequestOptions): Promise<string> {
    return this.post("/api/v1/auth/request-verification-email", { email: emailOrUsername }, options);
  }

  /**
   * Confirms a new email address after an email change, using the token from the
   * verification email.
   */
  public async verifyEmail(token: string, options?: RequestOptions): Promise<string> {
    const res = await this.transport.request({
      method: "POST",
      path: "/api/v1/auth/verify-email",
      query: new Query().set("token", token).params,
      signal: options?.signal,
    });

    return decodeResponseEnvelope<string>(res.body);
  }

  private async post(path: string, json: unknown, options: RequestOptions | undefined): Promise<string> {
    const res = await this.transport.request({ method: "POST", path, json, signal: options?.signal });

    return decodeResponseEnvelope<string>(res.body);
  }
}
