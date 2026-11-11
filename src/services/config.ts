import { decodeResponseEnvelope, type RequestOptions, type Transport } from "../http.ts";

/**
 * The publicly readable runtime configuration of a Linkwarden instance. Every field
 * is nullable, and instances may send more than these.
 */
export type PublicConfig = {
  DISABLE_REGISTRATION?: boolean | null;
  ADMIN?: number | null;
  RSS_POLLING_INTERVAL_MINUTES?: number | null;
  EMAIL_PROVIDER?: boolean | null;
  MAX_FILE_BUFFER?: number | null;
  USER_CONTENT_DOMAIN?: string | null;
  AI_ENABLED?: boolean | null;
  INSTANCE_VERSION?: string | null;
};

/** Accesses the `/api/v1/config` endpoint. */
export class ConfigService {
  public constructor(private readonly transport: Transport) {}

  /** Returns the instance's public configuration. It doesn't require authentication. */
  public async get(options?: RequestOptions): Promise<PublicConfig> {
    const res = await this.transport.request({ method: "GET", path: "/api/v1/config", signal: options?.signal });

    return decodeResponseEnvelope<PublicConfig>(res.body);
  }
}
