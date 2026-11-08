# Read-only BLE battery collector

The existing Telegraf runs a persistent Python/Bleak process through `inputs.execd`. BlueZ stays on the Raspberry Pi host. Only `/run/dbus` is mounted, with no host networking, HCI device mapping or privileged container. The Telegraf image adds Python and pinned Bleak dependencies, without installing packages on the host.

## Configuration

Set `BATTERY_BLE_ENABLED=true` in the root `.env`. Configure `BATTERY_BLE_NAME` or the exact `BATTERY_BLE_ADDRESS`, `BATTERY_DEVICE_ID`, expected cell count and polling times there. Keep the phone applications disconnected while the server owns the BMS connection. The defaults are for the tested 8S Mega Energy JBD battery.

D-Bus authenticates against the host account database. `TELEGRAF_UID=65534` and `TELEGRAF_GID=65534` use the existing non-root nobody account on Raspberry Pi OS. UID 999 from the standard Telegraf image does not exist on the tested host and is refused by D-Bus. On another OS, select an existing non-root host UID/GID in `.env`. The supplementary video group remains for vcgencmd. A read-only socket mount does not restrict D-Bus method calls. The collector limits its own operations to BlueZ and the two read commands below.

Rebuild the Telegraf image when the Python code or its dependencies change. Recreate the Telegraf container after environment or mount changes. Host BlueZ/D-Bus must be active, and the configured adapter must exist. A missing adapter or unavailable battery is retried with backoff, leaving other Telegraf inputs running.

## Protocol and freshness

Only `DDA50300FFFD77` and `DDA50400FFFC77` can be sent. FF01 notifications are buffered and validated using packet length, status, terminator and checksum. Both responses must be valid and report the configured number of cells before a measurement batch is emitted. A minimum 250 ms gap separates read queries. Timeout and connection loss clear partial packets and reconnect with a bounded backoff.

Battery measurements are emitted once per new valid cycle, with the acquisition timestamp. Old values are not repeated after a failed read. `battery_collector` continues reporting connection state, last valid read time/age, errors and successful reconnections. Counters reset when the collector restarts. A weak radio link can disconnect even after a valid reading; inspect connection and reading age as well as battery gauges.

- `battery`: BMS voltage, signed current, SOC, configured/remaining Ah, cycles, MOS states, raw protection/balance flags and decoded protection bits. Optional alarm flags are read only when present in the extended response.
- `battery_cell`: cell voltage with a stable `cell` tag.
- `battery_temperature`: temperatures with a stable `probe` tag.
- `battery_calculated`: signed power, approximate remaining Wh, cell summary/difference and state indicators.
- `battery_collector`: collector health. The stable `device` tag identifies the installation. Telegraf adds its existing host tag.

Positive current is charging, negative is discharging. Power is voltage × current. Estimated Wh is instantaneous voltage × remaining Ah, not integrated energy or guaranteed usable energy, and can exceed nominal label Wh at full voltage. Temperature decoding uses the JBD 0.1 K convention with offset 2731. The FET unit bit is respected for 0.1 A/Ah variants.

## Dashboard

After BLE validation, the backend creates `Mega Energy battery` in folder `Energy` when enabled. It uses the existing MongoDB dashboard collection, InfluxDB bucket and query API. No additional API or database is created. Twenty panels cover SOC, voltage/current/power, capacity, cycles, eight cells, two temperature probes, differences, BMS protection, BLE connection and collection health. Ranges/colors are editable display settings, not BMS limits or control actions. Gauge values summarize the selected dashboard time range. Check connection and age to assess freshness.

Provisioning uses `$setOnInsert` and never overwrites an existing dashboard. If the default battery dashboard is deleted while BLE stays enabled, it is recreated at the next backend startup. Rename and edit it normally to preserve your layout.

## Validation and rollback

Run `python3 -m unittest discover -s telegraf/battery -v`. The captured cell packet, checksum, every fragment split, incomplete packets, signed values, temperature units, timeout, disconnect, command whitelist and health freshness are covered. `collector.py --samples 3` is an isolated validation mode and exits after three complete cycles, or on the first communication failure.

To stop BLE collection, set `BATTERY_BLE_ENABLED=false` and recreate only Telegraf. To restore the former image entirely, use the previous Compose/Telegraf configuration and `telegraf:1.40.3`. Stored measurements and other dashboards are unaffected. No bucket or retention changes are made.

Protocol reference: https://www.jbd-bms.com/pages/download (BMS UART protocol). Linux transport: https://bleak.readthedocs.io/en/stable/backends/linux.html .
