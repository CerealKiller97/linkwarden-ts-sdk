/**
 * Checks CHANGELOG.md against the project's Keep a Changelog rules, and prints a release's
 * notes for the release workflow.
 *
 *   node scripts/changelog.ts check           check the whole file (pnpm lint, CI)
 *   node scripts/changelog.ts notes v1.2.0    check, then print the notes for v1.2.0
 *
 * The rules are the ones at the top of CHANGELOG.md, matching linkwarden-go-sdk:
 * - "## [Unreleased]" comes first, then releases as "## [x.y.z] - YYYY-MM-DD", newest first,
 *   optionally followed by " [YANKED]".
 * - Every entry starts with "🧪 Tested against Linkwarden: vX.Y.Z".
 * - Changes sit under the six Keep a Changelog headings, in order, none of them empty, and a
 *   release has at least one.
 * - Link references at the bottom compare each release with the one before it.
 *
 * It runs with Node's built-in TypeScript support and uses only Node built-ins.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

/** The allowed change headings, in the order they must appear. */
export const CHANGE_HEADINGS = [
  "✨ Added",
  "🔄 Changed",
  "⚠️ Deprecated",
  "🗑️ Removed",
  "🐛 Fixed",
  "🔒 Security",
] as const;

export type ChangelogOptions = {
  /** The repository's web URL, used to check the link references. */
  repoUrl: string;
};

export type ChangelogProblem = {
  /** The 1-based line in CHANGELOG.md, or 0 for the file as a whole. */
  line: number;
  message: string;
};

export type ChangelogEntry = {
  /** "Unreleased", or the release's version without the "v". */
  version: string;
  date: string | undefined;
  yanked: boolean;
  /** The line of the entry's "## [...]" heading. */
  line: number;
  /** The Linkwarden version from the "Tested against" line. */
  testedAgainst: string | undefined;
  /** The change headings, in the order they appear. */
  headings: string[];
  /** The entry's text below its heading, as written. */
  body: string;
};

const SEMVER =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:0|[1-9]\d*|\d*[A-Za-z-][0-9A-Za-z-]*))*))?$/;
const ENTRY_HEADING = /^## \[([^\]]+)\](.*)$/;
const RELEASE_SUFFIX = /^ - (\d{4}-\d{2}-\d{2})( \[YANKED\])?$/;
const TESTED_LINE = /^🧪 Tested against Linkwarden: (v\d+\.\d+\.\d+\S*)$/;
const LINK_REFERENCE = /^\[([^\]]+)\]: (\S+)$/;

type ParsedChangelog = {
  entries: ChangelogEntry[];
  /** Link references, keyed by their lower-cased label. */
  links: Map<string, { url: string; line: number }>;
  problems: ChangelogProblem[];
};

function parse(text: string): ParsedChangelog {
  const lines = text.split("\n");
  const entries: ChangelogEntry[] = [];
  const links = new Map<string, { url: string; line: number }>();
  const problems: ChangelogProblem[] = [];
  const bodies: string[][] = [];
  let inComment = false;
  let inLinks = false;

  lines.forEach((raw, index) => {
    const line = raw.trimEnd();
    const lineNumber = index + 1;

    // HTML comments hold the how-to notes, whose examples look like headings.
    if (inComment || line.trimStart().startsWith("<!--")) {
      inComment = !line.includes("-->");
      return;
    }

    const link = LINK_REFERENCE.exec(line);
    if (link?.[1] !== undefined && link[2] !== undefined && entries.length > 0) {
      inLinks = true;
      const label = link[1].toLowerCase();
      if (links.has(label)) {
        problems.push({ line: lineNumber, message: `Duplicate link reference [${link[1]}]` });
      }
      links.set(label, { url: link[2], line: lineNumber });
      return;
    }

    const heading = ENTRY_HEADING.exec(line);
    if (heading?.[1] !== undefined && heading[2] !== undefined) {
      if (inLinks) {
        problems.push({ line: lineNumber, message: "Entries must come before the link references" });
      }
      entries.push(parseEntryHeading(heading[1], heading[2], lineNumber, problems));
      bodies.push([]);
      return;
    }

    if (line.startsWith("## ")) {
      problems.push({ line: lineNumber, message: `"${line}" isn't an entry heading like "## [1.2.3] - 2026-01-31"` });
      return;
    }

    if (inLinks && line !== "") {
      problems.push({ line: lineNumber, message: "Only link references may follow the first link reference" });
      return;
    }

    bodies.at(-1)?.push(line);
  });

  entries.forEach((entry, index) => {
    const body = bodies[index] ?? [];
    entry.body = body.join("\n");
    checkEntryBody(entry, body, problems);
  });

  return { entries, links, problems };
}

function parseEntryHeading(
  version: string,
  suffix: string,
  line: number,
  problems: ChangelogProblem[],
): ChangelogEntry {
  const entry: ChangelogEntry = {
    version,
    date: undefined,
    yanked: false,
    line,
    testedAgainst: undefined,
    headings: [],
    body: "",
  };

  if (version === "Unreleased") {
    if (suffix !== "") {
      problems.push({ line, message: '"## [Unreleased]" takes no date or other text' });
    }
    return entry;
  }

  if (!SEMVER.test(version)) {
    problems.push({ line, message: `"${version}" isn't a semantic version like 1.2.3 (leave out the "v")` });
  }

  const release = RELEASE_SUFFIX.exec(suffix);
  if (release?.[1] === undefined) {
    problems.push({ line, message: `Release headings look like "## [${version}] - YYYY-MM-DD"` });
    return entry;
  }

  entry.date = release[1];
  entry.yanked = release[2] !== undefined;
  if (!isRealDate(release[1])) {
    problems.push({ line, message: `${release[1]} isn't a real date` });
  }

  return entry;
}

function checkEntryBody(entry: ChangelogEntry, body: string[], problems: ChangelogProblem[]): void {
  const firstText = body.findIndex((line) => line !== "");
  const tested = firstText >= 0 ? TESTED_LINE.exec(body[firstText] ?? "") : null;
  if (tested?.[1] === undefined) {
    problems.push({
      line: entry.line,
      message: `[${entry.version}] must start with "🧪 Tested against Linkwarden: vX.Y.Z"`,
    });
  } else {
    entry.testedAgainst = tested[1];
  }

  let currentHeading: { name: string; line: number; items: number } | undefined;
  const closeHeading = () => {
    if (currentHeading && currentHeading.items === 0) {
      problems.push({ line: currentHeading.line, message: `"### ${currentHeading.name}" is empty: remove it` });
    }
  };

  body.forEach((line, index) => {
    const lineNumber = entry.line + 1 + index;

    if (line.startsWith("#")) {
      const match = /^### (.+)$/.exec(line);
      const name = match?.[1];
      if (name === undefined || !(CHANGE_HEADINGS as readonly string[]).includes(name)) {
        problems.push({
          line: lineNumber,
          message: `"${line}" isn't a change heading. Use one of: ${CHANGE_HEADINGS.map((h) => `### ${h}`).join(", ")}`,
        });
        return;
      }

      const order = CHANGE_HEADINGS.indexOf(name as (typeof CHANGE_HEADINGS)[number]);
      const previous = entry.headings.at(-1);
      if (entry.headings.includes(name)) {
        problems.push({ line: lineNumber, message: `"### ${name}" appears twice in [${entry.version}]` });
      } else if (previous !== undefined && order < CHANGE_HEADINGS.indexOf(previous as (typeof CHANGE_HEADINGS)[number])) {
        problems.push({
          line: lineNumber,
          message: `"### ${name}" must come before "### ${previous}" (order: ${CHANGE_HEADINGS.join(", ")})`,
        });
      }

      closeHeading();
      entry.headings.push(name);
      currentHeading = { name, line: lineNumber, items: 0 };
      return;
    }

    if (line.startsWith("- ")) {
      if (currentHeading) {
        currentHeading.items++;
      } else {
        problems.push({ line: lineNumber, message: "Changes must sit under a ### heading such as \"### ✨ Added\"" });
      }
    }
  });
  closeHeading();

  if (entry.version !== "Unreleased" && entry.headings.length === 0) {
    problems.push({ line: entry.line, message: `[${entry.version}] lists no changes` });
  }
}

/** Checks the whole changelog and returns its problems, in line order. */
export function checkChangelog(text: string, options: ChangelogOptions): ChangelogProblem[] {
  const { entries, links, problems } = parse(text);

  if (!/^# Changelog$/m.test(text)) {
    problems.push({ line: 1, message: 'The file must start with "# Changelog"' });
  }
  for (const [name, url] of [
    ["Keep a Changelog", "https://keepachangelog.com/en/1.1.0/"],
    ["Semantic Versioning", "https://semver.org/spec/v2.0.0.html"],
  ] as const) {
    if (!text.includes(url)) {
      problems.push({ line: 1, message: `The introduction must link to ${name} (${url})` });
    }
  }

  const unreleased = entries.filter((entry) => entry.version === "Unreleased");
  if (unreleased.length !== 1 || entries[0]?.version !== "Unreleased") {
    problems.push({ line: entries[0]?.line ?? 0, message: 'There must be one "## [Unreleased]" entry, before every release' });
  }

  const releases = entries.filter((entry) => entry.version !== "Unreleased" && SEMVER.test(entry.version));
  const seen = new Set<string>();
  releases.forEach((release, index) => {
    if (seen.has(release.version)) {
      problems.push({ line: release.line, message: `[${release.version}] is listed twice` });
    }
    seen.add(release.version);

    const older = releases[index + 1];
    if (older && compareVersions(release.version, older.version) <= 0) {
      problems.push({ line: older.line, message: `Releases must be newest first: [${older.version}] is listed below [${release.version}]` });
    }
    if (older?.date !== undefined && release.date !== undefined && older.date > release.date) {
      problems.push({ line: older.line, message: `[${older.version}] is dated after the newer [${release.version}]` });
    }
  });

  checkLinks(entries, releases, links, options.repoUrl, problems);

  return problems.sort((a, b) => a.line - b.line);
}

function checkLinks(
  entries: ChangelogEntry[],
  releases: ChangelogEntry[],
  links: Map<string, { url: string; line: number }>,
  repoUrl: string,
  problems: ChangelogProblem[],
): void {
  const expected = new Map<string, string>();
  const latest = releases[0];
  expected.set("unreleased", latest ? `${repoUrl}/compare/v${latest.version}...HEAD` : `${repoUrl}/commits/main`);
  releases.forEach((release, index) => {
    const older = releases[index + 1];
    expected.set(
      release.version.toLowerCase(),
      older ? `${repoUrl}/compare/v${older.version}...v${release.version}` : `${repoUrl}/releases/tag/v${release.version}`,
    );
  });

  const lastLine = Math.max(0, ...entries.map((entry) => entry.line));
  for (const [label, url] of expected) {
    const actual = links.get(label);
    if (!actual) {
      problems.push({ line: lastLine, message: `Missing link reference: [${label}]: ${url}` });
    } else if (actual.url !== url) {
      problems.push({ line: actual.line, message: `[${label}] should link to ${url}` });
    }
  }
  for (const [label, { line }] of links) {
    if (!expected.has(label)) {
      problems.push({ line, message: `Link reference [${label}] has no matching entry` });
    }
  }
}

/**
 * Returns the notes for a release tag, such as "v1.2.0": its entry's text below the
 * heading. Throws when the changelog has problems, the entry is missing or yanked, or its
 * "Tested against" version isn't `pinnedLinkwarden`.
 */
export function releaseNotes(text: string, tag: string, pinnedLinkwarden: string, options: ChangelogOptions): string {
  const version = tag.replace(/^v/, "");
  const failures: string[] = [];

  if (!tag.startsWith("v") || !SEMVER.test(version)) {
    failures.push(`"${tag}" isn't a version tag like v1.2.3`);
  }
  for (const problem of checkChangelog(text, options)) {
    failures.push(`CHANGELOG.md:${problem.line}: ${problem.message}`);
  }

  const entry = parse(text).entries.find((candidate) => candidate.version === version);
  if (!entry) {
    failures.push(`CHANGELOG.md has no "## [${version}] - YYYY-MM-DD" entry. Rename [Unreleased] to it before tagging.`);
  } else {
    if (entry.yanked) {
      failures.push(`[${version}] is marked [YANKED]`);
    }
    if (entry.testedAgainst !== undefined && entry.testedAgainst !== pinnedLinkwarden) {
      failures.push(
        `[${version}] says "Tested against Linkwarden: ${entry.testedAgainst}", but .linkwarden-version pins ${pinnedLinkwarden}`,
      );
    }
  }

  if (failures.length > 0 || !entry) {
    throw new Error(failures.join("\n"));
  }

  return trimBlankLines(entry.body);
}

/** Compares two semantic versions: negative when `a` is older, positive when newer. */
export function compareVersions(a: string, b: string): number {
  const [aCore = "", aPre] = a.split(/-(.*)/s);
  const [bCore = "", bPre] = b.split(/-(.*)/s);
  const aParts = aCore.split(".").map(Number);
  const bParts = bCore.split(".").map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (aParts[i] ?? 0) - (bParts[i] ?? 0);
    if (diff !== 0) return diff;
  }

  // A pre-release sorts before its release.
  if (aPre === undefined || bPre === undefined) {
    return aPre === bPre ? 0 : aPre === undefined ? 1 : -1;
  }

  const aIds = aPre.split(".");
  const bIds = bPre.split(".");
  for (let i = 0; i < Math.max(aIds.length, bIds.length); i++) {
    const x = aIds[i];
    const y = bIds[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    const xNum = /^\d+$/.test(x);
    const yNum = /^\d+$/.test(y);
    if (xNum && yNum && Number(x) !== Number(y)) return Number(x) - Number(y);
    if (xNum !== yNum) return xNum ? -1 : 1;
    if (x !== y) return x < y ? -1 : 1;
  }

  return 0;
}

function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function trimBlankLines(text: string): string {
  return text.replace(/^\s*\n/, "").replace(/\s+$/, "");
}

function repoUrlFrom(packageJson: unknown): string {
  const repository = (packageJson as { repository?: { url?: unknown } | string }).repository;
  const raw = typeof repository === "string" ? repository : repository?.url;
  if (typeof raw !== "string") {
    throw new Error('package.json has no "repository" URL');
  }

  return raw.replace(/^git\+/, "").replace(/\.git$/, "");
}

function main(args: string[]): number {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const text = readFileSync(join(root, "CHANGELOG.md"), "utf8");
  const options = { repoUrl: repoUrlFrom(JSON.parse(readFileSync(join(root, "package.json"), "utf8"))) };
  const [command, tag] = args;

  if (command === "check") {
    const problems = checkChangelog(text, options);
    for (const { line, message } of problems) {
      // GitHub Actions turns these into annotations on the pull request.
      console.error(process.env["GITHUB_ACTIONS"] ? `::error file=CHANGELOG.md,line=${line}::${message}` : `CHANGELOG.md:${line}: ${message}`);
    }
    if (problems.length === 0) {
      console.log("CHANGELOG.md follows the Keep a Changelog rules.");
    }
    return problems.length === 0 ? 0 : 1;
  }

  if (command === "notes" && tag) {
    const pinned = readFileSync(join(root, ".linkwarden-version"), "utf8").trim();
    try {
      console.log(releaseNotes(text, tag, pinned, options));
      return 0;
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      return 1;
    }
  }

  console.error("usage: node scripts/changelog.ts check | notes <tag, e.g. v1.2.0>");
  return 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = main(process.argv.slice(2));
}
