#!/usr/bin/env bash
# Preview or publish the Public Session landing page (Cloudflare Worker "monomi-links").
#   ./deploy.sh preview   upload a new version and print its preview URL
#   ./deploy.sh publish   send 100% of link.monomiagency.com traffic to the latest version
set -euo pipefail
cd "$(dirname "$0")"

case "${1:-}" in
  preview)
    npx wrangler versions upload --message "${2:-landing page update}"
    ;;
  publish)
    latest=$(npx wrangler versions list --json | node -e '
      let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
        const v = JSON.parse(s);
        v.sort((a, b) => new Date(b.metadata.created_on) - new Date(a.metadata.created_on));
        process.stdout.write(v[0].id);
      });')
    echo "Publishing version $latest"
    npx wrangler versions deploy "$latest@100%" --yes --message "${2:-publish landing page}"
    ;;
  *)
    echo "usage: $0 preview|publish [message]" >&2
    exit 1
    ;;
esac
