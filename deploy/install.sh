#!/usr/bin/env bash
# Installs Nassaji Sport on a fresh Ubuntu server (22.04 / 24.04).
#
# Run from inside a copy of this repository:
#   sudo bash deploy/install.sh
#
# Optional settings (environment variables):
#   DOMAIN=nassajisport.com   serve this domain; also enables HTTPS when EMAIL is set
#   EMAIL=you@example.com     Let's Encrypt account e-mail (needs DOMAIN pointing at this server)
#   NPM_REGISTRY=https://...  npm mirror, if registry.npmjs.org is slow or blocked
#   NODE_MIRROR=https://...   Node.js download mirror (default: nodejs.org, then npmmirror.com)
#   PORT=3000                 internal port of the Node app
#
# Safe to run again: it updates the code and keeps data, passwords and settings.

set -euo pipefail

APP_USER=nassaji
APP_DIR=/opt/nassaji/app
DATA_DIR=/var/lib/nassaji/data
ENV_FILE=/etc/nassaji.env
BACKUP_DIR=/var/backups/nassaji
NODE_MAJOR=22
PORT="${PORT:-3000}"
DOMAIN="${DOMAIN:-}"
EMAIL="${EMAIL:-}"
SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!! %s\033[0m\n' "$*"; }
die() { printf '\033[1;31mxx %s\033[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Run with sudo: sudo bash deploy/install.sh"
[[ -f "$SRC_DIR/package.json" && -d "$SRC_DIR/app" ]] || die "Run this from inside the project folder (deploy/install.sh not found next to package.json)."
command -v apt-get >/dev/null || die "This script is for Ubuntu/Debian."

# ---------------------------------------------------------------- packages
say "Installing system packages (nginx, rsync, curl)"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl ca-certificates rsync nginx xz-utils tar

# ---------------------------------------------------------------- Node.js
node_ok() { command -v node >/dev/null && [[ "$(node -p 'process.versions.node.split(".")[0]')" -ge $NODE_MAJOR ]]; }

install_node_tarball() {
  local base="$1" arch ver
  case "$(uname -m)" in
    x86_64) arch=x64 ;;
    aarch64) arch=arm64 ;;
    *) die "Unsupported CPU: $(uname -m)" ;;
  esac
  ver="$(curl -fsSL --max-time 30 "$base/index.json" | grep -o "\"version\":\"v${NODE_MAJOR}\.[0-9.]*\"" | head -1 | cut -d'"' -f4)" || return 1
  [[ -n "$ver" ]] || return 1
  say "Downloading Node.js $ver from $base"
  curl -fSL --max-time 600 "$base/$ver/node-$ver-linux-$arch.tar.xz" -o /tmp/node.tar.xz || return 1
  rm -rf /opt/node && mkdir -p /opt/node
  tar -xJf /tmp/node.tar.xz -C /opt/node --strip-components=1
  ln -sf /opt/node/bin/node /usr/local/bin/node
  ln -sf /opt/node/bin/npm /usr/local/bin/npm
  ln -sf /opt/node/bin/npx /usr/local/bin/npx
  rm -f /tmp/node.tar.xz
}

if node_ok; then
  say "Node.js $(node -v) already installed"
else
  for mirror in ${NODE_MIRROR:-} https://nodejs.org/dist https://npmmirror.com/mirrors/node; do
    install_node_tarball "$mirror" && node_ok && break
    warn "Could not get Node.js from $mirror, trying the next source"
  done
  node_ok || die "Node.js $NODE_MAJOR could not be installed. Download it manually or set NODE_MIRROR."
  say "Node.js $(node -v) installed"
fi

# ---------------------------------------------------------------- user & folders
say "Creating user and folders"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home /opt/nassaji --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$(dirname "$APP_DIR")" "$DATA_DIR/uploads" "$BACKUP_DIR"
# Backups hold password hashes and the session key: root only.
chmod 700 "$BACKUP_DIR"

# ---------------------------------------------------------------- code
# The new version is built in a separate folder next to the running site and only
# swapped in once the build has succeeded, so a failed update never breaks the site.
STAGE_DIR="${APP_DIR}.new"
NEED_MB="${NEED_MB:-1500}"
FREE_MB=$(df -Pm "$(dirname "$APP_DIR")" | awk 'NR==2 {print $4}')
if (( FREE_MB < NEED_MB )); then
  die "Not enough disk space: ${FREE_MB} MB free, about ${NEED_MB} MB needed to build. The site keeps running the current version.
   See what uses the space:  du -sh /var/backups/nassaji /var/lib/nassaji/data/uploads /var/cache/apt /var/log/journal /tmp
   Usually safe to free:     apt-get clean; journalctl --vacuum-size=100M"
fi

say "Copying the new version to $STAGE_DIR"
rm -rf "$STAGE_DIR"
mkdir -p "$STAGE_DIR"
rsync -a --delete \
  --exclude node_modules --exclude .next --exclude data --exclude .git \
  "$SRC_DIR/" "$STAGE_DIR/"
chown -R "$APP_USER:$APP_USER" /opt/nassaji "$DATA_DIR"
chmod 750 "$DATA_DIR"

say "Installing dependencies and building (this takes a few minutes)"
NPM_FLAGS=(--no-audit --no-fund)
[[ -n "${NPM_REGISTRY:-}" ]] && NPM_FLAGS+=(--registry "$NPM_REGISTRY")
# Keep proxy settings when switching user, for servers that reach the internet through a proxy.
KEEP_ENV=HTTP_PROXY,HTTPS_PROXY,NO_PROXY,http_proxy,https_proxy,no_proxy,npm_config_proxy,npm_config_https_proxy,npm_config_noproxy,NODE_EXTRA_CA_CERTS
# When the package list is unchanged, the packages already installed for the running
# site are copied over, so most updates need no internet access at all.
INSTALL_CMD="npm ci ${NPM_FLAGS[*]}"
# npm writes node_modules/.package-lock.json only after a complete install, so an
# install that was cut off (e.g. by a full disk) is not reused.
if [[ -f "$APP_DIR/node_modules/.package-lock.json" && -f "$APP_DIR/node_modules/next/package.json" && -f "$APP_DIR/package-lock.json" ]] \
  && cmp -s "$APP_DIR/package-lock.json" "$STAGE_DIR/package-lock.json"; then
  echo "Packages unchanged: reusing the installed ones (no download needed)."
  cp -a "$APP_DIR/node_modules" "$STAGE_DIR/node_modules"
  INSTALL_CMD="true"
fi
if ! sudo --preserve-env="$KEEP_ENV" -u "$APP_USER" -H bash -c "cd '$STAGE_DIR' && $INSTALL_CMD && NEXT_TELEMETRY_DISABLED=1 DATA_DIR='$DATA_DIR' npm run build"; then
  rm -rf "$STAGE_DIR"
  die "Build failed; the site keeps running the current version. If npm downloads failed (ETIMEDOUT), try again later or with NPM_REGISTRY set to a mirror."
fi

say "Switching to the new version"
rm -rf "${APP_DIR}.old"
if [[ -d "$APP_DIR" ]]; then mv "$APP_DIR" "${APP_DIR}.old"; fi
mv "$STAGE_DIR" "$APP_DIR"
# Restart straight away: the old process would otherwise look for files of the old build.
if systemctl is-enabled nassaji >/dev/null 2>&1; then systemctl restart nassaji; fi
rm -rf "${APP_DIR}.old"

# ---------------------------------------------------------------- settings
if [[ ! -f "$ENV_FILE" ]]; then
  say "Writing $ENV_FILE"
  FIRST_PASSWORD="$(head -c 18 /dev/urandom | base64 | tr -d '/+=' | head -c 20)"
  {
    echo "NODE_ENV=production"
    echo "NEXT_TELEMETRY_DISABLED=1"
    echo "DATA_DIR=$DATA_DIR"
    echo "ADMIN_USERNAME=admin"
    echo "ADMIN_PASSWORD=$FIRST_PASSWORD"
    echo "SESSION_SECRET=$(head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n')"
    # Without HTTPS the browser would drop the admin login cookie.
    [[ -n "$DOMAIN" && -n "$EMAIL" ]] || echo "INSECURE_COOKIES=1"
  } > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi

# ---------------------------------------------------------------- service
say "Setting up the nassaji service"
cat > /etc/systemd/system/nassaji.service <<EOF
[Unit]
Description=Nassaji Sport website
After=network.target

[Service]
Type=simple
User=$APP_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
# Slow links to Telegram and other sites: give each IPv6/IPv4 connection attempt 3 s
# (Node's default 250 ms cancels them all and fetch fails with AggregateError).
ExecStart=/usr/local/bin/node --network-family-autoselection-attempt-timeout=3000 $APP_DIR/node_modules/next/dist/bin/next start -H 127.0.0.1 -p $PORT
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=full
ReadWritePaths=$DATA_DIR $APP_DIR/.next

[Install]
WantedBy=multi-user.target
EOF
# Node may live in /usr/bin (distro/NodeSource) rather than /usr/local/bin.
sed -i "s#/usr/local/bin/node#$(command -v node)#" /etc/systemd/system/nassaji.service
systemctl daemon-reload
systemctl enable nassaji >/dev/null
systemctl restart nassaji

# ---------------------------------------------------------------- nginx
say "Configuring nginx"
SERVER_NAME="${DOMAIN:-_}"
# Only listen on IPv6 when the server has it; nginx refuses to start otherwise.
LISTEN6=""
[[ -s /proc/net/if_inet6 ]] && LISTEN6="listen [::]:80;"
[[ -n "$DOMAIN" ]] && SERVER_NAME="$DOMAIN www.$DOMAIN"
cat > /etc/nginx/sites-available/nassaji <<EOF
server {
    listen 80;
    $LISTEN6
    server_name $SERVER_NAME;

    # Admin uploads: photos, videos and the WordPress export.
    client_max_body_size 64m;

    location / {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 300s;
    }
}
EOF
ln -sf /etc/nginx/sites-available/nassaji /etc/nginx/sites-enabled/nassaji
[[ -z "$DOMAIN" ]] && rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

if command -v ufw >/dev/null && ufw status | grep -q "Status: active"; then
  ufw allow 'Nginx Full' >/dev/null
fi

# ---------------------------------------------------------------- HTTPS
if [[ -n "$DOMAIN" && -n "$EMAIL" ]]; then
  say "Requesting an HTTPS certificate for $DOMAIN"
  apt-get install -y certbot python3-certbot-nginx
  if certbot --nginx --non-interactive --agree-tos -m "$EMAIL" -d "$DOMAIN" -d "www.$DOMAIN" --redirect; then
    sed -i '/^INSECURE_COOKIES=/d' "$ENV_FILE"
    systemctl restart nassaji
  else
    warn "Certificate failed (is $DOMAIN pointing at this server and port 80 open?). The site keeps running on HTTP."
    grep -q '^INSECURE_COOKIES=' "$ENV_FILE" || echo "INSECURE_COOKIES=1" >> "$ENV_FILE"
    systemctl restart nassaji
  fi
fi

# ---------------------------------------------------------------- backups
# Daily: the site's data files (posts, tables, settings, users: a few MB), 14 days kept.
# Photos change rarely and take gigabytes, so they are kept as one mirror copy that is
# refreshed each day instead of being copied into every backup.
say "Setting up daily backups to $BACKUP_DIR"
cat > /etc/cron.daily/nassaji-backup <<CRON
#!/bin/sh
umask 077
tar -czf $BACKUP_DIR/data-\$(date +%F).tar.gz --exclude=data/uploads -C $(dirname "$DATA_DIR") $(basename "$DATA_DIR")
find $BACKUP_DIR -maxdepth 1 -name 'data-*.tar.gz' -mtime +14 -delete
rsync -a --delete $DATA_DIR/uploads/ $BACKUP_DIR/uploads-mirror/
CRON
chmod 755 /etc/cron.daily/nassaji-backup

# Earlier versions put every photo into every backup and could fill the disk.
# Keep the newest of those full backups and remove the rest.
OLD_FULL=$(find "$BACKUP_DIR" -maxdepth 1 -name 'data-*.tar.gz' -size +50M -printf '%T@ %p\n' 2>/dev/null | sort -rn | tail -n +2 | cut -d' ' -f2-)
if [[ -n "$OLD_FULL" ]]; then
  echo "Removing old full backups that included every photo (the newest one is kept):"
  echo "$OLD_FULL" | sed 's/^/  /'
  echo "$OLD_FULL" | xargs -r rm -f
fi

# ---------------------------------------------------------------- check
say "Checking the site"
for _ in $(seq 1 30); do
  curl -fs -o /dev/null "http://127.0.0.1:$PORT/" && break
  sleep 1
done
if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/"; then
  echo "Site is running."
else
  journalctl -u nassaji -n 40 --no-pager
  die "The site did not start. The log above shows why."
fi

IP="$(hostname -I | awk '{print $1}')"
URL="http://${DOMAIN:-$IP}"
[[ -n "$DOMAIN" && -n "$EMAIL" ]] && ! grep -q '^INSECURE_COOKIES=' "$ENV_FILE" && URL="https://$DOMAIN"
echo
echo "------------------------------------------------------------"
echo " Site:        $URL/"
echo " Admin panel: $URL/admin/"
# Until the first admin login, the password from the settings file is still the one to use.
if [[ ! -s "$DATA_DIR/users.json" ]] || grep -q '^\[\]' "$DATA_DIR/users.json"; then
  echo " Username:    $(grep '^ADMIN_USERNAME=' "$ENV_FILE" | cut -d= -f2-)"
  echo " Password:    $(grep '^ADMIN_PASSWORD=' "$ENV_FILE" | cut -d= -f2-)"
  echo " (change it after logging in: Admin panel > مدیران)"
fi
echo " Data:        $DATA_DIR   Backups: $BACKUP_DIR"
echo " Logs:        journalctl -u nassaji -f"
echo "------------------------------------------------------------"
