import {
  type BinaryFile,
  binaryFile,
  buildFileForm,
  decodeResponseEnvelope,
  type FileInput,
  parseContentDispositionFilename,
  Query,
  type RequestOptions,
  type Transport,
  type TransportResponse,
} from "../http.ts";
import { normalizeLink } from "../normalize.ts";
import type { ArchiveFormat, Link } from "../types.ts";

/** A downloaded archive file. */
export type ArchiveFile = BinaryFile & {
  /** Populated only when the server sends a `Content-Disposition` header with one. */
  filename?: string;
};

/** Selects which archive `archives.get` downloads. */
export type GetArchiveOptions = {
  format: ArchiveFormat;
  /** Returns the preview image instead of the archive. */
  preview?: boolean;
};

/** The payload for `archives.upload`. */
export type UploadArchiveRequest = {
  format: ArchiveFormat;
  /** Uploads the file as the link's preview image instead of its archive. */
  preview?: boolean;
  /** The file's name; its extension picks the uploaded content type. */
  filename: string;
  file: FileInput;
};

/** The payload for `archives.uploadStandalone`. */
export type UploadStandaloneArchiveRequest = UploadArchiveRequest & {
  /** The URL of the link to create. */
  url: string;
};

/** Reads a downloaded file and the filename from its `Content-Disposition`. */
export function archiveFile(res: TransportResponse): ArchiveFile {
  const file: ArchiveFile = binaryFile(res);
  const filename = parseContentDispositionFilename(res.headers.get("Content-Disposition"));
  if (filename !== undefined) {
    file.filename = filename;
  }

  return file;
}

/** Accesses the `/api/v1/archives` endpoints. */
export class ArchivesService {
  public constructor(private readonly transport: Transport) {}

  /** Downloads a link's archived file in the given format. The whole file is read into memory. */
  public async get(linkId: number, opts: GetArchiveOptions, options?: RequestOptions): Promise<ArchiveFile> {
    const query = new Query().set("format", opts.format).flag("preview", opts.preview);

    const res = await this.transport.request({
      method: "GET",
      path: `/api/v1/archives/${linkId}`,
      query: query.params,
      signal: options?.signal,
    });

    return archiveFile(res);
  }

  /**
   * Attaches a local file as the archive (or preview) of an existing link,
   * returning the link with its updated archive fields.
   */
  public async upload(linkId: number, req: UploadArchiveRequest, options?: RequestOptions): Promise<Link> {
    const query = new Query().set("format", req.format).flag("preview", req.preview);

    const res = await this.transport.request({
      method: "POST",
      path: `/api/v1/archives/${linkId}`,
      query: query.params,
      form: await buildFileForm({}, "file", req.filename, req.file),
      signal: options?.signal,
    });

    return normalizeLink(decodeResponseEnvelope<Link>(res.body));
  }

  /** Uploads a local file as a new link's archive, creating the link in the process. */
  public async uploadStandalone(req: UploadStandaloneArchiveRequest, options?: RequestOptions): Promise<Link> {
    const query = new Query().set("format", req.format).flag("preview", req.preview);

    const res = await this.transport.request({
      method: "POST",
      path: "/api/v1/archives",
      query: query.params,
      form: await buildFileForm({ url: req.url }, "file", req.filename, req.file),
      signal: options?.signal,
    });

    return normalizeLink(decodeResponseEnvelope<Link>(res.body));
  }
}
