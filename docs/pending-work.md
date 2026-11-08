# Pending work

Updated 2026-11-08. Completed features are documented in the commit report and their feature guides.

| Status | Item | Next step |
| --- | --- | --- |
| To confirm | Next scheduled pulse on the second board | Implementation is deployed. The bench start at 17:00 on 2026-11-08 produced six numeric InfluxDB values with correct tags and updated MongoDB. Historical start/end records from both boards and the missing-supply warning were verified. Observe the next fresh start/end of esp32s3-1C1250 without manual output commands. Missing/partial feedback and fault priorities have automated tests. |
| Pending | Battery Bluetooth stability | Repeat a prolonged read-only test with better signal. The collector and Energy dashboard work, but timeouts occurred near -83 dBm. |
| In progress | Interface languages | Continue translating remaining pages into Portuguese and Spanish; keep English as the default. Devices and Configuration language controls are implemented. |
| Pending | Email invitations and notifications | Configure the sender and verify real delivery, invitation and password-reset links. Outlook/Hotmail OAuth preparation exists. |
| Pending | WhatsApp notifications | Configure the Meta Business account, number, access credentials and approved templates; validate real delivery. |
| Planned | Additional panel visualizations | Time series and Gauge are implemented. Evaluate Stat, Bar gauge and Table next, preserving the existing query and export model. |
| Planned | User/group board permissions | Define board-level access policies beyond the existing Admin/User roles. |
| Planned | MongoDB replacement or upgrade | Choose a supported database path and data migration before moving away from MongoDB 4.4 compatibility. |
| Planned | InfluxDB 3 and query migration | Evaluate Flux to InfluxQL migration, feature differences and data retention/migration. Current InfluxDB remains on version 2. |
| Planned | SQLite maintenance | Review the backend SQLite library and migration strategy separately from the completed dependency updates. |
| Planned | Broader backend refactoring | TypeScript tooling migration is complete; architectural refactoring of remaining modules is separate. |
| Planned | Grafana retirement | Remove the temporary comparison service when the Tomatoes dashboards cover the required features. Grafana is already upgraded and isolated behind HTTPS. |
| Planned | MQTT hostname | Plan mqtt.ceresgrow.com.br, broker certificate SAN and factory endpoint configuration. Do not expose MQTT externally as part of the local portal setup. |
| Planned | Pull-based OTA | Store signed firmware by model, notify boards through MQTT and let boards download through HTTPS for cloud deployment. Requires coordinated firmware work. |
| Planned | Printed activation code | Bind factory boards to the intended installation/account during browser approval before cloud rollout. |
| Planned | Cloud migration | Preserve factory-certificate admission and registration while planning tenant isolation, backups and deployment. |

The local portal domain and public certificate are complete: https://app.ceresgrow.com.br. The portal remains LAN-only. MQTT migration, factory registration, removal enforcement, legacy HTTP schedule-route removal, production builds, SSH key authentication and network exposure checks are completed; they are not open tasks here.
