#!/bin/sh

# Protects script from continuing with an error
set -eu -o pipefail

# Path to the passwd file
PASSWD_FILE="/mosquitto/config/passwd"

# Check if the file doesn't exist or is empty
if [ ! -s "$PASSWD_FILE" ]; then
    # Create the password file with private permissions.
    umask 077
    > "$PASSWD_FILE"

    # Add the user and password
    mosquitto_passwd -b "$PASSWD_FILE" "${MQTT_USER_NAME}" "${MQTT_PASSWORD}"
fi

# Fresh installations retain legacy access until individual users are provisioned.
ACL_FILE="/mosquitto/config/acl"
if [ ! -f "$ACL_FILE" ]; then
    case "${MQTT_USER_NAME}" in
        ''|*[!a-zA-Z0-9._-]*) exit 1 ;;
    esac
    printf 'user %s\ntopic readwrite #\ntopic read $SYS/#\n' "${MQTT_USER_NAME}" > "$ACL_FILE"
fi

# Mosquitto drops privileges before reading these files.
chown mosquitto:mosquitto "$PASSWD_FILE" "$ACL_FILE"
chmod 600 "$PASSWD_FILE" "$ACL_FILE"

# The broker writes logs and retained messages after dropping privileges.
chown mosquitto:mosquitto /mosquitto/data /mosquitto/log

TLS_HOST=${MQTT_TLS_HOST:-}
if [ -n "$TLS_HOST" ]; then
    TLS_DIR=/mosquitto/config/tls
    LISTENER_DIR=/mosquitto/config/listeners
    case "$TLS_HOST" in
        *[!a-zA-Z0-9.-]*|.*|-*|*.) echo "Invalid MQTT_TLS_HOST." >&2; exit 1 ;;
    esac
    SAN="DNS:$TLS_HOST"
    VERIFY_NAME=-verify_hostname
    if printf '%s\n' "$TLS_HOST" | grep -Eq '^([0-9]{1,3}\.){3}[0-9]{1,3}$'; then
        SAN="$SAN,IP:$TLS_HOST"
        VERIFY_NAME=-verify_ip
    fi

    ALT_IP=${MQTT_TLS_ALT_IP:-}
    if [ -n "$ALT_IP" ]; then
        if ! printf '%s\n' "$ALT_IP" | grep -Eq '^([0-9]{1,3}\.){3}[0-9]{1,3}$'; then
            echo "Invalid MQTT_TLS_ALT_IP." >&2
            exit 1
        fi
        SAN="$SAN,DNS:$ALT_IP,IP:$ALT_IP"
    fi

    if [ ! -e "$TLS_DIR" ]; then
        STAGE=$(mktemp -d /mosquitto/config/.tls-stage.XXXXXX)
        trap 'rm -f "$STAGE"/ca.key "$STAGE"/ca.pem "$STAGE"/broker.key "$STAGE"/broker.csr "$STAGE"/broker.ext "$STAGE"/broker.pem; rmdir "$STAGE"' EXIT
        (
            umask 077
            openssl ecparam -name prime256v1 -genkey -noout -out "$STAGE/ca.key"
            openssl req -new -x509 -sha256 -key "$STAGE/ca.key" -days 3652 \
                -subj "/CN=Tomatoes MQTT CA" -addext "basicConstraints=critical,CA:TRUE,pathlen:0" \
                -addext "keyUsage=critical,keyCertSign,cRLSign" -out "$STAGE/ca.pem"
            openssl ecparam -name prime256v1 -genkey -noout -out "$STAGE/broker.key"
            openssl req -new -sha256 -key "$STAGE/broker.key" -subj "/CN=$TLS_HOST" -out "$STAGE/broker.csr"
            printf '%s\n' 'basicConstraints=critical,CA:FALSE' 'keyUsage=critical,digitalSignature' \
                'extendedKeyUsage=serverAuth' "subjectAltName=$SAN" > "$STAGE/broker.ext"
            openssl x509 -req -sha256 -days 912 -in "$STAGE/broker.csr" -CA "$STAGE/ca.pem" \
                -CAkey "$STAGE/ca.key" -set_serial "0x$(openssl rand -hex 16)" \
                -extfile "$STAGE/broker.ext" -out "$STAGE/broker.pem"
            rm "$STAGE/broker.csr" "$STAGE/broker.ext"
        )
        chown root:mosquitto "$STAGE"
        chown mosquitto:mosquitto "$STAGE/broker.key"
        chmod 750 "$STAGE"
        chmod 644 "$STAGE/ca.pem" "$STAGE/broker.pem"
        mv "$STAGE" "$TLS_DIR"
        trap - EXIT
    fi
    openssl verify -purpose sslserver "$VERIFY_NAME" "$TLS_HOST" \
        -CAfile "$TLS_DIR/ca.pem" "$TLS_DIR/broker.pem" >/dev/null

    if [ -n "$ALT_IP" ]; then
        openssl verify -purpose sslserver -verify_ip "$ALT_IP" \
            -CAfile "$TLS_DIR/ca.pem" "$TLS_DIR/broker.pem" >/dev/null
    fi

    mkdir -p "$LISTENER_DIR"
    if [ ! -f "$LISTENER_DIR/tls.conf" ]; then
        cat > "$LISTENER_DIR/tls.conf" <<'EOF'
listener 8883
cafile /mosquitto/config/tls/ca.pem
certfile /mosquitto/config/tls/broker.pem
keyfile /mosquitto/config/tls/broker.key
require_certificate false
tls_version tlsv1.2
EOF
    fi
fi

# Start Mosquitto
exec /usr/sbin/mosquitto -c /mosquitto/config/mosquitto.conf
