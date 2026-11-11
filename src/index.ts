export { LinkwardenClient, type LinkwardenClientOptions } from "./client.ts";
export {
  ErrorCode,
  isApiError,
  isConflict,
  isNotFound,
  isTooManyRequests,
  LinkwardenApiError,
  LinkwardenError,
} from "./errors.ts";
export type { BinaryFile, FetchLike, FileInput, RequestOptions } from "./http.ts";
export * from "./types.ts";

export type { ArchiveFile, GetArchiveOptions, UploadArchiveRequest, UploadStandaloneArchiveRequest } from "./services/archives.ts";
export type { ResetPasswordRequest } from "./services/auth.ts";
export type { CreateCollectionRequest, UpdateCollectionRequest } from "./services/collections.ts";
export type { PublicConfig } from "./services/config.ts";
export { DashboardSectionType, type DashboardLayoutItem, type DashboardV2Data } from "./services/dashboard.ts";
export type { CreateHighlightRequest } from "./services/highlights.ts";
export type {
  BulkUpdateLinksNewData,
  BulkUpdateLinksRequest,
  CreateLinkRequest,
  ListLinksOptions,
  ReorderLinkRequest,
  UpdateLinkRequest,
} from "./services/links.ts";
export type { ButtonAuth, LoginConfig } from "./services/logins.ts";
export { ImportFormat } from "./services/migrations.ts";
export type { PreservedFormatUrl, ViewPreservedOptions } from "./services/preserved.ts";
export type { ListPublicLinksOptions, PublicUser } from "./services/public.ts";
export type { CreateRssRequest, RssSubscription } from "./services/rss.ts";
export type { SearchOptions } from "./services/search.ts";
export type { CreateSessionRequest } from "./services/session.ts";
export type { ListTagsOptions, TagUpsert } from "./services/tags.ts";
export { TokenExpiry, type CreatedToken, type CreateTokenRequest, type Token, type TokenDetail } from "./services/tokens.ts";
export type {
  CreateUserRequest,
  UpdateUserPreferencesRequest,
  UpdateUserRequest,
  User,
  UserPreferences,
} from "./services/users.ts";
export { PreservationResetAction, type WorkerStats } from "./services/worker.ts";

export type { ArchivesService } from "./services/archives.ts";
export type { AuthService } from "./services/auth.ts";
export type { AvatarService } from "./services/avatar.ts";
export type { CollectionsService } from "./services/collections.ts";
export type { ConfigService } from "./services/config.ts";
export type { DashboardService } from "./services/dashboard.ts";
export type { FaviconService } from "./services/favicon.ts";
export type { HighlightsService } from "./services/highlights.ts";
export type { LinksService } from "./services/links.ts";
export type { LoginsService } from "./services/logins.ts";
export type { MigrationsService } from "./services/migrations.ts";
export type { PreservedService } from "./services/preserved.ts";
export type { PublicService } from "./services/public.ts";
export type { RssService } from "./services/rss.ts";
export type { SearchService } from "./services/search.ts";
export type { SessionService } from "./services/session.ts";
export type { TagsService } from "./services/tags.ts";
export type { TokensService } from "./services/tokens.ts";
export type { UsersService } from "./services/users.ts";
export type { WorkerService } from "./services/worker.ts";
