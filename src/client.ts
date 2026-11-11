import { type FetchLike, Transport } from "./http.ts";
import { ArchivesService } from "./services/archives.ts";
import { AuthService } from "./services/auth.ts";
import { AvatarService } from "./services/avatar.ts";
import { CollectionsService } from "./services/collections.ts";
import { ConfigService } from "./services/config.ts";
import { DashboardService } from "./services/dashboard.ts";
import { FaviconService } from "./services/favicon.ts";
import { HighlightsService } from "./services/highlights.ts";
import { LinksService } from "./services/links.ts";
import { LoginsService } from "./services/logins.ts";
import { MigrationsService } from "./services/migrations.ts";
import { PreservedService } from "./services/preserved.ts";
import { PublicService } from "./services/public.ts";
import { RssService } from "./services/rss.ts";
import { SearchService } from "./services/search.ts";
import { SessionService } from "./services/session.ts";
import { TagsService } from "./services/tags.ts";
import { TokensService } from "./services/tokens.ts";
import { UsersService } from "./services/users.ts";
import { WorkerService } from "./services/worker.ts";

/** Configures a {@link LinkwardenClient}. */
export type LinkwardenClientOptions = {
  /** The instance's base URL, such as `https://cloud.linkwarden.app`. */
  baseUrl: string;
  /**
   * The bearer token: an API token or a session token. It may be left out for the
   * unauthenticated endpoints (session, auth, logins, public, config).
   */
  token?: string;
  /** Overrides the global `fetch`, for proxies, retries or tests. */
  fetch?: FetchLike;
  /** Extra headers sent with every request. */
  headers?: Record<string, string>;
  /** Aborts each request that takes longer than this many milliseconds. */
  timeoutMs?: number;
};

/**
 * A Linkwarden API client.
 *
 * ```ts
 * const client = new LinkwardenClient({ baseUrl: "https://cloud.linkwarden.app", token });
 * const collections = await client.collections.list();
 * ```
 */
export class LinkwardenClient {
  /** The base URL requests go to, without a trailing slash. */
  public readonly baseUrl: string;

  public readonly links: LinksService;
  public readonly collections: CollectionsService;
  public readonly tags: TagsService;
  public readonly tokens: TokensService;
  public readonly rss: RssService;
  public readonly search: SearchService;
  public readonly dashboard: DashboardService;
  public readonly highlights: HighlightsService;
  public readonly archives: ArchivesService;
  public readonly config: ConfigService;
  public readonly favicon: FaviconService;
  public readonly migrations: MigrationsService;
  public readonly preserved: PreservedService;
  public readonly avatar: AvatarService;
  public readonly logins: LoginsService;
  public readonly public: PublicService;
  public readonly session: SessionService;
  public readonly auth: AuthService;
  public readonly users: UsersService;
  public readonly worker: WorkerService;

  public constructor(options: LinkwardenClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");

    const transport = new Transport({
      baseUrl: this.baseUrl,
      token: options.token || undefined,
      fetch: options.fetch ?? ((input, init) => globalThis.fetch(input, init)),
      headers: options.headers ?? {},
      timeoutMs: options.timeoutMs,
    });

    this.collections = new CollectionsService(transport);
    this.links = new LinksService(transport, this.collections);
    this.tags = new TagsService(transport);
    this.tokens = new TokensService(transport);
    this.rss = new RssService(transport);
    this.search = new SearchService(transport);
    this.dashboard = new DashboardService(transport);
    this.highlights = new HighlightsService(transport);
    this.archives = new ArchivesService(transport);
    this.config = new ConfigService(transport);
    this.favicon = new FaviconService(transport);
    this.migrations = new MigrationsService(transport);
    this.preserved = new PreservedService(transport);
    this.avatar = new AvatarService(transport);
    this.logins = new LoginsService(transport);
    this.public = new PublicService(transport);
    this.session = new SessionService(transport);
    this.auth = new AuthService(transport);
    this.users = new UsersService(transport);
    this.worker = new WorkerService(transport);
  }
}
