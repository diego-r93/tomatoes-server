# Dashboards

Dashboard definitions are stored in the `dashboards` collection in the existing MongoDB database. Measurements stay in InfluxDB; Telegraf collection and retention settings are unchanged.

## Saving and restoring

Open **Dashboards** to create separate dashboards for the Raspberry Pi, ESP32 boards or growing areas. Changes to panels, layout and settings are drafts until **Save dashboard** succeeds. Failed saves keep the draft. MongoDB revisions reject stale writes from another browser tab; export the draft before reloading after a conflict.

**Export charts** downloads a JSON array with the original chart structure: `id`, `data`, `options`, `layout`, `query`, plus any additional saved chart properties. `data` is empty because measurements belong to InfluxDB. Flux and uPlot options are preserved. Dashboard metadata (name, folder, tags, refresh defaults) is stored in MongoDB and is not part of this legacy export format.

**Import charts** creates a new dashboard from that array. It never replaces an existing dashboard. Export an unsaved draft to keep panel changes during recovery. The obsolete `tomatoesDashboard` browser cache is removed automatically when the dashboard page opens. MongoDB remains the source of saved dashboards.

Back up MongoDB for a complete backup of dashboards, metadata and boards. Exporting charts alone does not back up measurements or all dashboard metadata.

## Initial migration

The old `backend/src/database/dashboard/config/charts.json` is imported into the deterministic `existing-charts` dashboard at backend startup when the file exists. Migration validates and compares every chart after writing. Restarting does not recreate or overwrite an existing dashboard. Migration errors stop backend startup instead of discarding configuration.

An explicit migration script is also available: from `backend`, run `node scripts/migrate-dashboards.cjs` with the backend environment and MongoDB connectivity. The script retains the source file. Verify the downloaded export against the original JSON, archive the source outside the repository, and only then remove it. Once removed, a fresh installation starts with an empty dashboard library.

Compiled deployments should migrate before removing the source, or pass the original source file to `migrateCharts`. JSON configuration is no longer used for normal reads or writes. The legacy GET `/dashboards` reads `existing-charts` from MongoDB; the legacy POST `/dashboards/saveCharts` returns 409 rather than bypassing revision protection.

## Panels and live data

The renderer still uses uPlot. **View** opens a full-screen panel; **Edit** opens a local draft editor; **Remove** requires confirmation. Removing a panel never deletes measurements. Deleting an entire dashboard also requires confirmation and a matching revision.

The query editor has Builder, Flux, Processing and Data preview tabs. Builder reads live schema from InfluxDB (last 30 days, up to 300 entries per request). It generates Flux only when requested; opening Builder never rewrites an existing query. Add tag filters to distinguish hosts, topics or disks. Numeric text requires an explicit float conversion before aggregation. Invalid numeric text causes a query error rather than silently becoming zero.

The supported Flux macros are `v.timeRangeStart`, `v.timeRangeStop`, and `v.windowPeriod`. They are resolved on a temporary copy for each request. Queries with literal ranges keep those ranges. Processing applies multiplier, offset and optional clamps after querying; formatting and gap connection do not rewrite measurements. Separate tagged series are aligned by timestamp. Limit queries to 30 series using tag filters.

Auto refresh supports Off, 2s, 5s, 10s, 30s, 1m, 5m, 15m, 30m, 1h, 2h and 6h. Dashboard settings control the defaults and available intervals. Refresh does not overlap requests, pauses during editing dialogs, optionally pauses in hidden browser tabs, and stops on navigation. Returning no samples displays an empty state; failures are shown per panel. At most three panel queries run at once.

Management endpoints under `/dashboards` require a valid web session. Existing device and board endpoints are unchanged. No new permissions system is introduced in this change.

## Checks

- Backend: `node --test -r ts-node/register tests/dashboard.test.cjs tests/dashboard-api.test.cjs`
- Frontend helpers: `node --test tests/dashboard.test.mjs`
- Frontend: `yarn build` and lint the changed components.

The browser integration check used a simulated API to exercise save failure/retry, reload, exact JSON export, processing, removal/discard, refresh, route guards and responsive layouts without sending device commands.

## Verified migration on the Raspberry Pi

On November 2, 2026, all eight original charts were migrated to `existing-charts`. The authenticated API export was compared with the complete original JSON before deleting the active file. The original is archived at `/home/diego/tomatoes-server-backups/dashboards-20261102/charts-original.json`; the source backup is `source-before.tgz` in the same directory.

Live checks verified eight rendered uPlot panels, responsive layout, full-screen view, schema discovery and InfluxDB samples. A temporary dashboard verified MongoDB save/read/export, stale revision rejection and deletion, then was removed. The original eight definitions were compared again afterwards and remained identical.

## Dashboard organization and inspection

The dashboard library includes All dashboards and Starred tabs, matching-dashboard counts, and Dashboard, Folder, Panels and Updated columns. Panel counts come from MongoDB definitions. The list reflows on narrow screens.

Panel headers highlight on hover or keyboard focus. The chart cursor opens a tooltip with timestamp, series label/tags, formatted value and unit. Missing samples display a dash; tooltips remain inside the panel.

The original dashboard ID remains `existing-charts` so bookmarks keep working, but its name is now Raspberry Pi. It contains nine server panels: CPU temperature, CPU user usage, memory used, storage used, swap used, GPU temperature, CPU clock in MHz, memory percentage and one-minute system load.

ESP32 Boards contains nine panels for `esp32s3-07945C`: the existing pH, conductivity and NTC panels, plus SHT35 air temperature and humidity, compensated conductivity, TDS, sensor internal temperature and sensor supply voltage. New queries were checked against finite recent samples. The CN0326 external temperature feed returned infinity and was excluded. TDS is shown without an assumed unit because its MQTT payload does not specify one.

The reorganization preserved all eight original queries and current user layouts, with positions repacked for the separate dashboards. Definitions before and after the change are backed up in `/home/diego/tomatoes-server-backups/dashboard-organized-20261102/`. This is a migration of this installation, not a new automatic seeder or a source of simulated telemetry.


## Stat panels and dashboard languages (2026-11-08)

Choose **Stat** in the panel editor's Visualization selector. It shares the existing Flux query, dashboard range, transformations, refresh and inspector. Select Last non-null, Mean, Minimum or Maximum and a returned series; configure unit, decimal places, base color and ordered thresholds. Optional sparkline paths preserve peaks with a bounded envelope and break at missing samples. Stat does not clamp the displayed value to Gauge scale limits.

The sample timestamp is the newest valid numeric sample returned by the query, including for aggregate reducers. It is not the request time. An editable age threshold (default 120 seconds) marks old samples; historical ranges and query aggregation may therefore legitimately show old data. Missing numeric data displays **No data**, never zero. Future sample clocks have an explicit warning. Byte scales keep their existing MB/GB divisor; thresholds use the displayed unit.

Stat settings are validated on the frontend and backend and persist with the existing chart JSON. Exports keep definitions and exclude live samples; Inspector retains CSV, Excel and JSON exports. Existing time-series and Gauge definitions stay valid. No dashboard is seeded or overwritten by this addition.

Dashboard library, settings, toolbar, panel editor, inspector and time picker now use the same reactive English/Portuguese/Spanish language preference as Devices and Configuration. English remains the default for browsers without a saved preference. User-provided titles, folders, series, identifiers and Flux text are preserved; translated option labels keep canonical saved values.


## Installation overview migration (2026-11-08)

The explicit `backend/scripts/apply-dashboard-overviews.cjs` migration validates queries against recent InfluxDB samples before writing. Run a dry plan with `docker compose exec -T backend node /backend/scripts/apply-dashboard-overviews.cjs`, then add `--apply` to apply an authorized plan. It is not a startup hook and does not overwrite dashboard edits on restart. Repeated application recognizes overview IDs and existing rule names. It creates a private JSON backup in the container's `/tmp`; copy that file to an installation backup directory before recreating the container. MongoDB updates use revision checks, with rollback of the dashboard batch on conflict. Alert additions are idempotent and can be resumed if interrupted.

Raspberry Pi now has 4 Stats, 3 percentage Gauges and its 9 historical panels. Hydroponics has 4 Stats, 3 Gauges, 3 live board/driver Stats and its 10 historical panels. Battery now has voltage/current/calculated-power/age Stats, charge/temperature/capacity Gauges, mapped Bluetooth/BMS states, cell difference and the existing historical/detail panels (21 total).

Overview sensor queries use `last()` to retain the actual latest sample timestamp and avoid displaying the last average as the latest measurement. Their sparklines are disabled because those queries return one sample. Original historical queries remain. Gauge bounds for pH, humidity and temperature are display scales, not configured crop safety limits. No arbitrary crop thresholds were activated.

`POST /dashboards/live` requires the existing web session. Members can read sources from saved dashboard/panel IDs; only administrators can preview a draft source. Sources are validated connection/driver observations for approved boards. No caller chooses a database or collection. The route returns numeric rows for the existing renderer; no telemetry, schedules or outputs are written. Live panels explicitly ignore the dashboard time range. Driver state is the **last pulse result**, not the present output state and not proof of water flow.

Definitions before this installation change are backed up in `/home/diego/tomatoes-server-backups/dashboard-overviews-20261108/`. Sensor samples remain in InfluxDB.

### Sensor-free pump controller

The explicit script backend/scripts/create-pump-controller-dashboard.cjs creates Pump controller — esp32s3-1C1250 in ESP32 boards. Run inside the backend container without arguments for a validated dry run, then with --apply. It inserts only a missing stable dashboard ID and never replaces user edits or other dashboards. No restart is needed.

Its 16 panels show connection, uptime, free heap/PSRAM, MQTT disconnects, driver SPI errors, all four latest driver outcomes, both CPU gauges and CPU/memory/MQTT/driver history. Queries use existing mqtt_consumer diagnostics converted to float. Diagnostics can be absent in non-debug firmware; counters reset at boot. Live driver cards show the most recent pulse with its timestamp, independent of the chart time range; they do not indicate that an output is ON now or prove water flow. The pump supply was connected temporarily for testing and will stay disconnected until greenhouse installation. New board alerts remain paused.

Validated on 2026-11-08: all 11 Influx panel queries returned finite samples, five live Stats loaded in the browser, 30-second refresh selected, second script run preserved the dashboard. No MQTT output command, OTA, alert change or container restart was performed.

### Bench diagnostics and stable Devices feedback

The explicit script backend/scripts/add-bench-diagnostics.cjs appends 14 diagnostic panels to the existing Hydroponics — esp32s3-07945C dashboard (20 to 34), preserving every original definition. It validates all queries against recent actual Influx samples before writing, saves a mode-0600 full backup, guards the MongoDB revision and does not duplicate existing diagnostic IDs. Backups are retained outside git in /home/diego/tomatoes-server-backups/bench-diagnostics-20261108/.

Panels cover uptime, heap/PSRAM, MQTT disconnect/drop counters, driver SPI errors, CPU 0/1 Gauges, CPU peaks, heap history, CPU other tasks and per-task CPU. Debug telemetry is required; per-task data is emitted only for reported active tasks and absence is not zero. Counters reset at boot. No startup migration, pump command or OTA is involved.

DeviceCardList.vue now shows command feedback in a bottom-start snackbar (8 seconds, dismissible) outside document flow. The refresh progress slot has a fixed height; driver warnings are below the control panel. This prevents these notices from shifting manual-output controls. The confirmation flow and reported-state-only switches are unchanged.