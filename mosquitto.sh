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

# Start Mosquitto
exec /usr/sbin/mosquitto -c /mosquitto/config/mosquitto.conf
