import { decodeResponseEnvelope, type RequestOptions, type Transport } from "../http.ts";

/**
 * A Linkwarden user account. The endpoints return different subsets of these
 * fields. `subscription`, `parentSubscription` and `dashboardSections` are passed
 * through untyped since their shapes aren't part of the published API schema.
 */
export type User = {
  id: number;
  uuid?: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  emailVerified?: string | null;
  unverifiedNewEmail?: string | null;
  image?: string | null;
  locale?: string;
  collectionOrder?: number[];
  /** `"ORIGINAL"` or `"CUSTOM"`. */
  linksRouteTo?: string;
  preventDuplicateLinks?: boolean;
  archiveAsScreenshot?: boolean;
  archiveAsMonolith?: boolean;
  archiveAsPDF?: boolean;
  archiveAsReadable?: boolean;
  archiveAsWaybackMachine?: boolean;
  isPrivate?: boolean;
  /**
   * Whether Linkwarden Cloud records usage analytics for the account. Self-hosted
   * instances don't record any. Linkwarden v2.17 or later.
   */
  shareUsageAnalytics?: boolean;
  referredBy?: string | null;
  whitelistedUsers?: string[];
  hasUnIndexedLinks?: boolean;
  createdAt?: string;
  updatedAt?: string;
  dashboardSections?: unknown;
  subscription?: unknown;
  parentSubscription?: unknown;
};

/**
 * The payload for `users.create`. Whether `email` or `username` is required depends
 * on the instance's configuration.
 */
export type CreateUserRequest = {
  name?: string;
  username?: string;
  email?: string;
  password?: string;
  invite?: boolean;
};

/** The payload for `users.update`. Fields left out are unchanged. */
export type UpdateUserRequest = {
  name?: string;
  email?: string;
  username?: string;
  image?: string;
  /** The current password, required to change the email. */
  password?: string;
  newPassword?: string;
  oldPassword?: string;
  archiveAsScreenshot?: boolean;
  archiveAsPDF?: boolean;
  archiveAsMonolith?: boolean;
  archiveAsWaybackMachine?: boolean;
  locale?: string;
  /** @deprecated Linkwarden v2.17 and later ignore it. */
  isPrivate?: boolean;
  preventDuplicateLinks?: boolean;
  collectionOrder?: number[];
  /** `"ORIGINAL"` or `"CUSTOM"`. */
  linksRouteTo?: "ORIGINAL" | "CUSTOM";
  whitelistedUsers?: string[];
  referredBy?: string;
};

/** A user's reading and theme preferences. */
export type UserPreferences = {
  id: number;
  /** `"dark"`, `"light"` or `"auto"`. */
  theme: string;
  readableFontFamily: string;
  readableFontSize: string;
  readableLineHeight: string;
  readableLineWidth: string;
  /** Linkwarden v2.17 or later. */
  shareUsageAnalytics?: boolean;
};

/** The payload for `users.updatePreferences`. Fields left out are unchanged. */
export type UpdateUserPreferencesRequest = Partial<Omit<UserPreferences, "id" | "theme">> & {
  theme?: "dark" | "light" | "auto";
};

/** Accesses the `/api/v1/users` endpoints. */
export class UsersService {
  private readonly transport: Transport;

  public constructor(transport: Transport) {
    this.transport = transport;
  }

  /** Returns the users on the instance that the authenticated user can see. */
  public async list(options?: RequestOptions): Promise<User[]> {
    const res = await this.transport.request({ method: "GET", path: "/api/v1/users", signal: options?.signal });

    return decodeResponseEnvelope<User[] | null>(res.body) ?? [];
  }

  /** Registers a new user. It doesn't require authentication unless the instance restricts registration. */
  public async create(req: CreateUserRequest, options?: RequestOptions): Promise<User> {
    const res = await this.transport.request({
      method: "POST",
      path: "/api/v1/users",
      json: req,
      signal: options?.signal,
    });

    return decodeResponseEnvelope<User>(res.body);
  }

  /** Returns the authenticated user. */
  public async me(options?: RequestOptions): Promise<User> {
    const res = await this.transport.request({ method: "GET", path: "/api/v1/users/me", signal: options?.signal });

    return decodeResponseEnvelope<User>(res.body);
  }

  /**
   * Returns a user's account data. Linkwarden answers with the authenticated user
   * whatever the ID, so this is only useful with the caller's own ID (see `me`).
   */
  public async get(id: number, options?: RequestOptions): Promise<User> {
    const res = await this.transport.request({ method: "GET", path: `/api/v1/users/${id}`, signal: options?.signal });

    return decodeResponseEnvelope<User>(res.body);
  }

  /**
   * Changes the fields set in `req` and keeps the rest. The API applies the update
   * to the authenticated user and requires a username, so when `req.username` is
   * left out this sends the user's current one.
   *
   * Since Linkwarden v2.17, changing the password signs the user out everywhere else
   * and revokes their access tokens, and a wrong `password` or `oldPassword` counts
   * toward the same wrong-password limit as `session.create`.
   */
  public async update(id: number, req: UpdateUserRequest, options?: RequestOptions): Promise<User> {
    const username = req.username ?? (await this.me(options)).username;

    const res = await this.transport.request({
      method: "PUT",
      path: `/api/v1/users/${id}`,
      json: { ...req, username },
      signal: options?.signal,
    });

    return decodeResponseEnvelope<User>(res.body);
  }

  /** Deletes a user account and all its data. */
  public async delete(id: number, options?: RequestOptions): Promise<void> {
    await this.transport.request({ method: "DELETE", path: `/api/v1/users/${id}`, signal: options?.signal });
  }

  /** Changes the reading and theme preferences of the user with the given ID and returns the result. */
  public async updatePreferences(
    id: number,
    prefs: UpdateUserPreferencesRequest,
    options?: RequestOptions,
  ): Promise<UserPreferences> {
    const { id: _ignored, ...payload } = prefs as UpdateUserPreferencesRequest & { id?: number };

    const res = await this.transport.request({
      method: "PUT",
      path: `/api/v1/users/${id}/preference`,
      json: payload,
      signal: options?.signal,
    });

    return decodeResponseEnvelope<UserPreferences>(res.body);
  }
}
