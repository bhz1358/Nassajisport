#!/usr/bin/env bash
# Server hardening for the Nassaji Sport site. Safe to run again (each step checks first).
#   sudo bash deploy/harden.sh
# What it does:
#   1. nginx: hides its version, limits request rates (sign-in pages strictly), refuses hidden
#      files, short timeouts against slow-request attacks.
#   2. firewall (ufw): only SSH, HTTP and HTTPS are open; the site's own port (3000) is closed.
#   3. fail2ban: bans addresses that keep guessing SSH passwords or hammer the sign-in pages.
#   4. automatic security updates (unattended-upgrades).
#   5. systemd: the site runs with fewer rights (private /tmp, no new privileges, read-only system).
#   6. file permissions: secrets and data readable only by the site's user.
#   7. SSH: no direct root login, fewer password tries. Password login stays on (no lock-out).
set -euo pipefail

[[ $EUID -eq 0 ]] || { echo "Run as root: sudo bash deploy/harden.sh"; exit 1; }
say() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }

ENV_FILE=/etc/nassaji.env
DATA_DIR=${DATA_DIR:-/var/lib/nassaji/data}
BACKUP_DIR=/var/backups/nassaji
SITE=/etc/nginx/sites-available/nassaji
SERVICE=/etc/systemd/system/nassaji.service
APP_USER=$(awk -F= '/^User=/{print $2}' "$SERVICE" 2>/dev/null || true)
PORT=$(grep -oP '(?<=-p )\d+' "$SERVICE" 2>/dev/null || echo 3000)

export DEBIAN_FRONTEND=noninteractive
say "Installing ufw, fail2ban and unattended-upgrades"
apt-get update -qq
apt-get install -y -qq ufw fail2ban unattended-upgrades python3-systemd >/dev/null

# ---------------------------------------------------------------- 1. nginx
say "nginx: rate limits, hidden version, refused hidden files"
cat > /etc/nginx/conf.d/nassaji-limits.conf <<'EOF'
# Nassaji Sport (deploy/harden.sh): request-rate zones and global hardening.
server_tokens off;
limit_req_zone $binary_remote_addr zone=ns_login:10m rate=40r/m;
limit_req_zone $binary_remote_addr zone=ns_site:20m rate=20r/s;
limit_req_status 429;
client_body_timeout 30s;
client_header_timeout 15s;
send_timeout 60s;
EOF

cat > /etc/nginx/snippets/nassaji-security.conf <<EOF
# Nassaji Sport (deploy/harden.sh). Included in the site's server blocks.
# Hidden files (.git, .env …) are never served.
location ~ /\.(?!well-known) { deny all; return 404; }

# Sign-in pages and their checks: 40 requests a minute per address (the sign-in page asks for
# its status every 2 s while a fan is in Bale/Telegram), bursts of 20.
location ~ ^/(admin/login|predict/login)/ {
    limit_req zone=ns_login burst=20 nodelay;
    proxy_pass http://127.0.0.1:$PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Real-IP \$remote_addr;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
}
EOF

if [[ -f $SITE ]]; then
  [[ -f $SITE.before-harden ]] || cp "$SITE" "$SITE.before-harden"
  # Include the snippet in every server block that has a server_name (once).
  if ! grep -q "snippets/nassaji-security.conf" "$SITE"; then
    sed -i '/^\s*server_name /a\    include snippets/nassaji-security.conf;' "$SITE"
  fi
  # General rate limit for the rest of the site (generous: pages load many images).
  if ! grep -q "zone=ns_site" "$SITE"; then
    sed -i '0,/^\s*location \/ {/s//    location \/ {\n        limit_req zone=ns_site burst=200 nodelay;/' "$SITE"
  fi
fi
# A server_tokens line in nginx.conf would clash with ours: comment it out.
sed -i 's/^\(\s*server_tokens\s\)/# \1/' /etc/nginx/nginx.conf
# Some nginx packages don't read conf.d/: include the zones from the http block directly.
if ! grep -qE '^\s*include\s+/etc/nginx/conf\.d/\*\.conf' /etc/nginx/nginx.conf && ! grep -q "nassaji-limits.conf" /etc/nginx/nginx.conf; then
  sed -i '0,/^\s*http\s*{/s//http {\n    include \/etc\/nginx\/conf.d\/nassaji-limits.conf;/' /etc/nginx/nginx.conf
fi
if nginx -t; then
  systemctl reload nginx
  nginx -T 2>/dev/null | grep -q "zone=ns_site" && echo "nginx hardening is active."
else
  echo "nginx config test failed (see above); restoring the previous site file."
  [[ -f $SITE.before-harden ]] && cp "$SITE.before-harden" "$SITE"
  nginx -t && systemctl reload nginx
fi

# ---------------------------------------------------------------- 2. firewall
say "Firewall: only SSH, HTTP and HTTPS"
SSH_PORT=$(sshd -T 2>/dev/null | awk '/^port /{print $2; exit}')
SSH_PORT=${SSH_PORT:-22}
ufw allow "$SSH_PORT/tcp" >/dev/null   # first, so the current SSH session is never cut off
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw deny "$PORT/tcp" >/dev/null
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw --force enable >/dev/null
ufw status | sed -n '1,12p'

# ---------------------------------------------------------------- 3. fail2ban
say "fail2ban: SSH guessing and sign-in flooding"
cat > /etc/fail2ban/filter.d/nassaji-login.conf <<'EOF'
# nginx answered 429 (rate limit) on the sign-in pages.
[Definition]
failregex = ^<HOST> .* "(GET|POST) /(admin|predict)/login/[^"]*" 429
ignoreregex =
EOF
cat > /etc/fail2ban/jail.d/nassaji.local <<EOF
[DEFAULT]
bantime = 1h
findtime = 10m
maxretry = 6
# Local addresses are never banned.
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = $SSH_PORT
backend = systemd

[nassaji-login]
enabled = true
port = http,https
filter = nassaji-login
logpath = /var/log/nginx/access.log
maxretry = 5
bantime = 2h
EOF
systemctl enable fail2ban >/dev/null 2>&1 || true
systemctl restart fail2ban
sleep 1
fail2ban-client status 2>/dev/null | sed -n '1,4p' || true

# ---------------------------------------------------------------- 4. updates
say "Automatic security updates"
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
APT::Periodic::AutocleanInterval "7";
EOF
systemctl enable --now unattended-upgrades >/dev/null 2>&1 || true

# ---------------------------------------------------------------- 5. systemd
say "Site service: fewer rights"
mkdir -p /etc/systemd/system/nassaji.service.d
cat > /etc/systemd/system/nassaji.service.d/harden.conf <<'EOF'
[Service]
NoNewPrivileges=true
PrivateTmp=true
PrivateDevices=true
ProtectSystem=full
ProtectKernelTunables=true
ProtectKernelModules=true
ProtectKernelLogs=true
ProtectControlGroups=true
ProtectClock=true
ProtectHostname=true
RestrictSUIDSGID=true
RestrictRealtime=true
RestrictNamespaces=true
LockPersonality=true
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX AF_NETLINK
CapabilityBoundingSet=
AmbientCapabilities=
UMask=0027
EOF
systemctl daemon-reload
systemctl restart nassaji
sleep 4
if ! systemctl is-active --quiet nassaji; then
  echo "The site did not start with the stricter settings; removing them."
  rm -f /etc/systemd/system/nassaji.service.d/harden.conf
  systemctl daemon-reload
  systemctl restart nassaji
fi

# ---------------------------------------------------------------- 6. permissions
say "File permissions"
[[ -f $ENV_FILE ]] && chown root:root "$ENV_FILE" && chmod 600 "$ENV_FILE"
if [[ -n "$APP_USER" && -d $DATA_DIR ]]; then
  chown -R "$APP_USER": "$DATA_DIR"
  chmod 750 "$DATA_DIR"
  find "$DATA_DIR" -maxdepth 1 -type f -name '*.json' -exec chmod 640 {} +
  [[ -f $DATA_DIR/.session-secret ]] && chmod 600 "$DATA_DIR/.session-secret"
fi
[[ -d $BACKUP_DIR ]] && chmod 700 "$BACKUP_DIR"

# ---------------------------------------------------------------- 7. SSH
say "SSH: no direct root login, 4 password tries per connection"
# Only when another user can use sudo (otherwise nobody could become root any more).
SUDOERS=$(getent group sudo | cut -d: -f4)
if [[ -n "$SUDOERS" ]]; then
  cat > /etc/ssh/sshd_config.d/60-nassaji.conf <<'EOF'
PermitRootLogin no
MaxAuthTries 4
LoginGraceTime 30
X11Forwarding no
PermitEmptyPasswords no
ClientAliveInterval 300
ClientAliveCountMax 2
EOF
  if sshd -t 2>/dev/null; then
    systemctl reload ssh 2>/dev/null || systemctl reload sshd 2>/dev/null || true
  else
    rm -f /etc/ssh/sshd_config.d/60-nassaji.conf
    echo "SSH settings test failed; left unchanged."
  fi
else
  echo "No sudo user found; SSH settings left unchanged."
fi

say "Done"
echo "Check: curl -sI http://127.0.0.1/ | head -5    and    fail2ban-client status"
