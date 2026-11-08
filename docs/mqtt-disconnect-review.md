# Historical MQTT disconnect review (T6)

Reviewed 2026-11-08. Read-only investigation; no runtime configuration changes, restarts, output commands or OTA.

## Outcome

The available server logs do not cover the seven N1 disconnects. Their broker-side cause cannot be confirmed. Do not label them malformed packets, keepalive timeouts or authentication failures without the missing records.

## Corrected date and firmware-side evidence

The firmware report Relatorio teste noturno - tomatoes firmware.pdf, pages 1-3, dates this test to November 3, 2026 (flash at 23:50 on November 2). The shared task previously referred to November 4/5. N1 lists local times 00:17:59, 00:24:57, 00:25:58, 02:08:29, 02:41:39, 03:26:58 and 03:49:59.

The report records firmware state -3 / connection-reset errors and an unexpected topic carrying a fragment of its own status JSON. It identifies concurrent PubSubClient send/receive buffer access as the suspected mechanism and reports xMqttMutex applied on November 5. This is firmware-side evidence, not proof of the broker's disconnect reason. The later no-drop tests do not reconstruct these old broker events.

## Log coverage checked

| Source | Evidence |
| --- | --- |
| Current Mosquitto file | 4,710 records at inspection; earliest 2026-11-06 12:25:59 -03, latest 2026-11-08 19:47:10 -03. Zero timestamped entries on November 2-5. |
| Current Mosquitto Docker log | 27 records; earliest 2026-11-06 20:41:54 UTC (17:41:54 -03). Zero entries on November 2-5. |
| Rotated files / backups | No older broker log found in the project log directory, /var/log, /tmp, /var/tmp or project backup inventory. MQTT phase-A watch.log is empty; Mosquitto 2.0.18 backup contains the persistence database, not an event log. |
| systemd journal | No docker/mosquitto unit entries for November 2-5. A Mosquitto service journal cannot be assumed to contain container event logs. |
| Other legacy broker | mosquitto_project belongs to blockchain-security; its configured host log directory no longer exists. It is not evidence for the Tomatoes test. |
| Local capture | logs/tomatoes-noite-0611.md covers November 6 (01:57-08:00), after N1; it does not contain those seven events. |

Only paths/metadata and relevant report text were inspected; password files and private keys were not read for this task.

## Follow-up

The historical review is complete with an inconclusive result. Reopen correlation only if an archived broker log or packet capture from the original November 2/3 night is found. Claude was notified of the date discrepancy and asked for an archive path. A queued bridge message does not wake Claude.

For future investigations, consider bounded log rotation and off-device retention, with synchronized timestamps. This is a recommendation, not a configuration change made here.