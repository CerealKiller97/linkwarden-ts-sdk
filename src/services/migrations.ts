import { decodeResponseEnvelope, decodeText, type RequestOptions, type Transport } from "../http.js";

/** The source format for `migrations.import`. */
export const ImportFormat = {
  LinkwardenJSON: 0,
  BookmarksHTML: 1,
  WallabagJSON: 2,
  OmnivoreJSON: 3,
  PocketJSON: 4,
} as const;

export type ImportFormat = (typeof ImportFormat)[keyof typeof ImportFormat];

/** Accesses the `/api/v1/migration` endpoints. */
export class MigrationsService {
  private readonly transport: Transport;

  public constructor(transport: Transport) {
    this.transport = transport;
  }

  /**
   * Returns the raw JSON export (user info, collections, links) as text, for writing
   * straight to a backup file.
   */
  public async export(options?: RequestOptions): Promise<string> {
    const res = await this.transport.request({ method: "GET", path: "/api/v1/migration", signal: options?.signal });

    return decodeText(res.body);
  }

  /**
   * Uploads a raw import payload in the given format for background processing,
   * returning the API's status message.
   */
  public async import(format: ImportFormat, data: string, options?: RequestOptions): Promise<string> {
    const res = await this.transport.request({
      method: "POST",
      path: "/api/v1/migration",
      json: { format, data },
      signal: options?.signal,
    });

    return decodeResponseEnvelope<string>(res.body);
  }
}
