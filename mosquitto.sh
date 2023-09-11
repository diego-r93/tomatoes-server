#!/bin/sh

# Protects script from continuing with an error
set -eu -o pipefail

# Create passwd empty file
touch /mosquitto/config/passwd

mosquitto_passwd -b /mosquitto/config/passwd ${MQTT_USER_NAME} ${MQTT_PASSWORD}

# Start Mosquitto
exec /usr/sbin/mosquitto -c /mosquitto/config/mosquitto.conf