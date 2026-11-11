import { decodeDataEnvelope, decodeResponseEnvelope, Query, type RequestOptions, type Transport } from "../http.ts";
import { normalizeLink, normalizeLinks } from "../normalize.ts";
import type { Collection, Link, Sort, Tag } from "../types.ts";

/** The public profile of a user, as returned by `public.user`. */
export type PublicUser = {
  id: number;
  name: string;
  username: string;
  email?: string | null;
  image?: string | null;
  archiveAsScreenshot: boolean;
  archiveAsMonolith: boolean;
  archiveAsPDF: boolean;
};

/** Filters and paginates `public.collectionLinks`. */
export type ListPublicLinksOptions = {
  /** One of {@link Sort}. Left out, the API picks its default. */
  sort?: Sort;
  cursor?: number;
  pinnedOnly?: boolean;
  searchQueryString?: string;
  /** The `searchBy*` flags narrow which fields `searchQueryString` matches. */
  searchByName?: boolean;
  searchByUrl?: boolean;
  searchByDescription?: boolean;
  searchByTextContent?: boolean;
  searchByTags?: boolean;
};

/**
 * Accesses the unauthenticated `/api/v1/public` endpoints, which only return data
 * from public collections.
 */
export class PublicService {
  private readonly transport: Transport;

  public constructor(transport: Transport) {
    this.transport = transport;
  }

  /** Returns a public collection. */
  public async collection(id: number, options?: RequestOptions): Promise<Collection> {
    const res = await this.transport.request({
      method: "GET",
      path: `/api/v1/public/collections/${id}`,
      signal: options?.signal,
    });

    return decodeResponseEnvelope<Collection>(res.body);
  }

  /** Returns one page of links in a public collection. */
  public async collectionLinks(
    collectionId: number,
    opts: ListPublicLinksOptions = {},
    options?: RequestOptions,
  ): Promise<Link[]> {
    const query = new Query()
      .set("collectionId", collectionId)
      .optional("sort", opts.sort)
      .positive("cursor", opts.cursor)
      .nonEmpty("searchQueryString", opts.searchQueryString)
      .flag("pinnedOnly", opts.pinnedOnly)
      .flag("searchByName", opts.searchByName)
      .flag("searchByUrl", opts.searchByUrl)
      .flag("searchByDescription", opts.searchByDescription)
      .flag("searchByTextContent", opts.searchByTextContent)
      .flag("searchByTags", opts.searchByTags);

    const res = await this.transport.request({
      method: "GET",
      path: "/api/v1/public/collections/links",
      query: query.params,
      signal: options?.signal,
    });

    return normalizeLinks(decodeDataEnvelope<{ links?: Link[] } | null>(res.body)?.links);
  }

  /** Returns the tags used in a public collection. */
  public async collectionTags(collectionId: number, options?: RequestOptions): Promise<Tag[]> {
    const res = await this.transport.request({
      method: "GET",
      path: "/api/v1/public/collections/tags",
      query: new Query().set("collectionId", collectionId).params,
      signal: options?.signal,
    });

    return decodeDataEnvelope<{ tags?: Tag[] } | null>(res.body)?.tags ?? [];
  }

  /** Returns a link from a public collection. */
  public async link(id: number, options?: RequestOptions): Promise<Link> {
    const res = await this.transport.request({
      method: "GET",
      path: `/api/v1/public/links/${id}`,
      signal: options?.signal,
    });

    return normalizeLink(decodeResponseEnvelope<Link>(res.body));
  }

  /** Returns a user's public profile. */
  public async user(id: number, options?: RequestOptions): Promise<PublicUser> {
    const res = await this.transport.request({
      method: "GET",
      path: `/api/v1/public/users/${id}`,
      signal: options?.signal,
    });

    return decodeResponseEnvelope<PublicUser>(res.body);
  }
}
