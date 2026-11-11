#!/usr/bin/env bash
#
# Prints the CHANGELOG.md section for a release, for use as its GitHub release notes.
# Fails if the section is missing, or if its "Tested against Linkwarden" line doesn't
# match the version pinned in .linkwarden-version (the one CI tests against).
#
#   scripts/release-notes.sh v1.2.0

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CHANGELOG="$ROOT_DIR/CHANGELOG.md"

tag="${1:?usage: $0 <tag, e.g. v1.2.0>}"
version="${tag#v}"
pinned="$(tr -d '[:space:]' <"$ROOT_DIR/.linkwarden-version")"

# The lines between "## [<version>]" and the next "## [" heading or link reference.
notes="$(awk -v v="$version" '
	index($0, "## [" v "]") == 1 { found = 1; next }
	found && (/^## \[/ || /^\[[^]]+\]: /) { exit }
	found { print }
' "$CHANGELOG")"

if [[ -z "${notes//[[:space:]]/}" ]]; then
	echo "error: CHANGELOG.md has no section for [$version]" >&2
	exit 1
fi

# The line may start with an emoji, e.g. "🧪 Tested against Linkwarden: v2.16.3".
tested="$(grep -m1 'Tested against Linkwarden:' <<<"$notes" | sed 's/.*Tested against Linkwarden:[[:space:]]*//; s/[[:space:]]*$//' || true)"
if [[ "$tested" != "$pinned" ]]; then
	echo "error: CHANGELOG.md [$version] says 'Tested against Linkwarden: ${tested:-<missing>}'," >&2
	echo "       but .linkwarden-version pins $pinned" >&2
	exit 1
fi

# Trim leading and trailing blank lines.
awk 'NF { started = 1 } started' <<<"$notes" | awk '{ lines[NR] = $0 } NF { last = NR } END { for (i = 1; i <= last; i++) print lines[i] }'
