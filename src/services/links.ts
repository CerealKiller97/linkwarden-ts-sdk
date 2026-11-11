import { decodeDataEnvelope, decodeResponseEnvelope, Query, type RequestOptions, type Transport } from "../http.ts";
import { normalizeLink, normalizeLinks } from "../normalize.ts";
import type { Highlight, Link, PinnedBy, Sort, TagInput } from "../types.ts";
import type { CollectionsService } from "./collections.ts";

/** The payload for `links.create`. */
export type CreateLinkRequest = {
  url: string;
  /** Left out, Linkwarden uses the page title. */
  name?: string;
  type?: string;
  description?: string;
  tags?: TagInput[];
  /** The collection to save into. Left out, the link goes to "Unorganized". */
  collection?: { id?: number; name?: string; ownerId?: number };
};

/** The payload for `links.update`. Fields left out keep their current value. */
export type UpdateLinkRequest = {
  name?: string;
  url?: string;
  description?: string;
  icon?: string;
  iconWeight?: string;
  color?: string;
  /** Replaces the link's tags when set. */
  tags?: TagInput[];
  /** Moves the link to this collection. `ownerId` is looked up when left out. */
  collection?: { id: number; ownerId?: number };
  /** Replaces the users the link is pinned by when set. */
  pinnedBy?: PinnedBy[];
};

/** Filters and paginates `links.list`. */
export type ListLinksOptions = {
  /** One of {@link Sort}. Left out, the API picks its default. */
  sort?: Sort;
  /** The ID of the last link of the previous page. */
  cursor?: number;
  collectionId?: number;
  tagId?: number;
  pinnedOnly?: boolean;
  searchQueryString?: string;
};

/** The payload for `links.bulkUpdate`. */
export type BulkUpdateLinksRequest = {
  /** The links to update. Passing them as returned by the API is safest. */
  links: Array<{ id: number } & Partial<Link>>;
  /** Replaces the links' tags with `newData.tags` instead of adding to them. */
  removePreviousTags?: boolean;
  newData?: BulkUpdateLinksNewData;
};

/** The changes `links.bulkUpdate` applies to each link. */
export type BulkUpdateLinksNewData = {
  /** Moves the links to this collection. Left out, they stay where they are. */
  collectionId?: number;
  tags?: TagInput[];
};

/** The payload for `links.reorder`. */
export type ReorderLinkRequest = {
  /**
   * The link the moved one should end up directly below, in the same collection.
   * Left out, the link moves to the top of its collection.
   */
  beforeId?: number;
};

type SearchData = { links?: Link[]; nextCursor?: number | null } | unknown[];

/** Reads the links out of a `/api/v1/search` response, which sends `"data": []` when nothing matches. */
export function decodeSearchLinks(body: Uint8Array): Link[] {
  const data = decodeDataEnvelope<SearchData | null>(body);
  if (!data || Array.isArray(data)) {
    return [];
  }

  return normalizeLinks(data.links);
}

/** Accesses the `/api/v1/links` endpoints. */
export class LinksService {
  public constructor(
    private readonly transport: Transport,
    private readonly collections: CollectionsService,
  ) {}

  /**
   * Returns one page of links matching `opts`. To get the next page, set
   * `opts.cursor` to the ID of the last link returned.
   *
   * It calls `GET /api/v1/search`, which takes the same filters: newer Linkwarden
   * versions, including Linkwarden Cloud, reject `GET /api/v1/links` as deprecated.
   */
  public async list(opts: ListLinksOptions = {}, options?: RequestOptions): Promise<Link[]> {
    const query = new Query()
      .optional("sort", opts.sort)
      .positive("cursor", opts.cursor)
      .positive("collectionId", opts.collectionId)
      .positive("tagId", opts.tagId)
      .flag("pinnedOnly", opts.pinnedOnly)
      .nonEmpty("searchQueryString", opts.searchQueryString);

    const res = await this.transport.request({
      method: "GET",
      path: "/api/v1/search",
      query: query.params,
      signal: options?.signal,
    });

    return decodeSearchLinks(res.body);
  }

  /** Returns the link with the given ID. */
  public async get(id: number, options?: RequestOptions): Promise<Link> {
    const res = await this.transport.request({
      method: "GET",
      path: `/api/v1/links/${id}`,
      signal: options?.signal,
    });

    return normalizeLink(decodeResponseEnvelope<Link>(res.body));
  }

  /**
   * Saves a new link. Set `req.collection.id` to choose its collection; tags are
   * matched by name and created if they don't exist yet.
   */
  public async create(req: CreateLinkRequest, options?: RequestOptions): Promise<Link> {
    const res = await this.transport.request({
      method: "POST",
      path: "/api/v1/links",
      json: { ...req, name: req.name ?? "", collection: req.collection ?? {} },
      signal: options?.signal,
    });

    return normalizeLink(decodeResponseEnvelope<Link>(res.body));
  }

  /**
   * Changes the fields set in `req` and keeps the rest. The API replaces the whole
   * link (it requires its collection and full tag list), so this first fetches the
   * link and fills every unset field from it.
   */
  public async update(id: number, req: UpdateLinkRequest, options?: RequestOptions): Promise<Link> {
    const current = await this.get(id, options);

    let collection = { id: current.collection?.id ?? current.collectionId, ownerId: current.collection?.ownerId };
    if (req.collection && req.collection.id !== collection.id) {
      const ownerId = req.collection.ownerId ?? (await this.collections.get(req.collection.id, options)).ownerId;
      collection = { id: req.collection.id, ownerId };
    }

    const payload = {
      id: current.id,
      name: req.name ?? current.name,
      url: req.url ?? current.url,
      description: req.description ?? current.description,
      icon: req.icon ?? current.icon ?? undefined,
      iconWeight: req.iconWeight ?? current.iconWeight ?? undefined,
      color: req.color ?? current.color ?? undefined,
      collection,
      tags: (req.tags ?? current.tags ?? []).map((tag) => ({ id: tag.id, name: tag.name })),
      pinnedBy: req.pinnedBy ?? current.pinnedBy,
    };

    const res = await this.transport.request({
      method: "PUT",
      path: `/api/v1/links/${id}`,
      json: payload,
      signal: options?.signal,
    });

    return normalizeLink(decodeResponseEnvelope<Link>(res.body));
  }

  /** Deletes the link with the given ID. */
  public async delete(id: number, options?: RequestOptions): Promise<void> {
    await this.transport.request({
      method: "DELETE",
      path: `/api/v1/links/${id}`,
      signal: options?.signal,
    });
  }

  /**
   * Applies `req.newData` to every link in `req.links`: it can move them to another
   * collection and add tags. Set `req.removePreviousTags` to replace the links' tags
   * instead of adding to them.
   */
  public async bulkUpdate(req: BulkUpdateLinksRequest, options?: RequestOptions): Promise<void> {
    await this.transport.request({
      method: "PUT",
      path: "/api/v1/links",
      json: req,
      signal: options?.signal,
    });
  }

  /** Deletes the links with the given IDs. */
  public async bulkDelete(ids: number[], options?: RequestOptions): Promise<void> {
    await this.transport.request({
      method: "DELETE",
      path: "/api/v1/links",
      json: { linkIds: ids },
      signal: options?.signal,
    });
  }

  /**
   * Asks the server to archive the link again. It returns once the request is
   * accepted, not when the new archive is ready.
   */
  public async archive(id: number, options?: RequestOptions): Promise<void> {
    await this.transport.request({
      method: "PUT",
      path: `/api/v1/links/${id}/archive`,
      signal: options?.signal,
    });
  }

  /** Deletes the archived files of the links with the given IDs. The links are kept. */
  public async deleteArchive(ids: number[], options?: RequestOptions): Promise<void> {
    await this.transport.request({
      method: "DELETE",
      path: "/api/v1/links/archive",
      json: { linkIds: ids },
      signal: options?.signal,
    });
  }

  /**
   * Moves the link within its collection's custom order (see `Sort.Custom`) and
   * returns the updated link. It needs permission to update links in that
   * collection. Requires Linkwarden v2.17 or later.
   */
  public async reorder(id: number, req: ReorderLinkRequest = {}, options?: RequestOptions): Promise<Link> {
    const res = await this.transport.request({
      method: "PUT",
      path: `/api/v1/links/${id}/order`,
      json: req,
      signal: options?.signal,
    });

    return normalizeLink(decodeResponseEnvelope<Link>(res.body));
  }

  /** Returns the highlights on the link with the given ID. */
  public async highlights(linkId: number, options?: RequestOptions): Promise<Highlight[]> {
    const res = await this.transport.request({
      method: "GET",
      path: `/api/v1/links/${linkId}/highlights`,
      signal: options?.signal,
    });

    return decodeResponseEnvelope<Highlight[] | null>(res.body) ?? [];
  }
}
