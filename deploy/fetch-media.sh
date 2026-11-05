#!/usr/bin/env bash
# Downloads the old WordPress site's images straight from its public URLs
# into the new site, so nothing has to be copied out of cPanel.
#   sudo bash deploy/fetch-media.sh [https://nassajisport.com] [--xml export.xml]
# Best run after importing the WordPress XML in the admin panel. Safe to re-run.
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run with sudo: sudo bash deploy/fetch-media.sh" >&2; exit 1; }
SITE="${1:-https://nassajisport.com}"
[[ $# -gt 0 ]] && shift
KEEP_ENV=HTTP_PROXY,HTTPS_PROXY,NO_PROXY,http_proxy,https_proxy,no_proxy,NODE_EXTRA_CA_CERTS
exec sudo --preserve-env="$KEEP_ENV" -u nassaji -H node /opt/nassaji/app/scripts/fetch-wp-media.mjs "$SITE" --data /var/lib/nassaji/data "$@"
