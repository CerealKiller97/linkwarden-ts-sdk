import { decodeResponseEnvelope, type RequestOptions, type Transport } from "../http.js";

/** How long a new API token stays valid, for `tokens.create`. */
export const TokenExpiry = {
  SevenDays: 0,
  OneMonth: 1,
  TwoMonths: 2,
  ThreeMonths: 3,
  Never: 4,
} as const;

export type TokenExpiry = (typeof TokenExpiry)[keyof typeof TokenExpiry];

/** An API token, as returned by `tokens.list`. */
export type Token = {
  id: number;
  name: string;
  isSession: boolean;
  expires: string;
  createdAt: string;
};

/** The stored record of an API token. Use `CreatedToken.secretKey`, not `token`, to authenticate. */
export type TokenDetail = {
  id: number;
  name: string;
  userId: number;
  token: string;
  revoked: boolean;
  isSession: boolean;
  expires: string;
  lastUsedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Returned by `tokens.create`. `secretKey` is the bearer token, and is only returned once. */
export type CreatedToken = {
  secretKey: string;
  token: TokenDetail;
};

/** The payload for `tokens.create`. */
export type CreateTokenRequest = {
  name: string;
  /** One of {@link TokenExpiry}; it's sent to the API as-is. */
  expires: TokenExpiry;
};

/** Accesses the `/api/v1/tokens` endpoints. */
export class TokensService {
  public constructor(private readonly transport: Transport) {}

  /** Returns the authenticated user's API tokens, without their secrets. */
  public async list(options?: RequestOptions): Promise<Token[]> {
    const res = await this.transport.request({ method: "GET", path: "/api/v1/tokens", signal: options?.signal });

    return decodeResponseEnvelope<Token[] | null>(res.body) ?? [];
  }

  /** Creates a new API token. Store `secretKey` right away: it's never returned again. */
  public async create(req: CreateTokenRequest, options?: RequestOptions): Promise<CreatedToken> {
    const res = await this.transport.request({
      method: "POST",
      path: "/api/v1/tokens",
      json: req,
      signal: options?.signal,
    });

    return decodeResponseEnvelope<CreatedToken>(res.body);
  }

  /** Revokes the API token with the given ID. Requests made with it fail from then on. */
  public async revoke(id: number, options?: RequestOptions): Promise<void> {
    await this.transport.request({
      method: "DELETE",
      path: `/api/v1/tokens/${id}`,
      signal: options?.signal,
    });
  }
}
