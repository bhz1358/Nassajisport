#!/usr/bin/env bash
# For a server behind the datacenter's front proxy (it answers HTTPS for the domain and passes the
# requests on to this server over plain HTTP, port 80). Without this, nginx redirects those requests
# to HTTPS again and browsers loop ("too many redirects").
#   sudo bash deploy/edge-proxy.sh 172.27.110.4        # the proxy's address, as seen in access.log
#   sudo bash deploy/edge-proxy.sh undo
# What it does:
#   - requests from the proxy are served on port 80 (no redirect) and marked as HTTPS for the site;
#     everyone else on port 80 is still sent to HTTPS;
#   - the visitor's real address is taken from the proxy's X-Forwarded-For header, so sign-in limits,
#     logs and fail2ban see visitors, not the proxy;
#   - fail2ban never bans the proxy (that would take the site down for everyone).
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run as root: sudo bash deploy/edge-proxy.sh <proxy address>"; exit 1; }

SITE=/etc/nginx/sites-available/nassaji
CONF=/etc/nginx/conf.d/nassaji-edge.conf
JAIL=/etc/fail2ban/jail.d/nassaji-edge.local
SERVICE=/etc/systemd/system/nassaji.service
PORT=$(grep -oP '(?<=-p )\d+' "$SERVICE" 2>/dev/null || echo 3000)

if [[ "${1:-}" == "undo" ]]; then
  [[ -f $SITE.before-edge ]] && cp "$SITE.before-edge" "$SITE"
  rm -f "$CONF" "$JAIL"
  nginx -t && systemctl reload nginx
  systemctl restart fail2ban 2>/dev/null || true
  echo "Back to the previous nginx setup."
  exit 0
fi

EDGES=("$@")
[[ ${#EDGES[@]} -gt 0 ]] || { echo "Give the proxy's address, e.g.: sudo bash deploy/edge-proxy.sh 172.27.110.4"; exit 1; }
for ip in "${EDGES[@]}"; do
  [[ $ip =~ ^[0-9a-fA-F.:/]+$ ]] || { echo "Not an address: $ip"; exit 1; }
done
[[ -f $SITE ]] || { echo "$SITE not found"; exit 1; }
DOMAIN=$(grep -oP '^\s*server_name\s+\K[^ ;]+' "$SITE" | head -1)

{
  echo "# deploy/edge-proxy.sh: the datacenter's front proxy."
  for ip in "${EDGES[@]}"; do echo "set_real_ip_from $ip;"; done
  echo "real_ip_header X-Forwarded-For;"
  echo "real_ip_recursive on;"
  echo "# 1 for requests that came through the proxy (\$realip_remote_addr is the proxy itself)."
  echo "geo \$realip_remote_addr \$ns_from_edge {"
  echo "    default 0;"
  for ip in "${EDGES[@]}"; do echo "    $ip 1;"; done
  echo "}"
  echo "map \$ns_from_edge \$ns_proto { 1 https; default \$scheme; }"
} > "$CONF"

[[ -f $SITE.before-edge ]] || cp "$SITE" "$SITE.before-edge"
# Keep the HTTPS (443) server blocks as certbot wrote them; replace the port-80 block(s) with one
# that serves the proxy and sends everyone else to HTTPS.
python3 - "$SITE" "$PORT" <<'PY'
import re, sys
path, port = sys.argv[1], sys.argv[2]
text = open(path).read()
blocks, depth, start = [], 0, None
for i, ch in enumerate(text):
    if ch == "{":
        if depth == 0:
            start = text.rfind("server", 0, i)
        depth += 1
    elif ch == "}":
        depth -= 1
        if depth == 0 and start is not None:
            blocks.append(text[start:i + 1])
            start = None
keep = [b for b in blocks if re.search(r"listen\s+[^;]*443", b)]
names = re.search(r"server_name\s+([^;]+);", text).group(1).strip()
proxy = f"""        proxy_pass http://127.0.0.1:{port};
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $ns_proto;
        proxy_read_timeout 300s;"""
http_block = f"""server {{
    listen 80;
    listen [::]:80;
    server_name {names};
    include snippets/nassaji-security.conf;
    client_max_body_size 64m;

    # Let's Encrypt renewals.
    location /.well-known/acme-challenge/ {{
        root /var/www/html;
    }}

    location / {{
        # Visitors who came straight here go to HTTPS; the front proxy is served.
        if ($ns_from_edge = 0) {{
            return 301 https://$host$request_uri;
        }}
        limit_req zone=ns_site burst=200 nodelay;
{proxy}
    }}
}}"""
# The sign-in pages (snippet) must also say "https" to the site.
out = "# Nassaji Sport. HTTPS blocks by certbot; the port-80 block by deploy/edge-proxy.sh.\n\n" + "\n\n".join(keep + [http_block]) + "\n"
open(path, "w").write(out)
PY
# No IPv6 on this server: drop that listen line (nginx would refuse to start).
[[ -s /proc/net/if_inet6 ]] || sed -i '/listen \[::\]:80;/d' "$SITE"
# The sign-in locations in the security snippet: tell the site the visitor used HTTPS.
if [[ -f /etc/nginx/snippets/nassaji-security.conf ]]; then
  sed -i 's/proxy_set_header X-Forwarded-Proto \$scheme;/proxy_set_header X-Forwarded-Proto $ns_proto;/' /etc/nginx/snippets/nassaji-security.conf
  # Visitors who came straight to port 80 are sent to HTTPS there too.
  grep -q 'ns_from_edge' /etc/nginx/snippets/nassaji-security.conf || \
    sed -i 's#^\(\s*limit_req zone=ns_login.*\)#\1\n    set $ns_go 0;\n    if ($scheme = http) { set $ns_go 1; }\n    if ($ns_from_edge = 1) { set $ns_go 0; }\n    if ($ns_go = 1) { return 301 https://$host$request_uri; }#' /etc/nginx/snippets/nassaji-security.conf
fi
mkdir -p /var/www/html

if nginx -t; then
  systemctl reload nginx
else
  echo "nginx config test failed; restoring the previous files."
  cp "$SITE.before-edge" "$SITE"
  rm -f "$CONF"
  nginx -t && systemctl reload nginx
  exit 1
fi

if [[ -d /etc/fail2ban/jail.d ]]; then
  printf '[DEFAULT]\nignoreip = 127.0.0.1/8 ::1 %s\n' "${EDGES[*]}" > "$JAIL"
  systemctl restart fail2ban 2>/dev/null || true
  for ip in "${EDGES[@]}"; do fail2ban-client unban "$ip" >/dev/null 2>&1 || true; done
fi
echo
echo "Done. The site answers the front proxy; open https://${DOMAIN:-your-domain}/ again."
echo "Then: tail -5 /var/log/nginx/access.log  (the first column should show visitors' own addresses)."
