# Board setup: preparation stage

2026-11-08. Replaces the unused Boards MDD placeholder with /board-setup, with /mdd redirect. Admin-only navigation and route guard; existing /mqtt/registry enforces server-side Admin authorization. Only approved boards are listed. Existing authenticated discovery is polled every 30 seconds while visible, plus visibility/network recovery. No setup mutation endpoint or calibration command has been added.

Sensors displays chip flags from discovery, never inferring connected/valid probes from ADC presence or model. Missing/offline observations remain unknown. Pump channels shows only reported identity; no output command. History explicitly says calibration history is unavailable, not an empty proven history. The server does not expose a versioned calibration capability/readback protocol yet, so all calibration actions are disabled, irrespective of Online status.

## References available to this user

- Nominal pH 4, 7, 10: no additional pH values will be required. Plan 7 first, then 4/10; a supported two-point method may use 7+4 or 7+10. Record exact label/certificate values, temperature table, manufacturer, lot and expiry before capturing. Do not substitute generic NIST tables or silently rename 4/10 as 4.01/10.01.
- Akso 1413 uS/cm at 25 C: prioritize one-point cell-constant calibration after valid electronics/excitation/temperature. Other temperatures require the standard's certified value/table, not an unmarked generic alpha approximation. A later second standard near the operating range checks performance; it does not independently identify all calibration parameters.
- KCl 3 M: compatible pH electrode storage/filling, not a pH buffer or the EC calibration standard. Follow the electrode manufacturer's requirements.

## Firmware prerequisites identified by Claude (review, not execution)

Validate/fix synchronized CN0411 excitation (E1), distinguish ADC presence from probe validity, retain floating-point pH mV in CN0326_CalculatePH (AD7793 conversion already returns float), establish versioned atomic NVS, validated settings and raw samples, idempotent non-retained operations and ACK/readback. Numeric stability/offset/slope limits proposed in bridge messages remain engineering candidates pending assembled-board validation, not product guarantees.

Current TCC v2.0 requires guided physical setup for electrical calibration: reference resistor paths (20/200 ohm) and system-zero routing, then explicit restoration to normal connections. No pin-level operational instructions are enabled before verifying actual assembled PCB and front-end equations. A dry/open-cell observation is not equivalent to the J2 electrical short/system-zero configuration. Routine solution-based probe calibration is separate from factory electronics calibration.

## Future PCB: remove calibration jumpers

Evaluate electrically selecting probe/reference/system-zero paths with qualified analog switches or reed relays, break-before-make and mutually exclusive paths, deterministic safe startup/recovery and preserved isolation domains. Account for on-resistance, leakage, drift and thermoelectric errors. For the high-impedance pH input, avoid generic muxes/ESP GPIO; consider routing reference tests after the buffer when adequate to test the intended signal chain, or a guarded low-leakage solution. This is an architecture proposal, not a selected BOM or pin assignment. Claude suggested alternative EC reference values for a future PCB; these require range, equation and error-budget review before acceptance. No changes to the current PCB.

Internal electronic self-tests cannot replace physical immersion in pH/EC solutions or prove the electrode's condition. Future hardware automation must not represent such tests as a complete automatic probe calibration.

## Sources

- User-supplied CN0326/CN0411 and TCC v2.0 schematic review: calibration-circuit-review.md.
- https://www.analog.com/en/resources/reference-designs/circuits-from-the-lab/CN0411.html
- https://www.analog.com/en/resources/design-notes/selecting-the-right-cmos-analog-switch.html
- https://loja.akso.com.br/solucao-de-condutividade-1413-uscm-250ml

No calibration, output command, firmware flash, broker/ACL change or backend restart was performed in this stage.

Validation: 49 frontend tests passed; ESLint passed; production image built with Vite 8.3.6 and deployed by recreating nginx only. Browser: both real boards Online, all four bench channels, disabled calibration actions, history-unavailable state, /mdd redirect and 390px one-column layout verified. Unauthenticated HTTPS GET /server/mqtt/registry returned 401. No real calibration or firmware validation performed.

## EC probe label pilot (2026-11-11)

In **Board setup → Sensors**, select an approved board, use **Read board settings**, and save the conductivity probe label. The UI enables this only for recent reports with the setup.v1 capability. The server validates the approved hostname, recent discovery and explicit capability before each exchange. The label accepts 0–32 printable ASCII characters without leading or trailing spaces. An empty label clears it.

The admin HTTP API exposes GET /mqtt/setup/:host and PUT /mqtt/setup/:host/ec-label with the displayed revision and label. The backend reads the current revision before writing, rejects stale writes, and verifies the value and new revision with a separate read. If the acknowledgement is missing, it attempts a read to reconcile the outcome. If the read cannot confirm the change, it tells the operator to read again before saving. The backend does not retry the write automatically. User activity records actor, host, request ID, revision and outcome.

The backend publishes a non-retained QoS 1 request on <host>/setup/req and reads non-retained replies on devices/<host>/setup. A reply must match hostname, operation and request ID. This uses the existing MQTT discovery connection with the dedicated backend identity. The backend identity can publish requests; the approved factory listener grants each board read access to its own request topic and write access to its own reply topic. The pending listener has no setup permissions. The generic publish API rejects setup request topics.

Live Pi validation on esp32s3-07945C read revision 0, verified a temporary name at revision 1, rejected invalid input with 400 and a stale revision with 409, then restored the original label at revision 2. The greenhouse board returned 409 for setup. Unauthenticated access returned 401; isolated API tests also verified 403 for non-admin users. Mosquitto ACL reload and topic isolation passed in a test broker. The live broker kept its start time after SIGHUP. Backend and frontend production builds, ESLint, 67 backend tests and 55 frontend tests passed.

## Reported sensor settings

The pH card displays whether the firmware uses saved calibration or its theoretical Nernst response. The conductivity card displays the cell constant, temperature coefficient in percent per degree Celsius, and TDS factor. All values come from the same board readback used by the label editor and are marked with its revision. Unsupported or unread values are never interpreted as defaults.

Claude flashed the bench and validated ec.params.set, ph.cal.set and ph.cal.clear over serial.

## Conductivity parameter editing

Administrators can edit the cell constant (0.01–10 cm⁻¹), temperature coefficient (0–5 %/°C) and TDS factor (0.40–0.90) after reading a board with setup.v1 and setup.ec-params.v1. The API accepts the coefficient as a fraction per degree Celsius. Supported precision follows board readback (4 decimal places for k, 5 for alpha, 3 for the TDS factor). The API rejects invalid values and stale revisions before publishing a write. The form sends only edited fields. The backend verifies the full EC readback and resulting revision.

The server and frontend are deployed. The portal refused EC writes before the bench reported setup.ec-params.v1. After the capability was added, Claude verified the portal changed k to 1.05 at revision 3 and restored k to 1 at revision 4. The server then confirmed the factory values at revision 4 via a read. The bench also advertises setup.ph-cal.v1. A scoped MQTT bench test changed k from 1 to 1.05 at revision 1 and restored k to 1 at revision 2. Alpha 0.0214 and TDS factor 0.47 were preserved. The live API rejected invalid input (400), unauthenticated access (401) and a greenhouse write (409). Backend and frontend production builds, lint, 68 backend tests and 55 frontend tests passed.

The pH write operations and physical calibration remain pending.

## Next calibration milestone

Verify missing-probe behavior on the assembled bench board. Agree on raw sample capture, stability checks and revisioned coefficient readback with the firmware before testing the pH buffers and Akso 1413 µS/cm solution. Sensor validity comes from reported probe flags. Chip presence alone cannot validate a calibration point.
