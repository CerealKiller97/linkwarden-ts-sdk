import { decodeResponseEnvelope, type RequestOptions, type Transport } from "../http.ts";
import type { Highlight } from "../types.ts";

/**
 * The payload for `highlights.create`. The API treats it as create-or-update: a
 * highlight on the same link and offsets is updated in place, not duplicated.
 */
export type CreateHighlightRequest = {
  linkId: number;
  color: string;
  text: string;
  startOffset: number;
  endOffset: number;
  comment?: string;
};

/**
 * Accesses the `/api/v1/highlights` endpoints. Listing a link's highlights is
 * `links.highlights`, since there is no list-all endpoint.
 */
export class HighlightsService {
  public constructor(private readonly transport: Transport) {}

  /** Adds a highlight to a link. */
  public async create(req: CreateHighlightRequest, options?: RequestOptions): Promise<Highlight> {
    const res = await this.transport.request({
      method: "POST",
      path: "/api/v1/highlights",
      json: req,
      signal: options?.signal,
    });

    return decodeResponseEnvelope<Highlight>(res.body);
  }

  /** Deletes the highlight with the given ID. */
  public async delete(id: number, options?: RequestOptions): Promise<void> {
    await this.transport.request({
      method: "DELETE",
      path: `/api/v1/highlights/${id}`,
      signal: options?.signal,
    });
  }
}
