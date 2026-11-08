# Portal HTTPS

For a new installation without a domain, run from the project root:

```sh
sh nginx/generate-web-tls.sh 192.168.1.30 192.168.0.100
```

Use the two IPv4 addresses that clients actually visit. Install the public
`nginx/web-ca/ca.crt` certificate in the client's trusted root store. The CA
signing key in `nginx/web-ca/` stays on the server. Back it up securely for
certificate renewal. The Nginx container mounts only `nginx/tls/`.

For a domain, provide the ACME full chain and private key as
`nginx/tls/server.crt` and `nginx/tls/server.key`, set `GRAFANA_ROOT_URL` in
`.env` to the HTTPS URL ending in `/grafana/`, and reload Nginx after renewing
the certificate. Update the portal's public URL for any generated invitation
and alert links.

Grafana uses the internal Docker port 3000. Its public path is `/grafana/`
and the health endpoint is available only through the internal service.


## Public certificate for a local-only portal

Cloudflare must be the authoritative DNS provider. Create an A record for the
portal hostname pointing to its private LAN address, with **DNS only** (not
proxied). For this installation, `app.ceresgrow.com.br` points to
`192.168.1.30`. This address is reachable from the main home network; clients
on other isolated networks need routing or a local DNS override. Some routers
and secure DNS providers block public DNS answers containing private IPs. In
that case, configure a local DNS override for the same hostname.

Configure only the root `.env`:

```dotenv
PUBLIC_HTTPS_ENABLED=true
PUBLIC_HTTPS_DOMAIN=app.example.com
ACME_EMAIL=you@example.com
CLOUDFLARE_DNS_API_TOKEN=YOUR_PRIVATE_TOKEN
ACME_STAGING=false
```

Create the token yourself with **Zone / DNS / Edit**, restricted to the specific
Cloudflare zone. Keep the real token outside Git. The certificate service gets
only these five variables. Other services explicitly receive an empty DNS
token. Credentials are written with mode 600 in a temporary memory filesystem;
ACME account keys, certificates, renewal state and private logs stay in the
ignored `nginx/acme/` directory. Nginx never receives the DNS token. Docker creates new generated bind
directories as root. Keep the generated public TLS directory owned by the
certificate container user (root); do not make private-key directories
world-writable.

Start or update the certificate service:

```sh
sudo docker compose up -d --no-deps public-https
sudo docker compose logs --tail=20 public-https
```

DNS-01 validates a temporary public TXT record. It does not require opening
HTTP/HTTPS ports to the Internet. Certificate issuance registers an account
with Let's Encrypt using `ACME_EMAIL` and accepts its subscriber agreement.
Cloudflare's edge certificate alone cannot authenticate a direct local
connection to the Raspberry Pi.

The service checks renewal every 12 hours; Certbot decides when renewal is due.
It validates the hostname, expiration and matching private key, writes an
immutable certificate generation, and atomically switches the generated
`nginx/tls/public/server.conf`. Nginx checks for a changed configuration every
30 seconds and reloads after `nginx -t` succeeds. No Docker socket is mounted.
The existing local CA certificate remains the default for access by IP; the
public certificate is selected only for `PUBLIC_HTTPS_DOMAIN` through SNI.

After changing Compose mounts or adding the Nginx watcher, recreate only Nginx.
For later renewals no recreation is needed. Once the hostname works, set
`APP_PUBLIC_URL=https://<hostname>` and recreate the backend to use it in links.
Grafana's independent `GRAFANA_ROOT_URL` can be changed separately.

For a staging test, set `ACME_STAGING=true` when running the certificate
service. Staging uses separate account/certificate storage and never installs
an untrusted staging certificate into Nginx. Switch back to false and recreate
the service for production. On issuance errors, existing certificates are
preserved and the service retries in one hour. Inspect the private log under
`nginx/acme/log/` without sharing credentials or account details.

Back up `nginx/acme/` and the TLS directories privately. For rollback, stop the
certificate service, move `nginx/tls/public/server.conf` out of that directory,
and reload Nginx: access by IP continues through the original certificate.
Setting `PUBLIC_HTTPS_ENABLED=false` stops future issuance but intentionally
does not remove an already working hostname certificate.

Test configuration and certificate rotation without contacting a CA:

```sh
sudo docker run --rm --read-only --tmpfs /tmp --cap-drop ALL \
  --security-opt no-new-privileges -v "$PWD/nginx:/work:ro" -w /work \
  --entrypoint python certbot/dns-cloudflare:v5.9.0 \
  -m unittest discover -s tests -v
```
