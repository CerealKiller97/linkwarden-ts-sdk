import { LinkwardenApiError, LinkwardenError } from "./errors.js";

/** A `fetch`-compatible function, for passing a custom one to the client. */
export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

/** Per-call options accepted by every service method. */
export type RequestOptions = {
  /** Aborts the request when signalled. */
  signal?: AbortSignal;
};

/** File contents accepted by the upload methods. */
export type FileInput = Blob | ArrayBuffer | ArrayBufferView;

/** A downloaded binary file, such as an archive, avatar or favicon. */
export type BinaryFile = {
  data: Uint8Array;
  /** The `Content-Type` the server sent, or an empty string. */
  contentType: string;
};

type TransportRequest = {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  query?: URLSearchParams;
  json?: unknown;
  form?: FormData;
  signal?: AbortSignal | undefined;
};

export type TransportResponse = {
  status: number;
  headers: Headers;
  body: Uint8Array;
};

export type TransportConfig = {
  baseUrl: string;
  token: string | undefined;
  fetch: FetchLike;
  headers: Record<string, string>;
  timeoutMs: number | undefined;
};

/** Performs HTTP requests against the Linkwarden API. Internal to the SDK. */
export class Transport {
  public constructor(private readonly config: TransportConfig) {}

  /**
   * Performs a request and returns the fully-read response. A non-2xx status throws
   * a {@link LinkwardenApiError}.
   */
  public async request(req: TransportRequest): Promise<TransportResponse> {
    let url = this.config.baseUrl + req.path;
    if (req.query && req.query.size > 0) {
      url += `?${req.query.toString()}`;
    }

    const headers = new Headers(this.config.headers);
    headers.set("Accept", "application/json");
    if (this.config.token) {
      headers.set("Authorization", `Bearer ${this.config.token}`);
    }

    let body: BodyInit | undefined;
    if (req.form) {
      // fetch sets the multipart Content-Type, boundary included.
      body = req.form;
    } else if (req.json !== undefined) {
      body = JSON.stringify(req.json);
      headers.set("Content-Type", "application/json");
    }

    const init: RequestInit = { method: req.method, headers };
    if (body !== undefined) {
      init.body = body;
    }
    const signal = this.resolveSignal(req.signal);
    if (signal) {
      init.signal = signal;
    }

    let response: Response;
    let bytes: Uint8Array;
    try {
      response = await this.config.fetch(url, init);
      bytes = new Uint8Array(await response.arrayBuffer());
    } catch (err) {
      if (isAbortError(err)) {
        throw err;
      }
      throw new LinkwardenError(`linkwarden: ${req.method} ${req.path}: ${errorMessage(err)}`, { cause: err });
    }

    if (response.status < 200 || response.status >= 300) {
      throw new LinkwardenApiError({
        status: response.status,
        rawBody: decodeText(bytes),
        retryAfterHeader: response.headers.get("Retry-After"),
      });
    }

    return {
      status: response.status,
      headers: response.headers,
      body: bytes
    };
  }

  private resolveSignal(signal: AbortSignal | undefined): AbortSignal | undefined {
    const { timeoutMs } = this.config;
    if (timeoutMs === undefined) {
      return signal;
    }

    const timeout = AbortSignal.timeout(timeoutMs);

    return signal ? AbortSignal.any([signal, timeout]) : timeout;
  }
}

function isAbortError(err: unknown): boolean {
  return err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

const textDecoder = new TextDecoder();

export function decodeText(body: Uint8Array): string {
  return textDecoder.decode(body);
}

function parseJson(body: Uint8Array, what: string): unknown {
  try {
    return JSON.parse(decodeText(body));
  } catch (err) {
    throw new LinkwardenError(`linkwarden: decode ${what}: ${errorMessage(err)}`, { cause: err });
  }
}

function parseEnvelope(body: Uint8Array, what: string): Record<string, unknown> {
  const parsed = parseJson(body, what);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new LinkwardenError(`linkwarden: decode ${what}: expected a JSON object`);
  }

  return parsed as Record<string, unknown>;
}

/** Unwraps the common `{"response": T}` envelope. */
export function decodeResponseEnvelope<T>(body: Uint8Array): T {
  return parseEnvelope(body, "response envelope")["response"] as T;
}

/** Unwraps the `{"data": T, "message": ..., "success": ...}` envelope. */
export function decodeDataEnvelope<T>(body: Uint8Array): T {
  return parseEnvelope(body, "data envelope")["data"] as T;
}

/** Decodes a response body with no enclosing envelope. */
export function decodeJson<T>(body: Uint8Array): T {
  return parseJson(body, "response body") as T;
}

/** Builds query strings, skipping values the API should treat as unset. */
export class Query {
  public readonly params = new URLSearchParams();

  /** Always sets the key. */
  public set(key: string, value: string | number): this {
    this.params.set(key, String(value));
    return this;
  }

  /** Sets the key when the value is defined. */
  public optional(key: string, value: string | number | undefined): this {
    if (value !== undefined) {
      this.params.set(key, String(value));
    }
    return this;
  }

  /** Sets the key when the number is positive (IDs and cursors). */
  public positive(key: string, value: number | undefined): this {
    if (value !== undefined && value > 0) {
      this.params.set(key, String(value));
    }
    return this;
  }

  /** Sets the key when the string is non-empty. */
  public nonEmpty(key: string, value: string | undefined): this {
    if (value) {
      this.params.set(key, value);
    }
    return this;
  }

  /** Sets the key to `value` when the flag is true. */
  public flag(key: string, on: boolean | undefined, value = "true"): this {
    if (on) {
      this.params.set(key, value);
    }
    return this;
  }
}

/** Reads a binary response as a {@link BinaryFile}. */
export function binaryFile(res: TransportResponse): BinaryFile {
  return {
    data: res.body,
    contentType: res.headers.get("Content-Type") ?? ""
  };
}

/**
 * Encodes fields and one file part as multipart/form-data. The API rejects parts
 * sent as `application/octet-stream`, so the part carries the file's real type,
 * picked from the filename or sniffed from its first bytes.
 */
export async function buildFileForm(
  fields: Record<string, string>,
  fileField: string,
  filename: string,
  file: FileInput,
): Promise<FormData> {
  const blob = toBlob(file);
  const head = new Uint8Array(await blob.slice(0, 512).arrayBuffer());
  const typed = new Blob([blob], { type: fileContentType(filename, head) });

  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    form.append(key, value);
  }

  form.append(fileField, typed, filename);

  return form;
}

function toBlob(file: FileInput): Blob {
  if (file instanceof Blob) {
    return file;
  }

  if (file instanceof ArrayBuffer) {
    return new Blob([file]);
  }

  // Copy the view so the Blob doesn't depend on (possibly shared) backing memory.
  const bytes = new Uint8Array(file.byteLength);
  bytes.set(new Uint8Array(file.buffer, file.byteOffset, file.byteLength));

  return new Blob([bytes]);
}

const EXTENSION_TYPES: Record<string, string> = {
  avif: "image/avif",
  css: "text/css",
  gif: "image/gif",
  htm: "text/html",
  html: "text/html",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript",
  json: "application/json",
  mjs: "text/javascript",
  pdf: "application/pdf",
  png: "image/png",
  svg: "image/svg+xml",
  txt: "text/plain",
  wasm: "application/wasm",
  webp: "image/webp",
  xml: "text/xml",
};

/**
 * Picks the MIME type for an uploaded file from its extension, falling back to
 * sniffing its first bytes.
 */
export function fileContentType(filename: string, head: Uint8Array): string {
  const dot = filename.lastIndexOf(".");
  if (dot >= 0) {
    const fromExtension = EXTENSION_TYPES[filename.slice(dot + 1).toLowerCase()];

    if (fromExtension) {
      return fromExtension;
    }
  }

  return sniffContentType(head);
}

const HTML_TAGS = [
  "<!DOCTYPE HTML",
  "<HTML",
  "<HEAD",
  "<SCRIPT",
  "<IFRAME",
  "<H1",
  "<DIV",
  "<FONT",
  "<TABLE",
  "<A",
  "<STYLE",
  "<TITLE",
  "<B",
  "<BODY",
  "<BR",
  "<P",
  "<!--",
];

/** A subset of the WHATWG MIME sniffing algorithm, covering the archive formats. */
export function sniffContentType(head: Uint8Array): string {
  const startsWith = (sig: number[], offset = 0) => sig.every((b, i) => head[offset + i] === b);
  const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

  if (startsWith([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (startsWith([0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(ascii("GIF87a")) || startsWith(ascii("GIF89a"))) return "image/gif";
  if (startsWith(ascii("RIFF")) && startsWith(ascii("WEBPVP"), 8)) return "image/webp";
  if (startsWith(ascii("%PDF-"))) return "application/pdf";

  let start = 0;
  while (start < head.length && [0x09, 0x0a, 0x0c, 0x0d, 0x20].includes(head[start] ?? -1)) {
    start++;
  }
  const text = decodeText(head.subarray(start, start + 16)).toUpperCase();
  for (const tag of HTML_TAGS) {
    const next = text.charAt(tag.length);
    if (text.startsWith(tag) && (next === " " || next === ">")) {
      return "text/html";
    }
  }
  if (text.startsWith("<?XML")) return "text/xml";

  const binary = head.some((b) => b <= 0x08 || b === 0x0b || (b >= 0x0e && b <= 0x1a) || (b >= 0x1c && b <= 0x1f));

  return binary ? "application/octet-stream" : "text/plain";
}

/** Reads the filename from a `Content-Disposition` header, if it has one. */
export function parseContentDispositionFilename(header: string | null): string | undefined {
  if (!header) {
    return undefined;
  }

  const extended = /filename\*\s*=\s*[^']*'[^']*'([^;]+)/i.exec(header);
  if (extended?.[1]) {
    try {
      return decodeURIComponent(extended[1].trim());
    } catch {
      // Fall through to the plain parameter.
    }
  }

  const quoted = /filename\s*=\s*"((?:\\.|[^"\\])*)"/i.exec(header);
  if (quoted?.[1] !== undefined) {
    return quoted[1].replace(/\\(.)/g, "$1");
  }

  const plain = /filename\s*=\s*([^;\s]+)/i.exec(header);

  return plain?.[1];
}
