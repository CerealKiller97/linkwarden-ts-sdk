import { type BinaryFile, binaryFile, Query, type RequestOptions, type Transport } from "../http.js";

/** Accesses the `/api/v1/getFavicon` endpoint. */
export class FaviconService {
  private readonly transport: Transport;

  public constructor(transport: Transport) {
    this.transport = transport;
  }

  /** Downloads the favicon of the site at `url`, fetched by the Linkwarden server. */
  public async get(url: string, options?: RequestOptions): Promise<BinaryFile> {
    const res = await this.transport.request({
      method: "GET",
      path: "/api/v1/getFavicon",
      query: new Query().set("url", url).params,
      signal: options?.signal,
    });

    return binaryFile(res);
  }
}
