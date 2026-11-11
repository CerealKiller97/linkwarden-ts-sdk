/**
 * Models shared between services. Dates are the ISO 8601 strings the API sends;
 * wrap them in `new Date(...)` where you need date arithmetic.
 */

/** Sort orders for links, for `links.list`, `search.links` and `public.collectionLinks`. */
export const Sort = {
  DateNewestFirst: 0,
  DateOldestFirst: 1,
  NameAZ: 2,
  NameZA: 3,
  /**
   * The order set with `links.reorder`. It only applies when listing a single
   * collection; otherwise links come newest first. Linkwarden v2.17 or later.
   */
  Custom: 4,
} as const;

export type Sort = (typeof Sort)[keyof typeof Sort];

/** Counts the API attaches to a collection or tag. */
export type LinkCount = {
  links: number;
};

/** A Linkwarden tag. */
export type Tag = {
  id: number;
  name: string;
  ownerId: number;
  archiveAsScreenshot?: boolean | null;
  archiveAsMonolith?: boolean | null;
  archiveAsPDF?: boolean | null;
  archiveAsReadable?: boolean | null;
  archiveAsWaybackMachine?: boolean | null;
  aiTag?: boolean | null;
  aiGenerated?: boolean;
  createdAt: string;
  updatedAt: string;
  /** Present on `tags.list` and `tags.get`: how many links have the tag. */
  _count?: LinkCount;
};

/**
 * A tag as sent when creating or updating links. Tags are matched by name and
 * created if they don't exist yet.
 */
export type TagInput = {
  id?: number;
  name: string;
};

/** Identifies a collection by ID and name, such as a nested collection's parent. */
export type CollectionRef = {
  id: number;
  name: string;
};

/** The public profile of a collection member's user. */
export type MemberUser = {
  id?: number;
  username?: string | null;
  name?: string | null;
  image?: string | null;
};

/** A collection member's access grant. */
export type Member = {
  userId: number;
  collectionId?: number;
  canCreate: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  createdAt?: string;
  updatedAt?: string;
  user?: MemberUser;
};

/** A member as sent to `collections.update`. Permissions left out are `false`. */
export type MemberInput = {
  userId: number;
  canCreate?: boolean;
  canUpdate?: boolean;
  canDelete?: boolean;
  user?: MemberUser;
};

/** A Linkwarden collection (a folder of links). */
export type Collection = {
  id: number;
  name: string;
  description: string;
  icon: string | null;
  iconWeight: string | null;
  color: string | null;
  parentId: number | null;
  isPublic: boolean;
  ownerId: number;
  createdById: number | null;
  createdAt: string;
  updatedAt: string;
  /** How many links the collection holds, when the endpoint includes it. */
  _count?: LinkCount;
  /** The collection this one is nested inside, when the endpoint includes it. */
  parent?: CollectionRef | null;
  members?: Member[];
};

/** An entry in a link's `pinnedBy` list: a user who pinned it. */
export type PinnedBy = {
  id: number;
};

/** The kind of a link: a web page, or an uploaded PDF or image. */
export type LinkType = "url" | "pdf" | "image" | (string & {});

/** A Linkwarden bookmark. */
export type Link = {
  id: number;
  name: string;
  type: LinkType;
  description: string;
  createdById: number | null;
  collectionId: number;
  /** `null` for a link created from an uploaded file. */
  url: string | null;
  icon: string | null;
  iconWeight: string | null;
  color: string | null;
  /** Omitted from list and search results. */
  textContent?: string | null;
  preview: string | null;
  image: string | null;
  pdf: string | null;
  readable: string | null;
  monolith: string | null;
  clientSide?: boolean;
  aiTagged?: boolean;
  metaDescription?: string | null;
  /**
   * Places the link in its collection's custom order: higher comes first. Only its
   * order relative to other links in the same collection means anything. Change it
   * with `links.reorder`. Linkwarden v2.17 or later.
   */
  collectionOrder?: number;
  lastPreserved: string | null;
  importDate: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: Tag[];
  collection?: Collection;
  pinnedBy?: PinnedBy[];
};

/** A highlighted passage on a link. */
export type Highlight = {
  id: number;
  userId: number;
  linkId: number;
  color: string;
  comment: string | null;
  startOffset: number;
  endOffset: number;
  text: string;
  createdAt: string;
  updatedAt: string;
};

/** The format of an archived file, for the archives and preserved services. */
export const ArchiveFormat = {
  PNG: 0,
  JPEG: 1,
  PDF: 2,
  ReadabilityJSON: 3,
  MonolithHTML: 4,
} as const;

export type ArchiveFormat = (typeof ArchiveFormat)[keyof typeof ArchiveFormat];
