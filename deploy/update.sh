#!/usr/bin/env bash
# Deploys a newer version of the code. Data, passwords and settings are kept.
#   cd <new copy of the project> && sudo bash deploy/update.sh
# Same optional variables as install.sh (NPM_REGISTRY, DOMAIN, ...).
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run with sudo: sudo bash deploy/update.sh" >&2; exit 1; }
[[ -f /etc/nassaji.env ]] || { echo "Not installed yet; run deploy/install.sh first." >&2; exit 1; }

# A backup before every update, in case the new version misbehaves.
mkdir -p -m 700 /var/backups/nassaji
umask 077
# Data files only (photos are in the daily mirror); the 5 newest of these are kept.
tar -czf "/var/backups/nassaji/data-before-update-$(date +%F-%H%M).tar.gz" --exclude=data/uploads -C /var/lib/nassaji data
ls -t /var/backups/nassaji/data-before-update-*.tar.gz 2>/dev/null | tail -n +6 | xargs -r rm -f

exec bash "$(dirname "${BASH_SOURCE[0]}")/install.sh"
