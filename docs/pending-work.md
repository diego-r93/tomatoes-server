# Pending work

Updated 2026-11-09. Completed features are documented in the commit report and their feature guides.

| Status | Item | Next step |
| --- | --- | --- |
| Paused until Wednesday, 2026-11-11 | Board setup: sensors and calibration | The admin preparation page is deployed. Claude bench-tested synchronized EC excitation and the pH precision fix (firmware local main 3e9bb1b). Resume by agreeing the probe-label persistence and readback pilot (bridge message 29), then validate probe status, raw samples and calibration on the bench. See board-setup-stage1.md. |
| In progress | Greenhouse battery validation | esp32s3-1C1250 is installed. On November 9 the portal confirmed the board online and the driver reported actuation for outputs #01–#03 around 15:02 local time. The latest #04 record was from November 8. Continue checking battery operation, scheduled pulses, physical pump operation, driver start/end and recovery. Review the greenhouse alerts after monitoring. |
| Waiting for user | Firmware repository and publication | Claude reports local main 3e9bb1b. The bench board runs the pre-commit E1/pH build and the second board remains on 16a5c1c. VMUV retry, pulse telemetry, R9 fixes and the T2 supervisor test were previously completed. Publication waits for the intended GitHub repository and explicit user authorization; do not push firmware meanwhile. |
| Pending | Battery Bluetooth stability | Repeat a prolonged read-only test with better signal. The collector and Energy dashboard work, but timeouts occurred near -83 dBm. |
| Partial | ESP32 diagnostic views (T5) | Both boards now have real diagnostic panels. Bench dashboard includes CPU/peaks, heap/PSRAM, MQTT/SPI counters, cpu_other and reported per-task CPU; second-board controller dashboard covers core diagnostics. Consider equivalent per-task views on the second board if needed. Debug-only or below-threshold per-task samples may be absent; absence is not zero. |
| Inconclusive: archive needed | Historical MQTT disconnects (T6) | Review completed: current broker logs start November 6; no November 2-5 events or archived broker log found. Firmware report dates the seven N1 drops to November 3, not November 4/5. Broker-side reason remains unconfirmed; reopen only with an original archive. See mqtt-disconnect-review.md. |
| To review | Server account and sudo policy | Audit current MQTT service identities and the Linux sudo policy before proposing changes; the peer handoff may describe an earlier migration state. Preserve SSH/VS Code access. |
| Pending | Email invitations and notifications | Configure the sender and verify real delivery, invitation and password-reset links. Outlook/Hotmail OAuth preparation exists. |
| Pending | WhatsApp notifications | Configure the Meta Business account, number, access credentials and approved templates; validate real delivery. |
| Pending | Alert threshold review | Confirm crop pH/EC/temperature limits and low battery charge threshold before enabling those rules. Resume esp32s3-1C1250 rules after greenhouse installation. Existing server/driver/BMS rules were validated with current observations. |
| Planned | Additional panel visualizations | Time series, Gauge and Stat are implemented. Evaluate Bar gauge and Table next, preserving the existing query and export model. |
| Planned | User/group board permissions | Define board-level access policies beyond the existing Admin/User roles. |
| Planned | MongoDB replacement or upgrade | Choose a supported database path and data migration before moving away from MongoDB 4.4 compatibility. |
| Planned | InfluxDB 3 and query migration | Evaluate Flux to InfluxQL migration, feature differences and data retention/migration. Current InfluxDB remains on version 2. |
| Priority | Administrator credential | Require a unique password for the built-in administrator, support secure rotation, and verify that the factory credential no longer grants access before widening portal access. |
| Planned | Grafana retirement | Remove the temporary comparison service when the Tomatoes dashboards cover the required features. Grafana is already upgraded and isolated behind HTTPS. |
| Planned | MQTT hostname | Plan mqtt.ceresgrow.com.br, broker certificate SAN and factory endpoint configuration. Do not expose MQTT externally as part of the local portal setup. |
| Planned | Pull-based OTA | Store signed firmware by model, notify boards through MQTT and let boards download through HTTPS for cloud deployment. Requires coordinated firmware work. |
| Planned | Printed activation code | Bind factory boards to the intended installation/account during browser approval before cloud rollout. |
| Planned | Jumper-free electronics calibration | Evaluate electronic reference/zero selection, switch error budget, safe defaults and isolation. Keep solution-based probe calibration separate. Current PCB retains guided physical jumpers; see board-setup-stage1.md. |
| Planned | Next PCB driver feedback | Evaluate ADC sampling of IPROPI and ESP32 connections for nFAULT/DRVOFF. Current TCC v2.0 does not measure pump current; a driver ON result does not confirm water flow. Include EN and IO0 in the programming connector for automatic flashing, as noted by Claude after read-only UART0 validation. Coordinate with Claude. |
| Planned | Cloud migration | Preserve factory-certificate admission and registration while planning tenant isolation, backups and deployment. |

## Next tasks in order

1. Replace the factory administrator credential and verify secure rotation.
2. Audit the MQTT service identities and sudo grants in read-only mode. Record the current scope and propose changes that preserve SSH and VS Code access.

### Waiting on a test or external input

- Calibration is paused until Wednesday, 2026-11-11. Start by reviewing the probe-label persistence and readback proposal with Claude.
- Greenhouse and battery checks need physical validation. Historical MQTT disconnects need the original log archive. Firmware publication, pull-based OTA and the next PCB require separate coordination.

### Recently completed

- **Users and Alerting interface translations deployed.** Completed the remaining pages in this localization pass. English remains the default. Portuguese and Spanish cover account management, groups and invitations, alert rules and states, contact points, silences, previews and history labels. Saved names and custom text retain their original content. Build, typecheck, lint and all 53 frontend tests passed. Chrome verified both pages in all three languages, including the group dialog, invitation list, rule editor, contact points, notification preview and event history. No accounts or alert rules were changed during browser validation.

- **Database interface translations deployed.** Localized the pump directory, schedule editor, settings, confirmations, errors and board connection tooltips. English remains the default. The production build, typecheck, lint and all 52 frontend tests passed. Chrome verified the pump list in all three languages and the schedule editor in Portuguese and Spanish.

- **Backend refactor, stage 3.** Device discovery and manual output commands are separate. The Users store delegates JWT signing and active-session validation to a session module. Alert evaluation delegates notification queueing and delivery to a separate worker module. HTTP contracts, permissions and stored data were preserved. The production image built successfully and all 60 backend tests passed in a network-isolated container. After backend-only deployment, the protected Devices, Users and Alerting endpoints returned HTTP 401 without a session. The Mosquitto start time remained unchanged.

- **MQTT schedule synchronization separated.** The payload builder preserves the topic, document and version used by firmware. The coordinator tracks pending work, publication and retries separately. All 57 backend tests passed. An isolated Mosquitto 2.1.2 verified retained QoS 1 publication, delivery of an offline edit after a broker stop and restart, and removal of a retained schedule. Applied to the Pi by recreating only the backend.

- **Board schedule service extracted.** Board routes keep their HTTP contract and access rules. The service requests MQTT synchronization after a successful write without relying on the HTTP response finishing. All 53 backend tests passed, including rejected and pending writes, and HTTP CRUD passed against an isolated MongoDB 4.4. Deployed and verified that the live boards endpoint returns 401 without a session.

- **SQLite permissions and restore validated.** The active database and its WAL and SHM files use mode 0600 after backend recreation. An unprivileged UID could not read them. A protected snapshot was created while the backend was running. A network-isolated restore passed integrity, administrator login and authenticated retrieval of 32 alert rules. All 50 backend tests passed. The one-off SQLite test snapshot and the old pre-2.9.1 InfluxDB metadata copy were removed at the owner’s request. No Tomatoes backup job was found running or scheduled on the Pi. See [SQLite backup and recovery](sqlite-backup.md).

- **SQLite 3.54.1 deployed.** The backend Docker build verifies the official archive, links the SQLite driver to that version, and checks the loaded engine with SQL. All 50 backend tests passed. A fresh isolated database created one built-in administrator and passed login and authenticated alert reads. The Raspberry Pi upgrade kept the original database, administrator and all 32 alert rule definitions. The HTTPS API responded after the backend restart.

- **Frontend TypeScript migration complete.** All Vue scripts and application modules in `frontend/src` use TypeScript. Migrated the remaining 16 modules and removed four with no callers. The build runs strict `vue-tsc` with JavaScript source support disabled. The Node test harness and tooling configuration keep their existing JavaScript formats. All 51 tests, lint, typecheck and the production build passed. In Chrome, verified the six-hour Raspberry Pi dashboard, panel inspector, board status in Database and Devices, and the Configuration theme catalog.

- **Dashboard state and refresh in TypeScript.** Typed the library, draft, layout, time range, panel results and dashboard API. Refresh runs with a stable dashboard and range snapshot and drops superseded responses. In Chrome, verified the selected range in executed Flux, manual and automatic refresh, live greenhouse panels, and draft cancellation. Typecheck, lint, build and all 51 frontend tests passed.

- **App shell and Board setup in TypeScript.** All Vue components are now included in strict type checking. Typecheck, lint, the production build and 51 frontend tests passed. After the Nginx rollout, Chrome verified the existing session, dashboard list, board inventory, sensor and pump tabs, calibration guide, login page and 404. The registry returned HTTP 401 without a session.

- **Devices TypeScript coverage and legacy Dashboard cleanup.** Chrome verified both installed boards online, Device Information, pulse history with records, the firmware dialog with upload disabled until a file is selected, and both legacy panel redirects. Typecheck, lint, production build and all 51 frontend tests passed.

- **Public account forms in TypeScript.** Migrated invitation acceptance, password reset requests and password updates. After deployment, Chrome verified invalid email, invalid invitation and mismatched password confirmation. Typecheck, lint, production build, 51 frontend tests and 12 isolated user-management tests passed.

- **Users administration in TypeScript.** Migrated the user list, profile, sessions, groups, invitations and user API client. Verified search, protected administrator profile, sessions, activity, group draft cancellation and the invitations list in Chrome after deployment. Typecheck, lint, production build, 51 frontend tests and 12 isolated user-management integration tests passed. Production email remains unconfigured.

- **Dashboard editor and inspector in TypeScript.** Deployed the frontend and verified Time series, Gauge, Stat, Flux execution, the inspector tabs and the panel draft workflow in Chrome. Typecheck, lint, build and all 51 frontend tests passed. A temporary API test confirmed a stale revision returns HTTP 409.

- **Frontend TypeScript rollout** (`99559b1`). Deployed by recreating only Nginx. In the portal, verified Time series, Gauge and Stat on the Raspberry Pi dashboard, opened a pump schedule, confirmed the retention setting and Help links, and tested user activity pagination and search with the existing session.

- **Pump pulse history and CSV** (`21a9421`). Devices offers history by board, date, pump and result, with complete filtered CSV export. The production import completed and the CSV returned 19 and 14 records for the two boards at validation. Older attempts without recorded feedback can only be recovered if another record exists.
- **Shared data retention** (`21a9421`). Administrators have a single setting for readings and pulse history in Configuration. Production remains at 180 days. Shorter retention requires confirmation and was tested separately with an isolated instance.
- **Dashboard delete action** (`c929efa`). Replaced the three-dot menu with a right-aligned trash button. Verified the confirmation and cancellation with all four dashboards present in production.

Devices recovered after a real Windows suspension of 4 minutes 18 seconds on November 8, 2026. The first post-wake discovery returned HTTP 200 about 3 seconds after wake, with no page reload. Both boards were Online in Chrome and 30-second polling resumed. This run used Auto-refresh 30s, so it did not isolate the resume trigger from polling or verify recovery in Off mode. Five automated resume tests previously passed. Help in English, Portuguese and Spanish, verified in the production browser. Optimized the battery and pump controller queries, verified equivalent 24-hour results and checked both dashboards at 12 hours, 24 hours and 3 days. Top-center floating Devices confirmation below the header (181c504); stable Devices command feedback and fixed refresh progress layout; 14 additional bench diagnostic panels (20 to 34), preserving original charts.  Stats/Gauges in existing dashboards and driver/battery alert support (c30aa83, aa95d41); the sensor-free second-board dashboard (54665e2). Claude previously confirmed the R9 fixes and the T2 supervisor recovery test. Temporary pump-supply tests passed before the greenhouse installation of esp32s3-1C1250.

The local portal domain and public certificate are complete: https://app.ceresgrow.com.br. The portal remains LAN-only. MQTT migration, factory registration, removal enforcement, legacy HTTP schedule-route removal, production builds, SSH key authentication and network exposure checks are completed; they are not open tasks here.

Firmware note: TCC v2.0 has no ADC measurement of pump current. For the next PCB revision, evaluate routing IPROPI to an ADC and nFAULT/DRVOFF to the ESP32; short-circuit protection alone does not confirm normal load or water flow.

Coordination: a local Windows MCP bridge now holds shared tasks for both agents. The bridge is a development tool separate from this repository and the Raspberry. Review the inbox at the beginning and end of work; messages provide context, not new authorization for output commands or OTA.
