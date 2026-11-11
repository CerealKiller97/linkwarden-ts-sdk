import { expect, it, vi } from "vitest";
import { ImportFormat } from "../../src/index.ts";
import {
  cleanup,
  createTestCollection,
  createTestLink,
  describeE2E,
  newClient,
  uniqueName,
  uniqueUrl,
} from "./helpers.ts";

describeE2E("MigrationsService", () => {
  it("export includes the user's collections and links", async () => {
    // Arrange
    const client = newClient();
    const collection = await createTestCollection(client);
    const link = await createTestLink(client, collection.id);

    // Act
    const data = await client.migrations.export();

    // Assert
    expect(() => JSON.parse(data) as unknown).not.toThrow();
    expect(data).toContain(collection.name);
    expect(data).toContain(link.url);
  });

  it("import loads browser bookmarks into a new collection", async () => {
    // Arrange
    const client = newClient();
    const folder = uniqueName("imported");
    const url = uniqueUrl();
    const bookmarks = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE>
<H1>Bookmarks</H1>
<DL><p>
    <DT><H3>${folder}</H3>
    <DL><p>
        <DT><A HREF="${url}">Imported link</A>
    </DL><p>
</DL><p>
`;

    // Act
    await client.migrations.import(ImportFormat.BookmarksHTML, bookmarks);

    // Assert
    // The import runs in the background; wait for its folder to show up as a collection.
    const imported = await vi.waitFor(
      async () => {
        const found = (await client.collections.list()).find((c) => c.name === folder);
        if (!found) throw new Error(`collection ${folder} not imported yet`);
        return found;
      },
      { timeout: 60_000, interval: 1_000 },
    );
    cleanup(() => client.collections.delete(imported.id));
    const links = await client.links.list({ collectionId: imported.id });
    expect(links.map((l) => l.url)).toEqual([url]);
  });
});
