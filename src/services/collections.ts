import { LinkwardenApiError } from "../errors.ts";
import { decodeResponseEnvelope, type RequestOptions, type Transport } from "../http.ts";
import type { Collection, Member, MemberInput } from "../types.ts";

/** The payload for `collections.create`. */
export type CreateCollectionRequest = {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  iconWeight?: string;
  /** Nests the new collection inside this one. */
  parentId?: number;
};

/** The payload for `collections.update`. Fields left out keep their current value. */
export type UpdateCollectionRequest = {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  iconWeight?: string;
  parentId?: number;
  isPublic?: boolean;
  /** Replaces the current members when set. */
  members?: MemberInput[];
};

/** Accesses the `/api/v1/collections` endpoints. */
export class CollectionsService {
  public constructor(private readonly transport: Transport) {}

  /** Returns every collection the authenticated user owns or is a member of. */
  public async list(options?: RequestOptions): Promise<Collection[]> {
    const res = await this.transport.request({
      method: "GET",
      path: "/api/v1/collections",
      signal: options?.signal,
    });

    return decodeResponseEnvelope<Collection[] | null>(res.body) ?? [];
  }

  /**
   * Returns the collection with the given ID. The API answers a missing or
   * inaccessible collection with 200 and a null body, so this throws a 404
   * {@link LinkwardenApiError} instead; check it with `isNotFound`.
   */
  public async get(id: number, options?: RequestOptions): Promise<Collection> {
    const res = await this.transport.request({
      method: "GET",
      path: `/api/v1/collections/${id}`,
      signal: options?.signal,
    });

    const collection = decodeResponseEnvelope<Collection | null>(res.body);
    if (!collection) {
      throw new LinkwardenApiError({ status: 404, rawBody: JSON.stringify({ response: "Collection not found." }) });
    }

    return collection;
  }

  /** Creates a new collection. */
  public async create(req: CreateCollectionRequest, options?: RequestOptions): Promise<Collection> {
    const res = await this.transport.request({
      method: "POST",
      path: "/api/v1/collections",
      json: req,
      signal: options?.signal,
    });

    return decodeResponseEnvelope<Collection>(res.body);
  }

  /**
   * Changes the fields set in `req` and keeps the rest. The API replaces the whole
   * collection (it requires its name and member list), so this first fetches the
   * collection and fills every unset field from it.
   */
  public async update(id: number, req: UpdateCollectionRequest, options?: RequestOptions): Promise<Collection> {
    const current = await this.get(id, options);

    const payload = {
      id,
      name: req.name ?? current.name,
      description: req.description ?? current.description,
      color: req.color ?? current.color ?? undefined,
      icon: req.icon ?? current.icon ?? undefined,
      iconWeight: req.iconWeight ?? current.iconWeight ?? undefined,
      parentId: req.parentId ?? current.parentId ?? undefined,
      isPublic: req.isPublic ?? current.isPublic,
      members: (req.members ?? current.members ?? []).map(toMemberPayload),
    };

    const res = await this.transport.request({
      method: "PUT",
      path: `/api/v1/collections/${id}`,
      json: payload,
      signal: options?.signal,
    });

    return decodeResponseEnvelope<Collection>(res.body);
  }

  /** Deletes the collection with the given ID, and the links in it. */
  public async delete(id: number, options?: RequestOptions): Promise<void> {
    await this.transport.request({
      method: "DELETE",
      path: `/api/v1/collections/${id}`,
      signal: options?.signal,
    });
  }
}

function toMemberPayload(member: MemberInput | Member) {
  return {
    userId: member.userId,
    canCreate: member.canCreate ?? false,
    canUpdate: member.canUpdate ?? false,
    canDelete: member.canDelete ?? false,
    user: member.user,
  };
}
