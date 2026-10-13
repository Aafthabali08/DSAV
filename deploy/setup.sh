#!/usr/bin/env bash
# Sets up the SortScope cloud compiler (C, C++, Java, Python, JavaScript) on a
# fresh Ubuntu 24.04 or Debian 12 server (x86-64 or ARM). Works on free tiers:
# Oracle Cloud Always Free (Ampere A1) and Google Cloud e2-micro (1 GB RAM). Run as root:
#
#   sudo bash deploy/setup.sh [ALLOWED_ORIGINS] [DOMAIN]
#
# ALLOWED_ORIGINS  comma-separated site origins allowed to use the compiler
#                  (default: https://sortscopea.vercel.app)
# DOMAIN           HTTPS hostname for this server (default: <public-ip>.sslip.io,
#                  which needs no DNS setup)
set -euo pipefail

ORIGINS="${1:-https://sortscopea.vercel.app}"
DOMAIN="${2:-}"
REPO="${REPO:-https://github.com/Aafthabali08/DSAV.git}"
APP_DIR=/opt/sortscope
NODE_MAJOR=22

[ "$(id -u)" -eq 0 ] || { echo "Run as root: sudo bash $0" >&2; exit 1; }
. /etc/os-release
case "$ID:$VERSION_ID" in
  ubuntu:24.04 | debian:12) ;;
  *) echo "Unsupported OS: $PRETTY_NAME (use Ubuntu 24.04 or Debian 12)" >&2; exit 1 ;;
esac

echo "==> Installing system packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -q
apt-get install -y -q ca-certificates curl git xz-utils docker.io caddy

# Small free-tier VMs (1 GB RAM): add swap and run one program at a time.
MEM_KB="$(awk '/MemTotal/ {print $2}' /proc/meminfo)"
CONCURRENT=2
if [ "$MEM_KB" -lt 1900000 ]; then
  CONCURRENT=1
  if ! swapon --show | grep -q /swapfile; then
    echo "==> Low memory: adding a 2 GB swap file"
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile >/dev/null
    swapon /swapfile
    grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
  fi
fi

if [ -z "$DOMAIN" ]; then
  IP="$(curl -4fsS https://api.ipify.org)"
  DOMAIN="$(echo "$IP" | tr . -).sslip.io"
fi

echo "==> Installing Node.js $NODE_MAJOR (verified against nodejs.org checksums)"
if ! node -v 2>/dev/null | grep -q "^v$NODE_MAJOR\."; then
  case "$(uname -m)" in
    x86_64) ARCH=x64 ;;
    aarch64) ARCH=arm64 ;;
    *) echo "Unsupported CPU: $(uname -m)" >&2; exit 1 ;;
  esac
  BASE="https://nodejs.org/dist/latest-v$NODE_MAJOR.x"
  TMP="$(mktemp -d)"
  curl -fsSL "$BASE/SHASUMS256.txt" -o "$TMP/SHASUMS256.txt"
  FILE="$(grep -o "node-v[0-9.]*-linux-$ARCH.tar.xz" "$TMP/SHASUMS256.txt" | head -1)"
  curl -fsSL "$BASE/$FILE" -o "$TMP/$FILE"
  (cd "$TMP" && grep " $FILE\$" SHASUMS256.txt | sha256sum -c -)
  tar -xJf "$TMP/$FILE" -C /usr/local --strip-components=1
  rm -rf "$TMP"
fi

echo "==> Creating service user and fetching SortScope"
id sortscope >/dev/null 2>&1 || useradd --system --home "$APP_DIR" --shell /usr/sbin/nologin sortscope
# Starting sandboxed containers requires the Docker socket.
usermod -aG docker sortscope
systemctl enable --now docker
if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" pull --ff-only
else
  git clone --depth 1 "$REPO" "$APP_DIR"
fi
cd "$APP_DIR"
npm ci --omit=dev --no-audit --no-fund
chown -R root:root "$APP_DIR"

echo "==> Building the sandbox image (first build takes several minutes)"
docker build -t sortscope-runner:local -f server/Dockerfile server

echo "==> Installing the systemd service"
cat >/etc/systemd/system/sortscope-runner.service <<EOF
[Unit]
Description=SortScope cloud compiler
After=docker.service network-online.target
Requires=docker.service

[Service]
User=sortscope
Group=sortscope
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/node server/index.js
Environment=RUNNER_PORT=7002
Environment=DOCKER_CONFIG=/tmp/docker
Environment=ALLOWED_ORIGINS=$ORIGINS
Environment=TRUST_PROXY=1
Environment=MAX_CONCURRENT=$CONCURRENT
Environment=RATE_LIMIT_PER_MINUTE=10
Environment=RATE_LIMIT_PER_HOUR=120
Restart=always
RestartSec=2
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ProtectKernelTunables=true
ProtectControlGroups=true

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable sortscope-runner
systemctl restart sortscope-runner

echo "==> Configuring HTTPS for $DOMAIN"
cat >/etc/caddy/Caddyfile <<EOF
$DOMAIN {
	encode gzip
	request_body {
		max_size 200KB
	}
	handle /api/* {
		reverse_proxy 127.0.0.1:7002
	}
	handle {
		respond "SortScope cloud compiler" 200
	}
}
EOF
caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
systemctl enable caddy
systemctl restart caddy

echo "==> Firewall: SSH, HTTP and HTTPS only"
if [ -f /etc/iptables/rules.v4 ] && command -v netfilter-persistent >/dev/null; then
  # Oracle Cloud images ship iptables rules that reject everything except SSH.
  for port in 80 443; do
    iptables -C INPUT -p tcp --dport "$port" -m state --state NEW -j ACCEPT 2>/dev/null ||
      iptables -I INPUT 5 -p tcp --dport "$port" -m state --state NEW -j ACCEPT
  done
  netfilter-persistent save >/dev/null
  echo "    Also allow TCP 80 and 443 in the cloud console's security list / firewall."
else
  apt-get install -y -q ufw
  ufw allow 22/tcp
  ufw allow 80/tcp
  ufw allow 443/tcp
  ufw --force enable
fi

echo "==> Waiting for the service"
for _ in $(seq 1 30); do
  if curl -fsS "https://$DOMAIN/api/runtime" 2>/dev/null | grep -q '"ready":true'; then
    echo
    echo "Cloud compiler is ready at https://$DOMAIN"
    echo "In Vercel, set VITE_RUNTIME_URL=https://$DOMAIN and redeploy."
    exit 0
  fi
  sleep 3
done
echo "Service did not report ready yet. Check: journalctl -u sortscope-runner -u caddy -n 50" >&2
exit 1
