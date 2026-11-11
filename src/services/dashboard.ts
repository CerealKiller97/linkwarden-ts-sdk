import { decodeDataEnvelope, decodeResponseEnvelope, type RequestOptions, type Transport } from "../http.ts";
import { normalizeLinks } from "../normalize.ts";
import type { Link } from "../types.ts";

/** The kinds of section in the v2 dashboard layout. */
export const DashboardSectionType = {
  Stats: "STATS",
  RecentLinks: "RECENT_LINKS",
  PinnedLinks: "PINNED_LINKS",
  Collection: "COLLECTION",
} as const;

export type DashboardSectionType = (typeof DashboardSectionType)[keyof typeof DashboardSectionType];

/** The data the v2 dashboard endpoints return. */
export type DashboardV2Data = {
  links: Link[];
  /**
   * Maps a collection ID (as a string key) to that collection's links, for each
   * collection section in the dashboard layout.
   */
  collectionLinks: Record<string, Link[]>;
  numberOfPinnedLinks: number;
  numberOfTags: number;
};

/** One section in the v2 dashboard layout, as sent to `dashboard.updateV2Layout`. */
export type DashboardLayoutItem = {
  type: DashboardSectionType;
  /** The collection a `COLLECTION` section shows. */
  collectionId?: number;
  enabled: boolean;
  /** The API stores it as-is, and rejects a section without one. */
  order: number;
};

function normalizeDashboard(data: DashboardV2Data | null): DashboardV2Data {
  const collectionLinks: Record<string, Link[]> = {};
  for (const [id, links] of Object.entries(data?.collectionLinks ?? {})) {
    collectionLinks[id] = normalizeLinks(links);
  }

  return {
    ...data,
    links: normalizeLinks(data?.links),
    collectionLinks,
    numberOfPinnedLinks: data?.numberOfPinnedLinks ?? 0,
    numberOfTags: data?.numberOfTags ?? 0,
  };
}

/** Accesses the `/api/v1/dashboard` and `/api/v2/dashboard` endpoints. */
export class DashboardService {
  public constructor(private readonly transport: Transport) {}

  /** Returns the v1 dashboard's recent links. */
  public async getV1(options?: RequestOptions): Promise<Link[]> {
    const res = await this.transport.request({ method: "GET", path: "/api/v1/dashboard", signal: options?.signal });

    return normalizeLinks(decodeResponseEnvelope<Link[] | null>(res.body));
  }

  /** Returns the v2 dashboard: the data each section of the user's layout shows. */
  public async getV2(options?: RequestOptions): Promise<DashboardV2Data> {
    const res = await this.transport.request({ method: "GET", path: "/api/v2/dashboard", signal: options?.signal });

    return normalizeDashboard(decodeDataEnvelope<DashboardV2Data | null>(res.body));
  }

  /** Replaces the dashboard's section layout and returns the updated dashboard. */
  public async updateV2Layout(layout: DashboardLayoutItem[], options?: RequestOptions): Promise<DashboardV2Data> {
    const res = await this.transport.request({
      method: "PUT",
      path: "/api/v2/dashboard",
      json: layout,
      signal: options?.signal,
    });

    return normalizeDashboard(decodeDataEnvelope<DashboardV2Data | null>(res.body));
  }
}
