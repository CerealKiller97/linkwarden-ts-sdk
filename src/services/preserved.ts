import { decodeResponseEnvelope, Query, type RequestOptions, type Transport } from "../http.ts";
import type { ArchiveFormat } from "../types.ts";
import { type ArchiveFile, archiveFile } from "./archives.ts";

/** A short-lived signed URL for an archived format, as returned by `preserved.token`. */
export type PreservedFormatUrl = {
  url: string;
};

/** Options for `preserved.view`. */
export type ViewPreservedOptions = {
  /** Asks for the file as an attachment, which also populates `filename`. */
  download?: boolean;
};

/**
 * Accesses the `/api/v1/preserved` endpoints, which serve archived formats from the
 * instance's user content domain (`USER_CONTENT_DOMAIN`).
 */
export class PreservedService {
  private readonly transport: Transport;

  public constructor(transport: Transport) {
    this.transport = transport;
  }

  /** Returns a short-lived signed URL for loading an archived format of a link from the user content domain. */
  public async token(linkId: number, format: ArchiveFormat, options?: RequestOptions): Promise<PreservedFormatUrl> {
    const res = await this.transport.request({
      method: "GET",
      path: "/api/v1/preserved/token",
      query: new Query().set("linkId", linkId).set("format", format).params,
      signal: options?.signal,
    });

    return decodeResponseEnvelope<PreservedFormatUrl>(res.body);
  }

  /**
   * Downloads the archived format a signed token (from `token`) points at. The route
   * is only served on the user content domain, so the client must be constructed
   * with that domain as its base URL.
   */
  public async view(token: string, opts: ViewPreservedOptions = {}, options?: RequestOptions): Promise<ArchiveFile> {
    const res = await this.transport.request({
      method: "GET",
      path: "/api/v1/preserved/view",
      query: new Query().set("token", token).flag("download", opts.download, "1").params,
      signal: options?.signal,
    });

    return archiveFile(res);
  }
}
