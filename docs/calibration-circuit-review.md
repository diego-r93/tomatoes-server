# Calibration requirements from circuit notes and TCC v2.0

Design review, 2026-11-08. Sources supplied by the user: Analog Devices CN-0326 Rev. 0 (7 pages), CN-0411 Rev. 0 (12 pages), TCC-v2.0 schematic (8 sheets). Relevant figures/equations and schematic sheets 6-8 were visually reviewed in addition to text extraction. These are design requirements, not a completed bench validation or an operational calibration protocol. Original PDFs are not copied into this repository.

## Separate three layers

1. Factory electronics characterization: ADC internal/system calibration, actual precision resistor values and front-end offset/gain. Scoped to hardware revision/channel; maintenance workflow rather than routine crop operation.
2. Replaceable probe calibration: serial/model, reference solutions, their certified temperature-dependent values, measured points and fitted coefficients. Scoped to probe identity; retain history when a probe is replaced.
3. Operating profile: temperature source, cell constant, compensation model, reference temperature, TDS factor and supported acquisition settings. Explicit units, bounds and reported applied revision.

A shorted calibration input is a deliberate maintenance setup, not a sensor missing/normal cultivation reading. Do not call internal ADC self-calibration a complete probe calibration.

## pH channel: CN0326 -> actual TCC sheet6

CN0326 page 4 / Figures 3-4 describes estimating IOUT2 from the voltage across a5 kOhm 0.1% resistor and using it for RTD resistance, separately from calibration with at least two buffer solutions. Neutral buffer nominal pH 7 corrects offset; acid/basic reference selection follows intended measurement range, with a three-point option. The provided evaluation software uses temperature-dependent buffer tables and interpolation.

TCC sheet 6 has U15AD7793,U16AD8603,R37=5 kOhm 0.1%,J12two-wire temperature connector and J13/J17electrode connector alternatives on the same channel. They are not two independent pH sensors. Default firmware CN0326.h has RMIN=1000 and TEMP_COEFF=0.00385055; CN0326.cpp reads the reference resistor for current calibration and uses fixed PH_ISO/TOLERANCE rather than a remotely managed stored multipoint calibration.

UI requirements:
- Probe identity/model and temperature source clearly tied to this pH channel; supported RTD profile defaults to actual PT1000 configuration, not the EC temperature profile.
- Live electrode voltage with documented units, RTD resistance/temperature, raw ADC/reference validity, sample age and stability; AD7793 internal die temperature and AVDD remain diagnostics, never silently substitute them for liquid temperature.
- Guided clean/rinse/reference/capture/review/apply flow; actual certified buffer value at measured temperature, with buffer profile/table and reference temperature recorded. Do not treat roundedpH 4/7/10 labels as universal exact values at every temperature.
- Display measured offset and slope/quality and old/new settings; fitting method and acceptance limits agreed with firmware. Three-point fitting must define how acid/base slopes are used; not simply average incompatible coefficients.
- Distinguish electrode response temperature compensation from a claim that the solution's actualpH has been converted to25C.
- Schematics show the electrode reference tied to the RTD/reference-resistor junction: verify missing/open temperature-probe behavior and its effect on bias before allowing operation without the RTD. A software manual-temperature field cannot be assumed to replace that electrical path.

## EC/TDS channel: CN0411 -> actual TCC sheets7-8

CN0411 pages 5-8 distinguish electrical calibration from probe cell constant and solution parameters. Equations10-12 define ECref=EC/[1+alpha*(T-Tref)] and TDS=ke*ECref. Alpha storage must be fraction/C if used directly in that denominator; an interface showingpercent/C converts once. Current firmware KCl=0.0188 / NaCl=0.0214 constants match a 1.88/2.14 percent/C display convention. TDS factor depends on solution composition; it is not a directmeasurement of individual nutrient concentrations.

CN0411 page 8/Figure13 uses a20 or 200 Ohm precision reference to estimate electrical offset; system zero-scale needs a physical shorting setup. Original evaluation header names P5/P6 do not apply to TCC.

Actual TCC differences:
- Sheet7 uses TMUX1208 gain selection, TMUX1136 switching and INA826 front-end; do not copy original ADG1608/ADG884/AD8220 on-resistance/gain error assumptions unchanged.
- R19=20 Ohm, R20=200 Ohm withJ4reference/probe routing; J2is the inputshort selector. Confirm exact jumper positions/installed state before exposing either electrical procedure. No remote operation can move these jumpers.
- Sheet8 uses U1AD7124-8 and J1withR1=10 kOhm 0.05% temperaturedivider. Current CN0411_read_temp computes NTC resistance and Steinhart-Hart temperature with fixed coefficients; this is NOT the reference design's Pt100/Pt1000 current-driven RTD path.
- EC rails/ground are common with board3.3V/GND in the supplied schematic; the ISO netname alone must not be interpreted as galvanic isolation. This review does not certify assembled-board isolation or simultaneous immersed-probe behavior.

UI requirements:
- Cell constantK withcm^-1, probe model, supported range and reference-standard metadata. Candidate standard-assistedKadjustment must be validated separately from electronicsRoffset calibration.
- EC raw, temperature and EC referenced to statedTref separately visible; EC and TDS units explicitly scaled once (S/cm,mS/cm,uS/cm;mg/L).
- Solution preset/custom alpha and TDSfactor with provenance; no universal nutrient-specific factor implied.
- EC temperature profile is NTC for current firmware: identify real part/R25and supported coefficient model before changing it. Do not offerPt100/Pt1000 as interchangeable softwarechoices without verified hardware/firmware support.
- Excitation amplitude/frequency and gain/ranging remain hardware-profile advanced settings, with probe ratings and firmwarevalidatedlimits. The note's 94 Hz/2.4 kHz choices and DACrange are not automatically approved settings for every probe.
- Factory electrical procedures require explicit maintenance mode, physical-setup checklist and recovery to operating setup. Keep current coefficients until a validated, persisted replacement is acknowledged.

## Firmware contract and validation before enabling writes

Claude received bridge message 18 with this review. Align live/raw channel data, units, calibration schema/revision, device capabilities, atomic persistence, ACK/readback and rollback semantics with board-setup-proposal.md. Preserve existing telemetry topics, pump schedules and factory identities. Frontend validation never replaces board-side checks.

Required tests: known coefficient/vector calculations at multiple temperatures; percent/fraction and S/uS/mS conversions; buffer temperature table interpolation; open/short/invalidtemperature and zero/near-zero denominators; per-gainoffset behavior on actual front-end; outlier/unstable sampling, stale data, failure/cancellation,duplicate request and reboot persistence. Reference solutions/resistors are needed for actual hardware validation. Do not silently save invalid thermistor logarithms or nonfinite coefficients.

This pass did not change any board configuration, library, MQTTACL, sensor output,firmware or running service. Pump PWM is separate from the existing EC excitationPWM and still requires hardware/firmware capability review.