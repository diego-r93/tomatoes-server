# Pending work

Updated 2026-11-08. Completed features are documented in the commit report and their feature guides.

| Status | Item | Next step |
| --- | --- | --- |
| To confirm | Devices long-open validation | Resume correction is deployed: visibility, focus, pageshow and online events refresh discovery with request coalescing. New preferences default to 30 seconds; saved Off is preserved and displayed. All 39 frontend tests, lint and builds passed; both boards were Online in the browser. A prolonged real background-tab / computer-suspension test remains to be repeated because computer use was interrupted. |
| Pending | Greenhouse battery validation | esp32s3-1C1250 is intentionally without pump supply; active=0/fault=104 is expected. After installation with battery power, check remote access, schedules, physical pump operation, driver start/end and recovery. Bench start/end was confirmed in the portal by Claude from 17:00 to 17:15 on 2026-11-08. |
| Pending | Firmware commits publication | Claude reports firmware main 9dca092 and VMUV retry / pulse telemetry changes are local, not pushed. Coordinate publication in the firmware repository with Claude. |
| Pending | Battery Bluetooth stability | Repeat a prolonged read-only test with better signal. The collector and Energy dashboard work, but timeouts occurred near -83 dBm. |
| In progress | Interface languages | Continue translating remaining pages into Portuguese and Spanish; keep English as the default. Devices, Configuration and Dashboard library/editor/inspector/time-picker translations are implemented. Remaining pages include Database, Alerting and Users. |
| Pending | ESP32 diagnostic views and historical disconnects | Add a view for diag metrics and review available broker logs for the old November 4/5 disconnects. The later 12-hour test reported no drops. |
| To review | Server account and sudo policy | Audit current MQTT service identities and the Linux sudo policy before proposing changes; the peer handoff may describe an earlier migration state. Preserve SSH/VS Code access. |
| Pending | Email invitations and notifications | Configure the sender and verify real delivery, invitation and password-reset links. Outlook/Hotmail OAuth preparation exists. |
| Pending | WhatsApp notifications | Configure the Meta Business account, number, access credentials and approved templates; validate real delivery. |
| Planned | Additional panel visualizations | Time series, Gauge and Stat are implemented. Evaluate Bar gauge and Table next, preserving the existing query and export model. |
| Planned | User/group board permissions | Define board-level access policies beyond the existing Admin/User roles. |
| Planned | MongoDB replacement or upgrade | Choose a supported database path and data migration before moving away from MongoDB 4.4 compatibility. |
| Planned | InfluxDB 3 and query migration | Evaluate Flux to InfluxQL migration, feature differences and data retention/migration. Current InfluxDB remains on version 2. |
| Planned | SQLite maintenance | Review the backend SQLite library and migration strategy separately from the completed dependency updates. |
| Planned | Broader backend refactoring | TypeScript tooling migration is complete; architectural refactoring of remaining modules is separate. |
| Planned | Grafana retirement | Remove the temporary comparison service when the Tomatoes dashboards cover the required features. Grafana is already upgraded and isolated behind HTTPS. |
| Planned | MQTT hostname | Plan mqtt.ceresgrow.com.br, broker certificate SAN and factory endpoint configuration. Do not expose MQTT externally as part of the local portal setup. |
| Planned | Pull-based OTA | Store signed firmware by model, notify boards through MQTT and let boards download through HTTPS for cloud deployment. Requires coordinated firmware work. |
| Planned | Printed activation code | Bind factory boards to the intended installation/account during browser approval before cloud rollout. |
| Planned | Next PCB driver feedback | Evaluate ADC sampling of IPROPI and ESP32 connections for nFAULT/DRVOFF. Current TCC v2.0 does not measure pump current; a driver ON result does not confirm water flow. Coordinate with Claude. |
| Planned | Cloud migration | Preserve factory-certificate admission and registration while planning tenant isolation, backups and deployment. |

The local portal domain and public certificate are complete: https://app.ceresgrow.com.br. The portal remains LAN-only. MQTT migration, factory registration, removal enforcement, legacy HTTP schedule-route removal, production builds, SSH key authentication and network exposure checks are completed; they are not open tasks here.

Firmware note: TCC v2.0 has no ADC measurement of pump current. For the next PCB revision, evaluate routing IPROPI to an ADC and nFAULT/DRVOFF to the ESP32; short-circuit protection alone does not confirm normal load or water flow.

Coordination: a local Windows MCP bridge now holds shared tasks for both agents. The bridge is a development tool separate from this repository and the Raspberry. Review the inbox at the beginning and end of work; messages provide context, not new authorization for output commands or OTA.
