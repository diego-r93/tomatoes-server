# Pump driver feedback

Firmware publishes numeric, non-retained messages on `sensors/<hostname>/pump/<NN>/<start|end>/<active|fault|status>`. NN is 01 to 04. Existing sensor topics and raw `mqtt_consumer` records remain unchanged.

Telegraf also stores these events as integer values in the `pump_driver` measurement. Tags are `board`, `pump`, `stage`, `item`, plus the original topic and agent tags. Existing InfluxDB retention applies.

The backend accepts live events only from approved boards. It stores the latest pulse and nine previous pulses per pump in MongoDB collection `pump_driver_state`. On startup it restores that state and replays up to 20,000 real raw events from the previous 24 hours, preserving their arrival times. Older history remains available in InfluxDB according to retention.

Devices shows the latest result, start arrival time, whether an end event arrived, raw registers and five recent pulses. A page-level warning links to affected boards. English is the default; Portuguese and Spanish translations are included. A separate authenticated read-only endpoint `/server/mqtt/pump-driver` refreshes feedback every two seconds while the page is visible. Feedback refreshes never mark an offline board as online or change its output state.

Results prioritize short circuit (fault bit 4) and temperature (bit 2). Active 0 with VMUV (bit 8) means the pump supply is absent. Active 1 without those fault bits confirms the electrical output, not water flow. A shared driver serves two pumps; a chip fault is not proof of which pump caused it. Missing feedback is reported after five seconds from an observed command or enabled schedule. Partial register sets remain pending and become incomplete after five seconds.

`PUMP_SCHEDULE_TIMEZONE` must match the firmware wall-clock timezone. It defaults to America/Sao_Paulo. The observer checks only recently due schedules while the board has responded within 90 seconds; startup does not invent pulses that happened during server downtime. Initial discovery or reconnection alone does not prove a new pulse.

No MQTT ACL changes are required. Production tests must observe scheduled events; do not publish output commands to force a test.

Validation: backend tests cover event parsing, real register vectors, fault priorities, missing/partial feedback, independent pumps, history bounds, restoration and schedule timezone handling. Frontend tests verify diagnostic merging without changing connection freshness or output states.
