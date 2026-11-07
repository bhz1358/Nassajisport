#!/usr/bin/env bash
# Shows what the site would read from a league-table page, without saving anything.
#   bash deploy/check-standings.sh "https://www.iranleague.ir/fa/League-Full-Table" [--text]
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
exec node scripts/check-standings.mjs "$@"
