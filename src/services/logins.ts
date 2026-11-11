import { decodeJson, type RequestOptions, type Transport } from "../http.ts";

/** One SSO provider offered on the login page. */
export type ButtonAuth = {
  method: string;
  name: string;
};

/**
 * The sign-in methods a Linkwarden instance offers. The flags are documented as
 * nullable strings (`"true"` / `"false"`), so they're passed through as-is.
 */
export type LoginConfig = {
  credentialsEnabled: string | null;
  emailEnabled: string | null;
  registrationDisabled: string | null;
  buttonAuths: ButtonAuth[];
};

/** Accesses the `/api/v1/logins` endpoint. */
export class LoginsService {
  public constructor(private readonly transport: Transport) {}

  /** Returns the instance's login configuration. It doesn't require authentication. */
  public async get(options?: RequestOptions): Promise<LoginConfig> {
    const res = await this.transport.request({ method: "GET", path: "/api/v1/logins", signal: options?.signal });

    // Unlike most endpoints, the response isn't wrapped in an envelope.
    return decodeJson<LoginConfig>(res.body);
  }
}
