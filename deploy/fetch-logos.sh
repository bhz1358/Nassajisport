#!/usr/bin/env bash
# Downloads team logos from a web page and assigns them to the league's teams.
#   sudo bash deploy/fetch-logos.sh "https://metaparsic.com/the-most-beautiful-logos-of-iranian-football-clubs/" [--force]
# --force replaces logos that were already set.
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run with sudo: sudo bash deploy/fetch-logos.sh URL" >&2; exit 1; }
[[ $# -ge 1 ]] || { echo "Give the page address: sudo bash deploy/fetch-logos.sh URL" >&2; exit 1; }
KEEP_ENV=HTTP_PROXY,HTTPS_PROXY,NO_PROXY,http_proxy,https_proxy,no_proxy,NODE_EXTRA_CA_CERTS
exec sudo --preserve-env="$KEEP_ENV" -u nassaji -H node /opt/nassaji/app/scripts/fetch-logos.mjs /var/lib/nassaji/data "$@"
