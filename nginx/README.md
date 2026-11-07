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
