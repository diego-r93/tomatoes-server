#!/bin/sh
# Watch only the generated public-server configuration. No Docker socket needed.
set -eu
config=/etc/nginx/tls/public/server.conf
current=$(sha256sum "$config" 2>/dev/null | cut -d ' ' -f 1 || true)
(
    while sleep 30; do
        next=$(sha256sum "$config" 2>/dev/null | cut -d ' ' -f 1 || true)
        if [ -n "$next" ] && [ "$next" != "$current" ]; then
            if nginx -t && nginx -s reload; then
                current=$next
                echo "Public HTTPS certificate loaded by Nginx."
            fi
        fi
    done
) &
