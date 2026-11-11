import { expect, it } from "vitest";
import { ArchiveFormat } from "../../src/index.ts";
import { cleanup, createTestCollection, createTestLink, describeE2E, newClient, testPng, uniqueUrl } from "./helpers.ts";

describeE2E("ArchivesService", () => {
  it("upload attaches a file as the link's archive", async () => {
    // Arrange
    const client = newClient();
    const link = await createTestLink(client, (await createTestCollection(client)).id);

    // Act
    const updated = await client.archives.upload(link.id, {
      format: ArchiveFormat.PNG,
      filename: "screenshot.png",
      file: testPng(),
    });

    // Assert
    expect(updated.id).toBe(link.id);
    expect(updated.image).toBeTruthy();
  });

  it("get downloads the uploaded archive", async () => {
    // Arrange
    const client = newClient();
    const link = await createTestLink(client, (await createTestCollection(client)).id);
    const data = testPng();
    await client.archives.upload(link.id, { format: ArchiveFormat.PNG, filename: "screenshot.png", file: data });

    // Act
    const file = await client.archives.get(link.id, { format: ArchiveFormat.PNG });

    // Assert
    expect(file.contentType).toBe("image/png");
    expect(file.data).toEqual(data);
  });

  it("get rejects an inaccessible link", async () => {
    // Arrange
    const client = newClient();

    // Act
    const result = client.archives.get(999_999_999, { format: ArchiveFormat.PNG });

    // Assert
    await expect(result).rejects.toMatchObject({ name: "LinkwardenApiError" });
  });

  it("uploadStandalone creates a link from a file", async () => {
    // Arrange
    const client = newClient();
    const url = uniqueUrl();

    // Act
    const link = await client.archives.uploadStandalone({
      url,
      format: ArchiveFormat.PNG,
      filename: "screenshot.png",
      file: new Blob([testPng()]),
    });
    cleanup(() => client.links.delete(link.id));

    // Assert
    expect(link.id).toBeGreaterThan(0);
    expect(link.url).toBe(url);
  });

  // The API rejects application/octet-stream parts, so a file without a recognisable
  // extension is uploaded with its sniffed type.
  it("upload sniffs the content type of a file without an extension", async () => {
    // Arrange
    const client = newClient();
    const link = await createTestLink(client, (await createTestCollection(client)).id);
    const data = testPng();

    // Act
    await client.archives.upload(link.id, { format: ArchiveFormat.PNG, filename: "screenshot", file: data.buffer });

    // Assert
    const file = await client.archives.get(link.id, { format: ArchiveFormat.PNG });
    expect(file.data).toEqual(data);
  });
});
