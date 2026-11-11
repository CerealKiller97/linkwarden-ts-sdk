import { decodeResponseEnvelope, type RequestOptions, type Transport } from "../http.js";
import type { Collection } from "../types.js";

/** A Linkwarden RSS feed subscription. */
export type RssSubscription = {
  id: number;
  name: string;
  url: string;
  ownerId: number;
  collectionId: number;
  lastBuildDate?: string | null;
  createdAt: string;
  updatedAt: string;
  /** The destination collection; `rss.list` only includes its name. */
  collection?: Partial<Collection> & { name: string };
};

/**
 * The payload for `rss.create`. Set `collectionId` or `collectionName` to pick the
 * collection new feed items are saved into.
 */
export type CreateRssRequest = {
  name: string;
  url: string;
  collectionId?: number;
  collectionName?: string;
};

/** Accesses the `/api/v1/rss` endpoints. */
export class RssService {
  private readonly transport: Transport;

  public constructor(transport: Transport) {
    this.transport = transport;
  }

  /** Returns the authenticated user's RSS subscriptions. */
  public async list(options?: RequestOptions): Promise<RssSubscription[]> {
    const res = await this.transport.request({ method: "GET", path: "/api/v1/rss", signal: options?.signal });

    return decodeResponseEnvelope<RssSubscription[] | null>(res.body) ?? [];
  }

  /** Subscribes to an RSS feed. New items are saved as links in the chosen collection. */
  public async create(req: CreateRssRequest, options?: RequestOptions): Promise<RssSubscription> {
    const res = await this.transport.request({
      method: "POST",
      path: "/api/v1/rss",
      json: req,
      signal: options?.signal,
    });

    return decodeResponseEnvelope<RssSubscription>(res.body);
  }

  /** Removes the RSS subscription with the given ID. Links it already saved are kept. */
  public async delete(id: number, options?: RequestOptions): Promise<void> {
    await this.transport.request({
      method: "DELETE",
      path: `/api/v1/rss/${id}`,
      signal: options?.signal,
    });
  }
}
