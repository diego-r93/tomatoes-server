#!/bin/sh
set -eu

if [ "$(id -u)" -ne 0 ]; then
    echo "Run this installer with sudo." >&2
    exit 1
fi

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
command -v python3 >/dev/null
docker compose version >/dev/null

cat > /etc/systemd/system/tomatoes-compose.service <<EOF
[Unit]
Description=Start Tomatoes Compose after its host addresses are ready
Requires=docker.service
Wants=network-online.target
After=docker.service network-online.target
PartOf=docker.service
StartLimitIntervalSec=0

[Service]
Type=oneshot
WorkingDirectory=$project_dir
ExecStart=/usr/bin/python3 "$project_dir/scripts/start-compose.py"
RemainAfterExit=yes
TimeoutStartSec=0
Restart=on-failure
RestartSec=15

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now tomatoes-compose.service
