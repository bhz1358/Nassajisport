#!/usr/bin/env bash
# Puts the league table (and with --fixtures, the schedule) from the code onto the live site.
#   sudo bash deploy/apply-league.sh             # table only
#   sudo bash deploy/apply-league.sh --fixtures  # schedule only
#   sudo bash deploy/apply-league.sh --standings --fixtures
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run with sudo: sudo bash deploy/apply-league.sh" >&2; exit 1; }
exec sudo -u nassaji -H node /opt/nassaji/app/scripts/apply-league.mjs /var/lib/nassaji/data "$@"
