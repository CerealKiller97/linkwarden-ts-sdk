import { describe, expect, it } from "vitest";
import {
  buildFileForm,
  decodeDataEnvelope,
  decodeResponseEnvelope,
  fileContentType,
  parseContentDispositionFilename,
} from "../../src/http.ts";
import { LinkwardenClient, LinkwardenError, type Link } from "../../src/index.ts";
import { normalizeLink } from "../../src/normalize.ts";
import { decodeSearchLinks } from "../../src/services/links.ts";

const encode = (s: string) => new TextEncoder().encode(s);
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);

describe("envelopes", () => {
  it("decodeResponseEnvelope unwraps response", () => {
    // Arrange
    // Act
    const got = decodeResponseEnvelope<string>(encode('{"response":"hello"}'));

    // Assert
    expect(got).toBe("hello");
  });

  it("decodeDataEnvelope unwraps data", () => {
    // Arrange
    // Act
    const got = decodeDataEnvelope<string>(encode('{"data":"hello","message":"Success","success":true}'));

    // Assert
    expect(got).toBe("hello");
  });

  it("rejects a body that isn't a JSON object", () => {
    // Arrange
    // Act
    // Assert
    expect(() => decodeResponseEnvelope(encode("<html>"))).toThrow(LinkwardenError);
    expect(() => decodeResponseEnvelope(encode("[1]"))).toThrow(/expected a JSON object/);
  });

  it("decodeSearchLinks treats an empty data array as no links", () => {
    // Arrange
    // Act
    const got = decodeSearchLinks(encode('{"data":[],"success":true}'));

    // Assert
    expect(got).toEqual([]);
  });
});

describe("fileContentType", () => {
  it.each([
    { name: "from extension", filename: "page.pdf", head: new Uint8Array(), want: "application/pdf" },
    { name: "html without parameters", filename: "page.html", head: new Uint8Array(), want: "text/html" },
    { name: "sniffed without extension", filename: "screenshot", head: png, want: "image/png" },
    { name: "sniffed with unknown extension", filename: "screenshot.unknown", head: png, want: "image/png" },
    { name: "sniffed html", filename: "page", head: encode("  <!doctype html><html>"), want: "text/html" },
    { name: "sniffed pdf", filename: "doc", head: encode("%PDF-1.7"), want: "application/pdf" },
    { name: "plain text", filename: "notes", head: encode("hello"), want: "text/plain" },
    {
      name: "unrecognised content",
      filename: "blob",
      head: new Uint8Array([0x00, 0x01, 0x02]),
      want: "application/octet-stream",
    },
  ])("picks the type $name", ({ filename, head, want }) => {
    // Arrange
    // Act
    const got = fileContentType(filename, head);

    // Assert
    expect(got).toBe(want);
  });
});

describe("buildFileForm", () => {
  it("sends the file part with its real content type", async () => {
    // Arrange
    // Act
    const form = await buildFileForm({ url: "https://example.com" }, "file", "screenshot", png);

    // Assert
    const file = form.get("file") as File;
    expect(file.type).toBe("image/png");
    expect(file.name).toBe("screenshot");
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(png);
    expect(form.get("url")).toBe("https://example.com");
  });
});

describe("parseContentDispositionFilename", () => {
  it.each([
    { header: 'attachment; filename="report.pdf"', want: "report.pdf" },
    { header: "attachment; filename=report.pdf", want: "report.pdf" },
    { header: "attachment; filename*=UTF-8''r%C3%A9sum%C3%A9.pdf", want: "résumé.pdf" },
    { header: "inline", want: undefined },
    { header: null, want: undefined },
  ])("parses $header", ({ header, want }) => {
    // Arrange
    // Act
    const got = parseContentDispositionFilename(header);

    // Assert
    expect(got).toBe(want);
  });
});

describe("normalizeLink", () => {
  it("accepts pinnedBy as bare IDs or objects", () => {
    // Arrange
    const link = { id: 1, pinnedBy: [1, { id: 2 }, null] } as unknown as Link;

    // Act
    const got = normalizeLink(link);

    // Assert
    expect(got.pinnedBy).toEqual([{ id: 1 }, { id: 2 }]);
  });
});

describe("LinkwardenClient", () => {
  it("trims trailing slashes from the base URL", () => {
    // Arrange
    // Act
    const client = new LinkwardenClient({ baseUrl: "https://example.com//", token: "tok" });

    // Assert
    expect(client.baseUrl).toBe("https://example.com");
  });

  it("sends no Authorization header without a token", async () => {
    // Arrange
    let headers = new Headers();
    const client = new LinkwardenClient({
      baseUrl: "https://example.com",
      fetch: (_input, init) => {
        headers = new Headers(init.headers);
        return Promise.resolve(Response.json({ response: { INSTANCE_VERSION: "v2.17.0" } }));
      },
    });

    // Act
    const config = await client.config.get();

    // Assert
    expect(config.INSTANCE_VERSION).toBe("v2.17.0");
    expect(headers.has("Authorization")).toBe(false);
    expect(headers.get("Accept")).toBe("application/json");
  });
});
