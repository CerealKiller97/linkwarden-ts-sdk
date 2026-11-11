import { decodeDataEnvelope, decodeResponseEnvelope, type RequestOptions, type Transport } from "../http.js";

/** The background worker's preservation and search indexing queues. */
export type WorkerStats = {
  link: { pending: number; done: number; failed: number };
  search: { pending: number; done: number };
};

/** Selects which links `worker.resetPreservation` clears. */
export const PreservationResetAction = {
  /** Clears every link's preserved files and re-preserves them. */
  All: "allAndRePreserve",
  /** Clears only links whose archives are broken. */
  Broken: "allBroken",
} as const;

export type PreservationResetAction = (typeof PreservationResetAction)[keyof typeof PreservationResetAction];

/** Accesses the `/api/v1/worker` endpoints. Both require the server admin user. */
export class WorkerService {
  public constructor(private readonly transport: Transport) {}

  /** Returns how many links are pending, done or failed for each kind of job. */
  public async stats(options?: RequestOptions): Promise<WorkerStats> {
    const res = await this.transport.request({ method: "GET", path: "/api/v1/worker", signal: options?.signal });

    return decodeDataEnvelope<WorkerStats>(res.body);
  }

  /** Starts clearing preserved files in bulk, returning the API's status message. */
  public async resetPreservation(action: PreservationResetAction, options?: RequestOptions): Promise<string> {
    const res = await this.transport.request({
      method: "DELETE",
      path: "/api/v1/worker/preservation",
      json: { action },
      signal: options?.signal,
    });

    return decodeResponseEnvelope<string>(res.body);
  }
}
