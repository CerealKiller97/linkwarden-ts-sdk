import { expect, it } from "vitest";
import { cleanup, createTestCollection, createTestHighlight, createTestLink, describeE2E, newClient } from "./helpers.ts";

describeE2E("HighlightsService", () => {
  it("create adds a highlight to a link", async () => {
    // Arrange
    const client = newClient();
    const link = await createTestLink(client, (await createTestCollection(client)).id);

    // Act
    const highlight = await client.highlights.create({
      color: "yellow",
      comment: "worth rereading",
      startOffset: 0,
      endOffset: 5,
      text: "Hello",
      linkId: link.id,
    });
    cleanup(() => client.highlights.delete(highlight.id));

    // Assert
    expect(highlight).toMatchObject({
      linkId: link.id,
      color: "yellow",
      comment: "worth rereading",
      text: "Hello",
      startOffset: 0,
      endOffset: 5,
    });
    expect(highlight.id).toBeGreaterThan(0);
  });

  it("create updates a highlight at the same offsets instead of duplicating it", async () => {
    // Arrange
    const client = newClient();
    const link = await createTestLink(client, (await createTestCollection(client)).id);
    const original = await createTestHighlight(client, link.id);

    // Act
    const updated = await client.highlights.create({
      color: "red",
      startOffset: original.startOffset,
      endOffset: original.endOffset,
      text: original.text,
      linkId: link.id,
    });

    // Assert
    expect(updated.id).toBe(original.id);
    expect(updated.color).toBe("red");
    expect(await client.links.highlights(link.id)).toHaveLength(1);
  });

  it("delete removes the highlight", async () => {
    // Arrange
    const client = newClient();
    const link = await createTestLink(client, (await createTestCollection(client)).id);
    const highlight = await createTestHighlight(client, link.id);

    // Act
    await client.highlights.delete(highlight.id);

    // Assert
    expect(await client.links.highlights(link.id)).toEqual([]);
  });
});
