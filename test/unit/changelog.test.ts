import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkChangelog, compareVersions, releaseNotes } from "../../scripts/changelog.ts";

const repoUrl = "https://github.com/CerealKiller97/linkwarden-ts-sdk";
const options = { repoUrl };

const header = `# Changelog

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!--
    ### ✨ Added       new features
  "## [x.y.z] - YYYY-MM-DD"
-->
`;

const valid = `${header}
## [Unreleased]

🧪 Tested against Linkwarden: v2.17.0

## [1.1.0] - 2026-11-11

🧪 Tested against Linkwarden: v2.17.0

🎉 Support for Linkwarden v2.17.0.

### ✨ Added

- \`links.reorder\`.

### 🔄 Changed

- 💥 **Breaking:** something.

### ⚠️ Deprecated

- \`isPrivate\`.

## [1.0.0] - 2026-11-03

🧪 Tested against Linkwarden: v2.16.3

### 🐛 Fixed

- A bug.

[unreleased]: ${repoUrl}/compare/v1.1.0...HEAD
[1.1.0]: ${repoUrl}/compare/v1.0.0...v1.1.0
[1.0.0]: ${repoUrl}/releases/tag/v1.0.0
`;

const messages = (text: string) => checkChangelog(text, options).map((p) => p.message);

describe("checkChangelog", () => {
  it("accepts a changelog that follows the rules", () => {
    // Arrange
    // Act
    const problems = checkChangelog(valid, options);

    // Assert
    expect(problems).toEqual([]);
  });

  it("accepts the project's own CHANGELOG.md", () => {
    // Arrange
    const text = readFileSync(new URL("../../CHANGELOG.md", import.meta.url), "utf8");

    // Act
    const problems = checkChangelog(text, options);

    // Assert
    expect(problems).toEqual([]);
  });

  it.each([
    {
      name: "headings out of order",
      text: valid.replace("### 🔄 Changed\n\n- 💥 **Breaking:** something.\n\n### ⚠️ Deprecated\n\n- `isPrivate`.",
        "### ⚠️ Deprecated\n\n- `isPrivate`.\n\n### 🔄 Changed\n\n- 💥 **Breaking:** something."),
      want: '"### 🔄 Changed" must come before "### ⚠️ Deprecated"',
    },
    { name: "an unknown heading", text: valid.replace("### 🐛 Fixed", "### Bug fixes"), want: '"### Bug fixes" isn\'t a change heading' },
    { name: "a heading without its emoji", text: valid.replace("### ✨ Added\n\n- `links.reorder`", "### Added\n\n- `links.reorder`"), want: '"### Added" isn\'t a change heading' },
    { name: "an empty heading", text: valid.replace("### 🐛 Fixed\n\n- A bug.\n", "### 🐛 Fixed\n"), want: '"### 🐛 Fixed" is empty' },
    { name: "a duplicated heading", text: valid.replace("### ⚠️ Deprecated", "### 🔄 Changed"), want: '"### 🔄 Changed" appears twice' },
    { name: "a change outside a heading", text: valid.replace("🎉 Support for Linkwarden v2.17.0.", "- stray change"), want: "Changes must sit under a ### heading" },
    { name: "a release without changes", text: valid.replace("### 🐛 Fixed\n\n- A bug.\n", ""), want: "[1.0.0] lists no changes" },
    { name: "a missing Tested line", text: valid.replace("🧪 Tested against Linkwarden: v2.16.3\n", ""), want: '[1.0.0] must start with "🧪 Tested against Linkwarden: vX.Y.Z"' },
    { name: "a missing date", text: valid.replace("## [1.0.0] - 2026-11-03", "## [1.0.0]"), want: 'Release headings look like "## [1.0.0] - YYYY-MM-DD"' },
    { name: "an impossible date", text: valid.replace("2026-11-03", "2026-02-30"), want: "2026-02-30 isn't a real date" },
    { name: "a v-prefixed version", text: valid.replace("## [1.0.0]", "## [v1.0.0]"), want: '"v1.0.0" isn\'t a semantic version' },
    { name: "a missing Unreleased", text: valid.replace("## [Unreleased]\n\n🧪 Tested against Linkwarden: v2.17.0\n", ""), want: 'There must be one "## [Unreleased]" entry' },
    {
      name: "releases out of order",
      text: valid.replace("## [1.1.0] - 2026-11-11", "## [0.9.0] - 2026-11-11").replace("[1.1.0]: ", "[0.9.0]: "),
      want: "Releases must be newest first: [1.0.0] is listed below [0.9.0]",
    },
    { name: "a newer release dated earlier", text: valid.replace("2026-11-11", "2026-11-01"), want: "[1.0.0] is dated after the newer [1.1.0]" },
    { name: "a missing link", text: valid.replace(`[1.0.0]: ${repoUrl}/releases/tag/v1.0.0\n`, ""), want: `Missing link reference: [1.0.0]: ${repoUrl}/releases/tag/v1.0.0` },
    { name: "a stale Unreleased link", text: valid.replace("compare/v1.1.0...HEAD", "compare/v1.0.0...HEAD"), want: `[unreleased] should link to ${repoUrl}/compare/v1.1.0...HEAD` },
    { name: "a link without an entry", text: `${valid}[0.1.0]: ${repoUrl}/releases/tag/v0.1.0\n`, want: "Link reference [0.1.0] has no matching entry" },
  ])("rejects $name", ({ text, want }) => {
    // Arrange
    // Act
    const got = messages(text);

    // Assert
    expect(got.some((message) => message.includes(want)), `${JSON.stringify(got)} should include ${want}`).toBe(true);
  });

  it("accepts a yanked release and a pre-release", () => {
    // Arrange
    const text = valid
      .replace("## [1.1.0] - 2026-11-11", "## [1.1.0] - 2026-11-11 [YANKED]")
      .replace("## [1.1.0]", "## [1.2.0-rc.1] - 2026-11-12\n\n🧪 Tested against Linkwarden: v2.17.0\n\n### 🐛 Fixed\n\n- A fix.\n\n## [1.1.0]")
      .replace(`[unreleased]: ${repoUrl}/compare/v1.1.0...HEAD`, `[unreleased]: ${repoUrl}/compare/v1.2.0-rc.1...HEAD\n[1.2.0-rc.1]: ${repoUrl}/compare/v1.1.0...v1.2.0-rc.1`);

    // Act
    const problems = checkChangelog(text, options);

    // Assert
    expect(problems).toEqual([]);
  });

  it("links to the commits when nothing is released yet", () => {
    // Arrange
    const text = `${header}\n## [Unreleased]\n\n🧪 Tested against Linkwarden: v2.17.0\n\n[unreleased]: ${repoUrl}/commits/main\n`;

    // Act
    const problems = checkChangelog(text, options);

    // Assert
    expect(problems).toEqual([]);
  });
});

describe("releaseNotes", () => {
  it("returns the entry's text below its heading", () => {
    // Arrange
    // Act
    const notes = releaseNotes(valid, "v1.0.0", "v2.16.3", options);

    // Assert
    expect(notes).toBe("🧪 Tested against Linkwarden: v2.16.3\n\n### 🐛 Fixed\n\n- A bug.");
  });

  it.each([
    { name: "a tag without an entry", tag: "v9.9.9", pinned: "v2.17.0", want: 'no "## [9.9.9] - YYYY-MM-DD" entry' },
    { name: "a different Linkwarden version", tag: "v1.1.0", pinned: "v2.18.0", want: ".linkwarden-version pins v2.18.0" },
    { name: "a tag that isn't a version", tag: "release-1", pinned: "v2.17.0", want: '"release-1" isn\'t a version tag' },
  ])("rejects $name", ({ tag, pinned, want }) => {
    // Arrange
    // Act
    const run = () => releaseNotes(valid, tag, pinned, options);

    // Assert
    expect(run).toThrow(want);
  });

  it("rejects a yanked release", () => {
    // Arrange
    const text = valid.replace("## [1.0.0] - 2026-11-03", "## [1.0.0] - 2026-11-03 [YANKED]");

    // Act
    const run = () => releaseNotes(text, "v1.0.0", "v2.16.3", options);

    // Assert
    expect(run).toThrow("[1.0.0] is marked [YANKED]");
  });

  it("rejects any changelog problem, not only the released entry's", () => {
    // Arrange
    const text = valid.replace("### 🐛 Fixed", "### Fixes");

    // Act
    const run = () => releaseNotes(text, "v1.1.0", "v2.17.0", options);

    // Assert
    expect(run).toThrow("isn't a change heading");
  });
});

describe("compareVersions", () => {
  it.each([
    ["1.0.0", "0.9.9", 1],
    ["1.10.0", "1.9.0", 1],
    ["1.0.0", "1.0.0-rc.1", 1],
    ["1.0.0-rc.2", "1.0.0-rc.10", -1],
    ["1.0.0-alpha", "1.0.0-alpha.1", -1],
    ["1.0.0-alpha.1", "1.0.0-beta", -1],
    ["1.2.3", "1.2.3", 0],
  ] as const)("compares %s with %s", (a, b, sign) => {
    // Arrange
    // Act
    const got = Math.sign(compareVersions(a, b));

    // Assert
    expect(got).toBe(sign);
  });
});
