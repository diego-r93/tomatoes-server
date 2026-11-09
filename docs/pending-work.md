# Pending work

Updated 2026-11-08. Completed features are documented in the commit report and their feature guides.

| Status | Item | Next step |
| --- | --- | --- |
| Paused until Wednesday, 2026-11-11 | Board setup: sensors and calibration | The admin preparation page is deployed. Claude bench-tested synchronized EC excitation and the pH precision fix (firmware local main 3e9bb1b). Resume by agreeing the probe-label persistence and readback pilot (bridge message 29), then validate probe status, raw samples and calibration on the bench. See board-setup-stage1.md. |
| Pending | Greenhouse battery validation | esp32s3-1C1250 had pump supply temporarily connected only for testing; it will remain without supply until greenhouse installation. active=0/fault=104 is expected without supply. New rules for this board remain paused until that installation. After installation with battery power, check remote access, schedules, physical pump operation, driver start/end and recovery. Bench start/end was confirmed in the portal by Claude from 17:00 to 17:15 on 2026-11-08. |
| Waiting for user | Firmware repository and publication | Claude reports local main 3e9bb1b. The bench board runs the pre-commit E1/pH build and the second board remains on 16a5c1c. VMUV retry, pulse telemetry, R9 fixes and the T2 supervisor test were previously completed. Publication waits for the intended GitHub repository and explicit user authorization; do not push firmware meanwhile. |
| Pending | Battery Bluetooth stability | Repeat a prolonged read-only test with better signal. The collector and Energy dashboard work, but timeouts occurred near -83 dBm. |
| In progress | Interface languages | Continue translating remaining pages into Portuguese and Spanish; keep English as the default. Devices, Configuration, Help and Dashboard library/editor/inspector/time-picker translations are implemented. Remaining pages include Database, Alerting and Users. |
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
| Planned | SQLite file permissions | Restrict access to the database and its WAL and SHM files to the backend identity and authorized administrators. Verify permissions after a container restart. |
| Planned | SQLite backup and restore | Create a consistent backup while the backend is running and verify restoration on an isolated copy. Include user and alert data in the check. |
| Planned | SQLite library update | Keep SQLite and update the backend driver to a build with the WAL reset fix. Confirm the SQLite version loaded by the container and validate login and alert behavior on a restored copy before deployment. |
| In progress | Gradual frontend migration to TypeScript | The pump history pilot and the Devices discovery client, inventory normalization and compact card are typed. The production build runs `vue-tsc` for migrated components and TypeScript modules. Continue with the Devices GPIO command flow as a separate change before expanding to Alerting and Dashboards. Keep legacy JavaScript during the transition. |
| Planned | Broader backend refactoring | TypeScript tooling migration is complete; architectural refactoring of remaining modules is separate. |
| Planned | Grafana retirement | Remove the temporary comparison service when the Tomatoes dashboards cover the required features. Grafana is already upgraded and isolated behind HTTPS. |
| Planned | MQTT hostname | Plan mqtt.ceresgrow.com.br, broker certificate SAN and factory endpoint configuration. Do not expose MQTT externally as part of the local portal setup. |
| Planned | Pull-based OTA | Store signed firmware by model, notify boards through MQTT and let boards download through HTTPS for cloud deployment. Requires coordinated firmware work. |
| Planned | Printed activation code | Bind factory boards to the intended installation/account during browser approval before cloud rollout. |
| Planned | Jumper-free electronics calibration | Evaluate electronic reference/zero selection, switch error budget, safe defaults and isolation. Keep solution-based probe calibration separate. Current PCB retains guided physical jumpers; see board-setup-stage1.md. |
| Planned | Next PCB driver feedback | Evaluate ADC sampling of IPROPI and ESP32 connections for nFAULT/DRVOFF. Current TCC v2.0 does not measure pump current; a driver ON result does not confirm water flow. Include EN and IO0 in the programming connector for automatic flashing, as noted by Claude after read-only UART0 validation. Coordinate with Claude. |
| Planned | Cloud migration | Preserve factory-certificate admission and registration while planning tenant isolation, backups and deployment. |

## Next tasks in order

1. Replace the factory administrator credential and verify secure rotation.
2. Protect the SQLite files, test a consistent backup and restore, and validate the library update on the restored copy.
3. Continue the frontend TypeScript migration with Devices GPIO commands and confirmation, after the read-only discovery and inventory work.
4. Translate Database into Portuguese and Spanish and verify both languages plus the English default in the portal. Continue with Users and Alerting as separate deliveries.
5. Audit the MQTT service identities and sudo grants in read-only mode. Record the current scope and propose changes that preserve SSH and VS Code access.

### Waiting on a test or external input

- Calibration is paused until Wednesday, 2026-11-11. Start by reviewing the probe-label persistence and readback proposal with Claude.
- Greenhouse and battery checks need physical validation. Historical MQTT disconnects need the original log archive. Firmware publication, pull-based OTA and the next PCB require separate coordination.

### Recently completed

- **Pump pulse history and CSV** (`21a9421`). Devices offers history by board, date, pump and result, with complete filtered CSV export. The production import completed and the CSV returned 19 and 14 records for the two boards at validation. Older attempts without recorded feedback can only be recovered if another record exists.
- **Shared data retention** (`21a9421`). Administrators have a single setting for readings and pulse history in Configuration. Production remains at 180 days. Shorter retention requires confirmation and was tested separately with an isolated instance.
- **Dashboard delete action** (`c929efa`). Replaced the three-dot menu with a right-aligned trash button. Verified the confirmation and cancellation with all four dashboards present in production.

Devices recovered after a real Windows suspension of 4 minutes 18 seconds on November 8, 2026. The first post-wake discovery returned HTTP 200 about 3 seconds after wake, with no page reload. Both boards were Online in Chrome and 30-second polling resumed. This run used Auto-refresh 30s, so it did not isolate the resume trigger from polling or verify recovery in Off mode. Five automated resume tests previously passed. Help in English, Portuguese and Spanish, verified in the production browser. Optimized the battery and pump controller queries, verified equivalent 24-hour results and checked both dashboards at 12 hours, 24 hours and 3 days. Top-center floating Devices confirmation below the header (181c504); stable Devices command feedback and fixed refresh progress layout; 14 additional bench diagnostic panels (20 to 34), preserving original charts.  Stats/Gauges in existing dashboards and driver/battery alert support (c30aa83, aa95d41); the sensor-free second-board dashboard (54665e2). Claude previously confirmed the R9 fixes and the T2 supervisor recovery test. Temporary pump-supply tests passed on esp32s3-1C1250; greenhouse installation remains pending.

The local portal domain and public certificate are complete: https://app.ceresgrow.com.br. The portal remains LAN-only. MQTT migration, factory registration, removal enforcement, legacy HTTP schedule-route removal, production builds, SSH key authentication and network exposure checks are completed; they are not open tasks here.

Firmware note: TCC v2.0 has no ADC measurement of pump current. For the next PCB revision, evaluate routing IPROPI to an ADC and nFAULT/DRVOFF to the ESP32; short-circuit protection alone does not confirm normal load or water flow.

Coordination: a local Windows MCP bridge now holds shared tasks for both agents. The bridge is a development tool separate from this repository and the Raspberry. Review the inbox at the beginning and end of work; messages provide context, not new authorization for output commands or OTA.
