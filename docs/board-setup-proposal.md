# Board setup proposal

Status: initial design, 2026-11-08. User requested replacing unused Boards MDD with board calibration, probe settings and future peristaltic/PWM configuration. This document does not enable hardware operations. Firmware design request queued to Claude in bridge message 15; no reply at drafting time.

## Current evidence

- /mdd is a Coming soon placeholder: frontend/src/components/mdd/MDDConfiguration.vue, its view and router; no existing functional MDD controls are removed by this proposal.
- Sensor libraries contain internal ADC calibration and CN0411 cell constant, solution temperature coefficient and TDS factor. These do not establish a supported remote user configuration or probe calibration protocol.
- Existing DRV8243Controller interface operates outputs ON/OFF. Driver status is shared by pairs; it does not measure current or water flow. Existing CN0411 PWM/LEDC use must be considered before assigning pump PWM resources. Per-output PWM feasibility remains for firmware/hardware review, not assumed from the presence of a PWM feature elsewhere.

## Product structure

Use Board setup in the sidebar, retain global Configuration for application appearance/language, and keep Devices for discovery/status/manual outputs/OTA. Route /board-setup; old /mdd redirects to it to preserve bookmarks. Selection is by immutable hostname with a link from Device information. English default, pt-BR/es translations, existing colors/font/layout and SPA sidebar.

Tabs: Sensors, Calibration, Pump channels, History. Only approved boards may be configured. Admin-only page/actions initially; User cannot modify parameters or run calibration/dosing operations. Backend must enforce authorization independently of navigation.

### Sensors

Report actual installed sensor/probe capabilities, channel, model, units and current applied configuration. No fabricated pH/EC/SHT35 controls on the sensor-free 1C1250. An absent sensor differs from disconnected/stale readings. Probe profile contains user label/model and only firmware-supported numeric parameters with documented units/bounds. Hardware/firmware validates supported temperature-probe types before offering a selector. Do not infer probe type from board model alone.

Potential CN0411 settings: cell constant, temperature compensation reference/coefficient/source, TDS factor and supported NTC profile. pH settings: probe identity and supported temperature source, calibration reference points and resulting coefficients. Distinguish internal ADC calibration, factory electronics calibration and replaceable probe calibration. Hide low-level register settings in normal operation; expose an advanced area only if specifically required.

### Calibration

Guided states: preparation -> choose reference(s) and temperature -> stable raw reading capture -> review coefficients/quality -> explicit apply -> device ACK/readback -> complete. The number/method of pH/EC points and acceptance limits must be agreed with firmware and actual probe/reference solution specifications; do not hard-code assumed crop limits or generic stability tolerances.

Read raw/live firmware observations and timestamps rather than averaged dashboard samples. Keep previous applied calibration until the new one has been validated and atomically saved. Mark calibration readings with quality/session context so dashboards/alerts do not misrepresent reference solutions as normal cultivation. Explain any monitoring pause; never silently disable safety checks.

Record board, sensor/probe identity, operator, reference values/units/temperature, sample quality, coefficients, schema/firmware/config revisions, timestamp and result. Support cancel/retry and prior-record view. Restore sensor defaults is scoped to that sensor, with preview and confirmation; it must not erase factory identity, certificates, OTA keys, Wi-Fi or schedules. No global factory reset on this page initially.

### Pump channels (future)

First expose existing channel identity and capability information; no new actuation in the first UI stage. ON/OFF is the only verified current interface. PWM controls require a confirmed hardware/firmware capability per channel, allowed frequency/duty limits, shared-driver constraints, output mode and resource allocation with CN0411. Do not show an operational PWM slider just because a future board could support it.

Peristaltic flow calibration later uses user-measured volume/time per pump, duty, fluid/tubing context and date; distinguish estimated dose from measured delivery. Requires a dedicated explicitly confirmed test, run-time/volume limits, stop behavior and interaction with scheduled pulses. No automatic pH/EC dosing is included in the initial scope.

### History

Show requested, applied, failed, cancelled and unknown states and who performed the change. Saved in server is not equivalent to applied on device. Read-back revision and persistent board configuration make offline operation possible.

## Server/firmware contract to agree

- Board-reported versioned capabilities and settings, supported units/ranges, selected probe profile, raw observations and quality/age.
- Session-authenticated fixed routes scoped to an approved hostname, admin-only mutations, bounded validated payloads; never client-chosen database/collection.
- Browser calls backend; backend communicates over the existing authenticated MQTT path. Topic/ACL additions reviewed separately; existing pump schedule topics and payloads unchanged.
- Separate desired settings and reported/applied settings, with revision conflicts, unique request/session IDs, timeout, explicit negative ACK and readback after persistence/reboot.
- QoS retries need device idempotency. Reconnection must not replay an executable calibration, motor test or dosing command. Do not retain such executable commands. Decide retained declarative state separately once firmware semantics exist.
- Never report success only because MQTT accepted publication. Offline or timeout must remain pending/unknown/failed as appropriate, not applied.
- Persist server history in MongoDB; settings/calibration needed for offline calculations are atomically persisted on board. Disconnected/superseded/removed boards cannot receive new configuration.

## Proposed files before implementation

Frontend: new frontend/src/views/BoardSetup.vue; frontend/src/components/board-setup/{BoardSetup,SensorsTab,CalibrationWizard,PumpChannelsTab,SetupHistory}.vue; frontend/src/services/boardSetupService.js; frontend/src/locales/boardSetup.js. Update NavigationDrawer.vue, router/index.js, replace mdd.routes.js with board-setup.routes.js and legacy redirect. Reuse existing language, session and board inventory services. Remove unused MDD placeholder only when replacement is ready.

Backend: new backend/src/routes/board-setup-routes.ts plus backend/src/boardSetup/{types,validation,store,service,mqtt}.ts; register with existing routes and approved-board identity checks. Proposed separate MongoDB settings/history records, not the current pump schedules collection. Existing MQTT registry remains source of board admission. No secrets in history or browser responses.

Firmware (Claude review): capability report, validated versioned sensor configuration/calibration operations and persistence; task/ADC locking; live/raw samples, explicit apply/ACK/readback and idempotency. No firmware change is authorized by a queued design request alone.

## Delivery stages

1. Agree contract/capabilities with Claude; create a reviewable page preview with readonly capabilities and clearly disabled unsupported actions. Do not relabel current calibration as operational.
2. Implement admin settings + readback end-to-end for one supported parameter without changing measurement semantics accidentally; test persistence/offline/rejection/revision behavior.
3. Implement guided calibration with real reference solutions and user-present hardware validation. Migrate existing coefficients safely.
4. Implement peristaltic/PWM configuration after hardware feasibility and explicit tests; automatic dosing is separate future work.

No .env secret, Mosquitto change, container restart, OTA, pump command or calibration was performed for this design stage.