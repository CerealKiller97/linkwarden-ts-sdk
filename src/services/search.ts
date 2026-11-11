import { Query, type RequestOptions, type Transport } from "../http.ts";
import type { Link, Sort } from "../types.ts";
import { decodeSearchLinks } from "./links.ts";

/** Filters and paginates `search.links`. */
export type SearchOptions = {
  searchQueryString?: string;
  /** One of {@link Sort}. Left out, the API picks its default. */
  sort?: Sort;
  /** The ID of the last link of the previous page. */
  cursor?: number;
};

/** Accesses the `/api/v1/search` endpoint. */
export class SearchService {
  private readonly transport: Transport;

  public constructor(transport: Transport) {
    this.transport = transport;
  }

  /**
   * Returns one page of links matching `opts.searchQueryString`, or an empty array.
   * New links reach the search index asynchronously, so a just-created link may not
   * be found straight away.
   */
  public async links(opts: SearchOptions = {}, options?: RequestOptions): Promise<Link[]> {
    const query = new Query()
      .nonEmpty("searchQueryString", opts.searchQueryString)
      .optional("sort", opts.sort)
      .positive("cursor", opts.cursor);

    const res = await this.transport.request({
      method: "GET",
      path: "/api/v1/search",
      query: query.params,
      signal: options?.signal,
    });

    return decodeSearchLinks(res.body);
  }
}
