export { LinkwardenClient, type LinkwardenClientOptions } from "./client.js";
export {
  ErrorCode,
  isApiError,
  isConflict,
  isNotFound,
  isTooManyRequests,
  LinkwardenApiError,
  LinkwardenError,
} from "./errors.js";
export type { BinaryFile, FetchLike, FileInput, RequestOptions } from "./http.js";
export * from "./types.js";

export type { ArchiveFile, GetArchiveOptions, UploadArchiveRequest, UploadStandaloneArchiveRequest } from "./services/archives.js";
export type { ResetPasswordRequest } from "./services/auth.js";
export type { CreateCollectionRequest, UpdateCollectionRequest } from "./services/collections.js";
export type { PublicConfig } from "./services/config.js";
export { DashboardSectionType, type DashboardLayoutItem, type DashboardV2Data } from "./services/dashboard.js";
export type { CreateHighlightRequest } from "./services/highlights.js";
export type {
  BulkUpdateLinksNewData,
  BulkUpdateLinksRequest,
  CreateLinkRequest,
  ListLinksOptions,
  ReorderLinkRequest,
  UpdateLinkRequest,
} from "./services/links.js";
export type { ButtonAuth, LoginConfig } from "./services/logins.js";
export { ImportFormat } from "./services/migrations.js";
export type { PreservedFormatUrl, ViewPreservedOptions } from "./services/preserved.js";
export type { ListPublicLinksOptions, PublicUser } from "./services/public.js";
export type { CreateRssRequest, RssSubscription } from "./services/rss.js";
export type { SearchOptions } from "./services/search.js";
export type { CreateSessionRequest } from "./services/session.js";
export type { ListTagsOptions, TagUpsert } from "./services/tags.js";
export { TokenExpiry, type CreatedToken, type CreateTokenRequest, type Token, type TokenDetail } from "./services/tokens.js";
export type {
  CreateUserRequest,
  UpdateUserPreferencesRequest,
  UpdateUserRequest,
  User,
  UserPreferences,
} from "./services/users.js";
export { PreservationResetAction, type WorkerStats } from "./services/worker.js";

export type { ArchivesService } from "./services/archives.js";
export type { AuthService } from "./services/auth.js";
export type { AvatarService } from "./services/avatar.js";
export type { CollectionsService } from "./services/collections.js";
export type { ConfigService } from "./services/config.js";
export type { DashboardService } from "./services/dashboard.js";
export type { FaviconService } from "./services/favicon.js";
export type { HighlightsService } from "./services/highlights.js";
export type { LinksService } from "./services/links.js";
export type { LoginsService } from "./services/logins.js";
export type { MigrationsService } from "./services/migrations.js";
export type { PreservedService } from "./services/preserved.js";
export type { PublicService } from "./services/public.js";
export type { RssService } from "./services/rss.js";
export type { SearchService } from "./services/search.js";
export type { SessionService } from "./services/session.js";
export type { TagsService } from "./services/tags.js";
export type { TokensService } from "./services/tokens.js";
export type { UsersService } from "./services/users.js";
export type { WorkerService } from "./services/worker.js";
