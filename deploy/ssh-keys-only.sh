#!/usr/bin/env bash
# Turns off SSH password login, leaving key login only. Run it only AFTER you have signed in
# with your key in a separate window (the script checks that a key is installed, but it can't
# know the key on your computer works).
#   sudo bash deploy/ssh-keys-only.sh          # keys only
#   sudo bash deploy/ssh-keys-only.sh undo     # passwords allowed again (e.g. from the VMware console)
set -euo pipefail
[[ $EUID -eq 0 ]] || { echo "Run as root: sudo bash deploy/ssh-keys-only.sh"; exit 1; }

# sshd uses the FIRST value it reads and reads sshd_config.d/ in name order: "01-" comes before
# Ubuntu's own files (e.g. 50-cloud-init.conf, which may turn passwords on).
CONF=/etc/ssh/sshd_config.d/01-nassaji-keys-only.conf
reload() { systemctl reload ssh 2>/dev/null || systemctl reload sshd; }

if [[ "${1:-}" == "undo" ]]; then
  rm -f "$CONF"
  sshd -t && reload
  echo "Password login is allowed again."
  exit 0
fi

# Someone who can use sudo must have a key, or nobody could administer the server any more.
ok_users=()
for u in $(getent group sudo | cut -d: -f4 | tr ',' ' '); do
  home=$(getent passwd "$u" | cut -d: -f6)
  f="$home/.ssh/authorized_keys"
  if [[ -s "$f" ]] && grep -qE '^(ssh-ed25519|ssh-rsa|ecdsa-sha2-|sk-)' "$f"; then
    # sshd ignores keys in files or folders others can write to.
    chown "$u": "$home/.ssh" "$f"
    chmod 700 "$home/.ssh"
    chmod 600 "$f"
    ok_users+=("$u")
  fi
done
if [[ ${#ok_users[@]} -eq 0 ]]; then
  echo "No sudo user has a key in ~/.ssh/authorized_keys yet. Add your public key first; nothing was changed."
  exit 1
fi
echo "Users with a key: ${ok_users[*]}"

cat > "$CONF" <<'EOF'
# deploy/ssh-keys-only.sh: key login only.
PubkeyAuthentication yes
PasswordAuthentication no
KbdInteractiveAuthentication no
ChallengeResponseAuthentication no
PermitRootLogin no
AuthenticationMethods publickey
EOF
if ! sshd -t; then
  rm -f "$CONF"
  echo "SSH settings test failed; nothing was changed."
  exit 1
fi
reload
echo
sshd -T 2>/dev/null | grep -E '^(passwordauthentication|pubkeyauthentication|permitrootlogin|kbdinteractiveauthentication) '
echo
echo "Done: SSH accepts keys only. Keep this window open and check a NEW connection with your key."
echo "If it fails, run here:  bash deploy/ssh-keys-only.sh undo"
