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

## Next integration milestone

Claude reported E1 and the floating-point pH fix on firmware local main
(`f9c4cb3`, merge `3e9bb1b`). The bench board `esp32s3-07945C` runs the
pre-commit build with those changes. The second board remains on `16a5c1c`.
With the same solution, Claude measured 267.9 and 268.1 uS/cm in the three
minutes before and after the change. The comparison supports continuity of
the previous EC readings under that setup. Absolute accuracy still needs
verification against the Akso 1413 uS/cm standard. Auto-ranging and the
assumed 7-ohm front-end offset remain separate issues.

The first proposed setting is an **EC probe label**. It identifies the probe
for the operator and leaves the calculation path untouched. The setting is
offered only when firmware explicitly advertises support. Probe validity
is a separate observation and is required for capturing calibration points.

- Proposed label format for this pilot is 0 to 32 printable ASCII characters.
  An empty value clears the label. Reject invalid characters, leading or
  trailing spaces, and oversized values with an explicit reason.
- A write carries a unique request ID and the expected current configuration
  revision. Firmware checks the revision and persists the label, incremented
  revision, and last applied request ID as one record. Retry of the same
  request and payload returns the recorded result. Reusing an ID with a
  different payload is rejected.
- An authenticated read returns the capability, stored label and revision.
  After a successful write acknowledgement, the server verifies a separate
  readback. Report the change as applied only once it sees the matching
  revision and value. An acknowledgement loss leaves an unknown outcome
  until readback reconciles it.
- Server access is restricted to administrators and approved boards. Audit
  actor, board, request ID, revisions and outcome. Executable commands are
  non-retained. MQTT topic ownership, expiry and reconnect behavior must be
  agreed with firmware before integration.
- Bench acceptance covers saving and clearing, readback after reboot,
  duplicate delivery, stale revision, invalid input, failed persistence,
  loss of reply, and a board without the capability. Compare the reported
  label and revision with the expected state in each case.

This proposal is under review in bridge message 29. Wire format and
implementation await firmware alignment. The operational calibration
milestone still requires validated probe checks and raw samples, persistent
coefficients, and user-present trials with the reference solutions.
