import type { Link, PinnedBy } from "./types.js";

/**
 * Normalizes a link from any endpoint. The OpenAPI schema documents `pinnedBy`
 * entries as bare user IDs while the API sends `{"id": n}` objects; both become
 * {@link PinnedBy} objects, and `null` entries are dropped.
 */
export function normalizeLink(link: Link): Link {
  if (!Array.isArray(link.pinnedBy)) {
    return link;
  }

  const pinnedBy: PinnedBy[] = [];
  for (const entry of link.pinnedBy as unknown[]) {
    if (typeof entry === "number") {
      pinnedBy.push({ id: entry });
    } else if (typeof entry === "object" && entry !== null && typeof (entry as PinnedBy).id === "number") {
      pinnedBy.push(entry as PinnedBy);
    }
  }

  return { ...link, pinnedBy };
}

export function normalizeLinks(links: Link[] | null | undefined): Link[] {
  return (links ?? []).map(normalizeLink);
}
