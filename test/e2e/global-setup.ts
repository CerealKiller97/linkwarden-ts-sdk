export default function setup(): void {
  const configured = Boolean(process.env["LINKWARDEN_URL"]) && Boolean(process.env["LINKWARDEN_TOKEN"]);
  if (configured) {
    return;
  }

  if (process.env["CI"]) {
    throw new Error("LINKWARDEN_URL and LINKWARDEN_TOKEN must be set in CI");
  }

  console.warn(
    "LINKWARDEN_URL / LINKWARDEN_TOKEN not set: skipping the E2E tests. " +
      'Start an instance with `scripts/dev-linkwarden.sh up` and `eval "$(scripts/dev-linkwarden.sh env)"`.',
  );
}
