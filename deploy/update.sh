#!/usr/bin/env bash
# Pulls the latest SortScope, rebuilds the sandbox image and restarts the
# cloud compiler. Run as root on the server: sudo bash /opt/sortscope/deploy/update.sh
set -euo pipefail
cd /opt/sortscope
git pull --ff-only
npm ci --omit=dev --no-audit --no-fund
docker build -t sortscope-runner:local -f server/Dockerfile server
systemctl restart sortscope-runner
docker image prune -f >/dev/null
echo "Updated to $(git rev-parse --short HEAD)."
