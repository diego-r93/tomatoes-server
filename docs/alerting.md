# Alerting

The Alerting page uses the Rule list layout. Rules, contact points, silences, observed devices, event history and the notification outbox are stored in the existing backend SQLite database (`backend/users.db`). Pump and board data remain in MongoDB. Measurements remain in InfluxDB.

No example rules or contact points are created on startup. Sign in as an administrator, create a rule, select the exact hostname and adjust its limits before enabling it. New forms start paused. Other active users can read rules, silences and event history; only administrators can change them or view recipient addresses and delivery attempts.

## Evaluation

The backend evaluates enabled rules independently of the browser. A scheduler checks due rules every five seconds; each rule has its own evaluation interval (10–3600 seconds). Slow sources can delay a cycle. This is operational monitoring, not a real-time safety controller. No alert action changes GPIO or firmware.

- **Normal:** a valid reading is healthy.
- **Pending:** the threshold is breached, but the continuous pending period has not elapsed.
- **Firing:** the breach lasted for the pending period. It stays firing until the separate recovery threshold is reached (hysteresis).
- **No data:** no matching value, unknown GPIO, stale timestamp or device never observed.
- **Error:** the monitor cannot connect to MQTT, query InfluxDB, or select one unambiguous series.
- **Paused:** evaluation is disabled.

No data and Error are incidents too, with external notifications when contacts are enabled and configured. They are not interpreted as zero or recovery. A missing sample breaks a pending period. Restarting the backend resets unfinished pending timers. A firing incident retains its recovery latch across restarts and telemetry interruptions.

A silence stops external notifications only. State transitions and history continue. Pausing stops evaluation. Editing a rule starts its evaluation afresh and cancels queued notifications from its previous revision.

## Sources

- **Device last seen:** seconds since the last reply received by this monitor. The collector subscribes to `devices/+` and accepts reports only when the payload hostname matches the topic and publishes the existing read-only `getdevices` / `get all` discovery request every 30 seconds. It does not publish to output topics. Last observations persist across restarts. If the broker is disconnected, the rule reports Error instead of declaring every device offline.
- **Wi-Fi signal:** the device's reported RSSI in dBm.
- **GPIO ON duration:** a lower bound based on continuously observed ON reports. Observation resets after a backend restart or a gap of 90 seconds. An OFF report resets it. This does not prove actual water flow or that a short OFF/ON event did not occur between reports.
- **CPU temperature:** Telegraf `cpu_temperature`, field `value`, host tag; milli-degrees from the existing thermal-file input are converted to degrees Celsius.
- **Disk usage:** Telegraf `disk`, field `used_percent`, exact host and path tags.
- **Custom sensor metric:** an existing numeric InfluxDB measurement and field with an exact host tag, optional display unit and positive multiplier. It does not create sensor data. More than one matching series produces Error rather than choosing one arbitrarily.

Influx queries search the last 24 hours and apply the rule's freshness limit (default 180 seconds). MQTT RSSI and GPIO also apply freshness; last-seen age intentionally does not. A host with no stored metric produces No data. Example thresholds in forms are starting points, not crop or equipment recommendations. Clock synchronization on the Pi and devices matters.

## Notifications

In-app means current rule state and event history; it does not include operating-system push notifications. External notifications are queued on incident state changes, recovery and unresolved repeats (default one hour, minimum 15 minutes). Disabled or unconfigured providers are skipped; in-app monitoring still works. Configuration changes alone do not send test messages. Queued messages are rechecked against rule revision, current state, silence, contact enabled state, recipient list and WhatsApp permission before dispatch.

The durable worker retries failed requests up to three times with one- and two-minute delays. A provider acceptance is recorded as **submitted**, not delivered or read. Stale jobs are cancelled. An in-flight request cannot be recalled. A crash after acceptance but before recording it can cause a duplicate after restart; delivery is best effort with at-least-once retries. When a silence ends or a provider becomes ready, an unresolved incident is eligible for its next repeat; an incident that recovered while silenced does not send a delayed recovery.

Event history is retained for 90 days; completed attempts for 30 days, cleaned once per day. These periods are separate from InfluxDB bucket retention. Include SQLite and its consistent backup in your normal backups.

### Email

Uses the existing `SMTP_*` variables and `APP_PUBLIC_URL` described in [user-management.md](user-management.md). Personal Outlook/Hotmail requires the existing OAuth2 setup. SMTP sender and credentials must be completed before email is available. Do not put credentials in the frontend. Invite and password-reset email behavior is preserved.

### WhatsApp setup (optional)

This implementation uses Meta's official WhatsApp Cloud API. No personal WhatsApp Web session or QR-code bridge is used. You still need a Meta developer/business setup, a registered sender, the necessary messaging permissions and a production access token from Meta. Follow the account-specific verification and token guidance shown in your Meta dashboard.

1. Configure your WhatsApp Business Platform sender in Meta and obtain its **Phone Number ID**. This is a numeric API ID, not the visible phone number.
2. Select a currently supported Graph API version from that app's documentation/dashboard.
3. Create and get approval for a template named `tomatoes_alert_status` (or choose your own name in the contact point), language `en_US` (or the exact approved language). The body must contain exactly these six positional text parameters, in this order:
   1. Rule name
   2. State (`Firing`, `No data`, `Error` or `Resolved`)
   3. Severity
   4. Target hostname / GPIO
   5. Latest reading
   6. Trigger and recovery condition

   Example body: `Tomatoes alert: {{1}}. State: {{2}}. Severity: {{3}}. Target: {{4}}. Reading: {{5}}. Condition: {{6}}.`

   No header, button or URL parameters are sent. Template approval and category are determined by Meta. Sample parameter values are required during approval.
4. Fill the private `.env`: `WHATSAPP_API_VERSION`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`. Set `WHATSAPP_ENABLED=true` only after setup. Never commit tokens. The example file intentionally leaves the version and credentials blank.
5. Recreate the backend container to load changed environment values (a restart alone does not reload Compose `env_file`). From the project directory, run `sudo docker compose up -d --no-deps --force-recreate --pull never backend`.
6. In Alerting / Contact points, create a WhatsApp contact with international recipients such as `+<country code><number>`, exact approved template/language and confirmed recipient permission. Enable it and select it in your rule.

The page's provider-ready flag checks local configuration only; it does not validate credentials or template approval with Meta. Provider rejection appears under History / Notification attempts. No inbound webhook or delivery/read receipt processing is implemented. Outbound HTTPS internet access is required on the Pi. Invite links still point to your configured local Tomatoes address, which is reachable only on your LAN. WhatsApp message recipients do not need access to the LAN to receive the text.

Meta requires appropriate recipient permission and approved templates for business-initiated messages. Platform charges and eligibility depend on Meta's current policy; consult the official documentation before enabling production delivery:
- [WhatsApp Business Platform](https://whatsappbusiness.com/products/business-platform/)
- [Business Messaging Policy](https://whatsappbusiness.com/policy/)
- [Platform pricing](https://whatsappbusiness.com/products/platform-pricing/)

## Validation

`cd backend && node --test -r ts-node/register tests/alerting.test.cjs` runs against a temporary SQLite database and mocked transports, with no real email, WhatsApp or GPIO writes. `yarn build` checks backend TypeScript. The frontend uses the project's Node 24 runtime and its normal build and ESLint commands.


## Driver and battery rules (2026-11-08)

Pump-driver rules select an approved hostname, pump 1–4 and a condition: failed actuation, missing feedback, short circuit, overtemperature or pump supply absent/low. They use the existing pulse tracker (actual start/end packets and expected schedules), without publishing commands. Missing or incomplete feedback never becomes a successful pulse. Failed results remain until the next pulse; no pulse observed is No data. A driver ACTIVE report does not confirm water flow. Binary condition values are 1 (present) and 0 (absent).

Metric and metric-age rules can use an exact `device` tag for the battery, alongside the fixed measurement/field/host filters. An age rule needs either an exact MQTT topic or an exact device tag; unmatched/multiple series remain No data/Error. BMS protection is its reported/calculated protection flag, not an inferred voltage threshold.

The installation migration preserves the original three rules and adds in-app-only rules. After validation there are 32 rules: 12 enabled/Normal and 20 paused. New enabled rules cover the two scheduled bench pumps, disk usage, battery telemetry age and BMS protection. No external contacts were added. New rules for esp32s3-1C1250 are paused: its supply was powered temporarily for tests and will remain absent until greenhouse installation. Unused bench pump rules and the suggested low-charge rule are also paused. Review crop limits and battery low-charge limits before enabling them; after greenhouse installation review and resume that board's rules through the browser.

GPIO-duration limits in this migration use configured pulse duration plus a 30-second margin and a 10-second pending period. This counts observed ON time; it does not turn a pump off and does not confirm continuous operation across monitoring gaps.
