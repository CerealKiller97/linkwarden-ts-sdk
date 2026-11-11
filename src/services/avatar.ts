import { type BinaryFile, binaryFile, type RequestOptions, type Transport } from "../http.js";

/** Accesses the `/api/v1/avatar` endpoint. */
export class AvatarService {
  public constructor(private readonly transport: Transport) {}

  /** Downloads the avatar image of the user with the given ID. A user without one is a 404. */
  public async get(userId: number, options?: RequestOptions): Promise<BinaryFile> {
    const res = await this.transport.request({
      method: "GET",
      path: `/api/v1/avatar/${userId}`,
      signal: options?.signal,
    });

    return binaryFile(res);
  }
}
