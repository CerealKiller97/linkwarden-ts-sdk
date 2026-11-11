#!/usr/bin/env bash
#
# Runs a throwaway self-hosted Linkwarden in Docker for the SDK tests.
#
#   scripts/dev-linkwarden.sh up      start the stack, create a test user + API token
#   scripts/dev-linkwarden.sh env     print the export lines for LINKWARDEN_URL / LINKWARDEN_TOKEN
#   scripts/dev-linkwarden.sh logs    follow the Linkwarden container logs
#   scripts/dev-linkwarden.sh down    stop the stack (data is kept)
#   scripts/dev-linkwarden.sh reset   stop the stack and delete all its data
#
# After `up`, load the credentials into your shell and run the tests with:
#   eval "$(scripts/dev-linkwarden.sh env)"
#   pnpm test
#
# Overridable via environment: LINKWARDEN_PORT (3000), LINKWARDEN_VERSION (the version
# pinned in .linkwarden-version, which CI also tests against),
# DEV_USERNAME (dev), DEV_PASSWORD (devpassword).

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="$ROOT_DIR/docker-compose.yml"
SERVER_ENV="$ROOT_DIR/.env"
CLI_ENV="$ROOT_DIR/.env.cli"

PORT="${LINKWARDEN_PORT:-3000}"
BASE_URL="http://localhost:$PORT"
USERNAME="${DEV_USERNAME:-dev}"
PASSWORD="${DEV_PASSWORD:-devpassword}"

# Run the same Linkwarden version as CI unless the shell or .env picks another one.
if [[ -z "${LINKWARDEN_VERSION:-}" ]] && ! grep -qs '^LINKWARDEN_VERSION=' "$SERVER_ENV"; then
	LINKWARDEN_VERSION="$(tr -d '[:space:]' <"$ROOT_DIR/.linkwarden-version")"
	export LINKWARDEN_VERSION
fi

compose() {
	docker compose -f "$COMPOSE_FILE" "$@"
}

require() {
	for bin in "$@"; do
		command -v "$bin" >/dev/null || { echo "error: $bin is required" >&2; exit 1; }
	done
}

write_server_env() {
	[[ -f "$SERVER_ENV" ]] && return

	echo "Generating $SERVER_ENV"
	cat >"$SERVER_ENV" <<EOF
NEXTAUTH_URL=$BASE_URL/api/v1/auth
NEXTAUTH_SECRET=$(openssl rand -hex 32)
POSTGRES_PASSWORD=$(openssl rand -hex 16)
MEILI_MASTER_KEY=$(openssl rand -hex 16)
LINKWARDEN_PORT=$PORT
EOF
}

wait_for_server() {
	printf "Waiting for Linkwarden at %s " "$BASE_URL"
	for _ in $(seq 1 120); do
		if curl -fsS -o /dev/null "$BASE_URL/api/v1/logins" 2>/dev/null; then
			echo "ready"
			return
		fi
		printf "."
		sleep 2
	done
	echo
	echo "error: Linkwarden did not become ready in 4 minutes; check: $0 logs" >&2
	exit 1
}

# api METHOD PATH [JSON_BODY] [BEARER] — prints the response body, fails on non-2xx.
api() {
	local args=(-sS -X "$1" "$BASE_URL$2" -H "Content-Type: application/json" -w '\n%{http_code}')
	[[ -n "${3:-}" ]] && args+=(-d "$3")
	[[ -n "${4:-}" ]] && args+=(-H "Authorization: Bearer $4")

	local out status body
	out="$(curl "${args[@]}")"
	status="${out##*$'\n'}"
	body="${out%$'\n'*}"
	if [[ "$status" != 2* ]]; then
		echo "$body"
		return 1
	fi
	echo "$body"
}

bootstrap_token() {
	if [[ -f "$CLI_ENV" ]]; then
		echo "Reusing existing token from $CLI_ENV"
		return
	fi

	local body
	body="$(jq -n --arg u "$USERNAME" --arg p "$PASSWORD" '{name: "Dev User", username: $u, password: $p}')"
	if api POST /api/v1/users "$body" >/dev/null; then
		echo "Created user '$USERNAME'"
	else
		echo "User '$USERNAME' already exists (or registration failed), trying to log in"
	fi

	local session
	body="$(jq -n --arg u "$USERNAME" --arg p "$PASSWORD" '{username: $u, password: $p, sessionName: "dev-bootstrap"}')"
	session="$(api POST /api/v1/session "$body" | jq -r '.response.token')"

	# expires: 4 = never
	local token
	token="$(api POST /api/v1/tokens '{"name":"linkwarden-ts-sdk tests","expires":4}' "$session" | jq -r '.response.secretKey')"

	cat >"$CLI_ENV" <<EOF
export LINKWARDEN_URL="$BASE_URL"
export LINKWARDEN_TOKEN="$token"
EOF
	echo "Wrote API token to $CLI_ENV"
}

cmd_up() {
	require docker curl jq openssl
	docker info >/dev/null 2>&1 || { echo "error: Docker daemon is not running" >&2; exit 1; }

	write_server_env
	compose up -d
	wait_for_server
	bootstrap_token

	cat <<EOF

Linkwarden is running at $BASE_URL
  Web UI login:  $USERNAME / $PASSWORD

Point the tests at it:
  eval "\$($0 env)"
EOF
}

cmd_env() {
	[[ -f "$CLI_ENV" ]] || { echo "error: no token yet, run: $0 up" >&2; exit 1; }
	cat "$CLI_ENV"
}

case "${1:-}" in
	up) cmd_up ;;
	env) cmd_env ;;
	logs) compose logs -f linkwarden ;;
	down) compose down ;;
	reset)
		compose down -v
		rm -f "$SERVER_ENV" "$CLI_ENV"
		echo "Removed containers, volumes and generated env files"
		;;
	*)
		sed -n '3,15p' "$0" | sed 's/^# \{0,1\}//'
		exit 1
		;;
esac
