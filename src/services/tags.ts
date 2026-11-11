import { decodeDataEnvelope, decodeResponseEnvelope, Query, type RequestOptions, type Transport } from "../http.ts";
import type { Sort, Tag } from "../types.ts";

/** Filters and paginates `tags.list`. */
export type ListTagsOptions = {
  sort?: Sort;
  /** The ID of the last tag of the previous page. */
  cursor?: number;
  /** Only returns tags whose name contains this text. */
  search?: string;
};

/**
 * One entry in a `tags.createOrUpdateBulk` request. Archive settings left out keep
 * the tag's (or the user's) defaults.
 */
export type TagUpsert = {
  label: string;
  archiveAsScreenshot?: boolean;
  archiveAsMonolith?: boolean;
  archiveAsPDF?: boolean;
  archiveAsReadable?: boolean;
  archiveAsWaybackMachine?: boolean;
  aiTag?: boolean;
};

/** Accesses the `/api/v1/tags` endpoints. */
export class TagsService {
  private readonly transport: Transport;

  public constructor(transport: Transport) {
    this.transport = transport;
  }

  /** Returns one page of the authenticated user's tags, with link counts. */
  public async list(opts: ListTagsOptions = {}, options?: RequestOptions): Promise<Tag[]> {
    const query = new Query()
      .optional("sort", opts.sort)
      .positive("cursor", opts.cursor)
      .nonEmpty("search", opts.search);

    const res = await this.transport.request({
      method: "GET",
      path: "/api/v1/tags",
      query: query.params,
      signal: options?.signal,
    });

    return decodeDataEnvelope<{ tags?: Tag[] } | null>(res.body)?.tags ?? [];
  }

  /** Returns the tag with the given ID. */
  public async get(id: number, options?: RequestOptions): Promise<Tag> {
    const res = await this.transport.request({
      method: "GET",
      path: `/api/v1/tags/${id}`,
      signal: options?.signal,
    });

    return decodeResponseEnvelope<Tag>(res.body);
  }

  /** Creates or updates the given tags, with their archive settings, and returns them. */
  public async createOrUpdateBulk(tags: TagUpsert[], options?: RequestOptions): Promise<Tag[]> {
    const res = await this.transport.request({
      method: "POST",
      path: "/api/v1/tags",
      json: { tags },
      signal: options?.signal,
    });

    return decodeResponseEnvelope<Tag[] | null>(res.body) ?? [];
  }

  /** Renames the tag with the given ID. */
  public async update(id: number, name: string, options?: RequestOptions): Promise<Tag> {
    const res = await this.transport.request({
      method: "PUT",
      path: `/api/v1/tags/${id}`,
      json: { name },
      signal: options?.signal,
    });

    return decodeResponseEnvelope<Tag>(res.body);
  }

  /** Deletes the tag with the given ID and removes it from its links. The links are kept. */
  public async delete(id: number, options?: RequestOptions): Promise<void> {
    await this.transport.request({
      method: "DELETE",
      path: `/api/v1/tags/${id}`,
      signal: options?.signal,
    });
  }

  /** Deletes the tags with the given IDs and removes them from their links. */
  public async bulkDelete(ids: number[], options?: RequestOptions): Promise<void> {
    await this.transport.request({
      method: "DELETE",
      path: "/api/v1/tags",
      json: { tagIds: ids },
      signal: options?.signal,
    });
  }
}
