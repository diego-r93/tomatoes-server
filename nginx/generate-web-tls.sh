#!/bin/sh
set -eu
umask 077

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 PRIMARY_IPV4 DEVICE_NETWORK_IPV4" >&2
    exit 2
fi

cd "$(dirname "$0")"
mkdir -p web-ca tls
if [ ! -e web-ca/ca.crt ] && [ ! -e web-ca/ca.key ]; then
    openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -noenc \
        -days 3650 -sha256 -subj '/CN=Tomatoes Web CA' \
        -addext 'basicConstraints=critical,CA:TRUE,pathlen:0' \
        -addext 'keyUsage=critical,keyCertSign,cRLSign' \
        -keyout web-ca/ca.key -out web-ca/ca.crt
fi
test -s web-ca/ca.crt && test -s web-ca/ca.key

tmp=$(mktemp -d ./tls/.issue.XXXXXX)
trap 'rm -f "$tmp/server.key" "$tmp/server.csr" "$tmp/server.crt" "$tmp/extensions"; rmdir "$tmp"' EXIT
openssl req -new -newkey ec -pkeyopt ec_paramgen_curve:P-256 -noenc \
    -subj '/CN=Tomatoes Web' -keyout "$tmp/server.key" -out "$tmp/server.csr"
printf '%s\n' 'basicConstraints=critical,CA:FALSE' 'keyUsage=critical,digitalSignature' \
    'extendedKeyUsage=serverAuth' "subjectAltName=IP:$1,IP:$2" > "$tmp/extensions"
openssl x509 -req -in "$tmp/server.csr" -CA web-ca/ca.crt -CAkey web-ca/ca.key \
    -CAcreateserial -days 365 -sha256 -extfile "$tmp/extensions" -out "$tmp/server.crt"
openssl verify -CAfile web-ca/ca.crt -verify_ip "$1" "$tmp/server.crt"
openssl verify -CAfile web-ca/ca.crt -verify_ip "$2" "$tmp/server.crt"
mv "$tmp/server.key" "$tmp/server.crt" tls/
