# Users, groups and invitations

Accounts remain in `backend/users.db` (SQLite). Pump and board data remain in MongoDB. Startup adds the user-management tables and columns without replacing existing accounts or password hashes. Keep a SQLite backup before the first startup of this version.

The built-in `admin` / `admin` account is created once and protected against deletion, disabling, username changes and password reset in this version. Its full profile is read-only, including contact information. Existing accounts remain members with their original passwords; they can sign in with their existing email. Their usernames are derived from the email prefix. Public registration is replaced by single-use email invitations.

## Features

- Admin-only user directory, invitation management and group management.
- Profile editing, account enable/disable, group membership and recent activity.
- Server-side sessions with expiration, browser/OS, login/last-seen IP and forced logout. Existing browser logins must sign in again after upgrading.
- Single-use invitation and password-reset links stored as hashes. Resending rotates the invitation link. A password reset signs out all sessions; changing a password signs out other sessions.
- Groups organize users only. They do not grant operational permissions yet.

Management routes require an active session, and administrative operations require the built-in administrator. Existing operational endpoints retain their previous anonymous access for device/API compatibility; when a browser sends a bearer token, those endpoints validate it. This release does not introduce complete authorization for the legacy operational API or MQTT. Group-based operational permissions remain future work.

Session and activity timestamps begin with this version. Browser/OS detection is approximate, based on the user agent. The proxy overwrites forwarded IP headers and the backend trusts one proxy hop. Keep the backend behind the configured Nginx proxy.

## Transactional SMTP with Resend

1. Add a dedicated sending subdomain in Resend and add the DNS records displayed for sending. Wait for the domain to be verified. Leave click tracking disabled so invitation and reset links point directly to the portal.
2. Create an API key with Sending access restricted to the verified subdomain. Put the key in the private root `SMTP_PASS` field on the host.
3. Set the following values in the root `.env`, substituting the verified domain and the portal URL for your installation.

```dotenv
APP_PUBLIC_URL=https://app.example.com
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_AUTH_TYPE=login
SMTP_FROM=notifications@mail.example.com
SMTP_USER=resend
SMTP_PASS=
```

Recreate the backend after filling the key so Compose reloads the environment. First verify delivery to an address you control. Then use a test account to confirm invitation acceptance, password reset and alert delivery. For a LAN-only portal, open invitation and reset links from the LAN.

## Personal Outlook / Hotmail sender

Use an existing personal account. No password for the Microsoft account belongs in `SMTP_PASS`. Internet access is needed to authorize and send email, even though invitation links open only on the local network.

1. Register an application in Microsoft Entra App registrations with support for personal Microsoft accounts. A registration with organizational and personal account support also works. Enable public client flows in Authentication. This helper uses device authorization, so it does not need a redirect URI or client secret.
2. Add the delegated Office 365 Exchange Online `SMTP.Send` permission. The helper requests `https://outlook.office.com/SMTP.Send offline_access` when you consent. Do not select application-only permissions.
3. In the private root `.env`, set `SMTP_OAUTH_CLIENT_ID` to the application's client ID. Set `SMTP_USER` and `SMTP_FROM` to the same personal Outlook/Hotmail address. Keep the host, port, OAuth type and TLS settings from `.env_example`; keep `SMTP_OAUTH_CLIENT_SECRET` blank for this public client.
4. From the project directory, after installing backend dependencies, run the helper below. Follow the Microsoft URL and code locally. Approve with the intended sender account. The helper saves the refresh token directly to `.env` without printing it. Do not share or commit `.env`.

```bash
sudo docker compose run --rm --no-deps -v "$PWD:/project" -w /project/backend backend node scripts/authorize-outlook.cjs
sudo docker compose up -d --no-deps --force-recreate --pull never backend
```

The helper has not been authorized against a real Microsoft account as part of automated tests. Microsoft may require account or app-registration setup before granting access. Consent can be revoked or expire; rerun authorization when needed. Tokens refresh for SMTP access; this implementation does not persist Microsoft refresh-token rotation between sends.

`APP_PUBLIC_URL=http://192.168.1.30` is used in invitation and reset links. Recipients must be on the same network. Change it if the product address changes. A submitted email means the SMTP provider accepted it, not that it reached the inbox; check spam folders.

Until the sender is configured, user and group administration work, while email invitations and password-reset email are unavailable. The interface displays that state. An SMTP failure marks the invitation as failed and preserves it for resending.

## Verification

Backend: `cd backend && yarn test && yarn build` using the Compose Node 20 runtime. Tests use temporary SQLite databases and a local SMTP test server, with no real delivery. Frontend: `cd frontend && yarn build`. Do not replace or remove database volumes to apply this update.

