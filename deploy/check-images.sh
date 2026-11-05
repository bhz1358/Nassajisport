#!/usr/bin/env bash
# Shows which posts have images and which don't (and why).
#   sudo bash deploy/check-images.sh
set -euo pipefail
exec sudo -u nassaji -H node /opt/nassaji/app/scripts/check-images.mjs /var/lib/nassaji/data
