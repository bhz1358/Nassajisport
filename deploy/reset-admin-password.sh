#!/usr/bin/env bash
# Gives a panel user a new random password (when it's lost) and shows it once on screen.
#   sudo bash deploy/reset-admin-password.sh            # user "admin"
#   sudo bash deploy/reset-admin-password.sh someone    # another user
# The user's other sessions end and an account lock (wrong passwords) is lifted.
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run as root: sudo bash deploy/reset-admin-password.sh"; exit 1; }
USER_NAME="${1:-admin}"
DATA_DIR=$(grep -oP '^DATA_DIR=\K.*' /etc/nassaji.env 2>/dev/null || echo /var/lib/nassaji/data)
USERS="$DATA_DIR/users.json"
[[ -f "$USERS" ]] || { echo "No panel users yet: the first login uses ADMIN_USERNAME / ADMIN_PASSWORD from /etc/nassaji.env:"; grep -E '^ADMIN_(USERNAME|PASSWORD)=' /etc/nassaji.env; exit 0; }

PASSWORD=$(head -c 24 /dev/urandom | base64 | tr -d '/+=' | head -c 18)
OWNER=$(stat -c '%U:%G' "$USERS")
cp -p "$USERS" "$USERS.before-reset"
USERS="$USERS" GUARD="$DATA_DIR/login-guard.json" NAME="$USER_NAME" PASS="$PASSWORD" node -e '
const fs = require("fs"), crypto = require("crypto");
const users = JSON.parse(fs.readFileSync(process.env.USERS, "utf8"));
const u = users.find((x) => x.username.toLowerCase() === process.env.NAME.toLowerCase());
if (!u) { console.error("No such user. Users: " + users.map((x) => x.username).join(", ")); process.exit(2); }
const salt = crypto.randomBytes(16);
u.password = salt.toString("hex") + ":" + crypto.scryptSync(process.env.PASS, salt, 64).toString("hex");
u.sv = (u.sv || 0) + 1;
fs.writeFileSync(process.env.USERS, JSON.stringify(users, null, 2));
try {
  const g = JSON.parse(fs.readFileSync(process.env.GUARD, "utf8"));
  delete g.fails[u.username.toLowerCase()];
  fs.writeFileSync(process.env.GUARD, JSON.stringify(g));
} catch {}
console.log("User: " + u.username);
'
chown "$OWNER" "$USERS"
[[ -f "$DATA_DIR/login-guard.json" ]] && chown "$OWNER" "$DATA_DIR/login-guard.json"
rm -f "$USERS.before-reset"
# Also clears the per-address brake on wrong passwords (kept in memory).
systemctl restart nassaji
echo "New password: $PASSWORD"
echo "Sign in at /admin/ and change it right away (panel → «حساب من»)."
