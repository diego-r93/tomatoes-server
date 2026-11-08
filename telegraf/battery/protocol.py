"""Read-only JBD 0x03/0x04 protocol. No BMS write commands are implemented."""
from dataclasses import dataclass
import math

READ_COMMANDS = {3: bytes.fromhex("DDA50300FFFD77"), 4: bytes.fromhex("DDA50400FFFC77")}

class ProtocolError(ValueError):
    pass

@dataclass(frozen=True)
class Frame:
    command: int
    status: int
    payload: bytes

class FrameParser:
    def __init__(self):
        self.buffer = bytearray()
        self.errors = 0

    def clear(self):
        self.buffer.clear()

    def feed(self, fragment):
        self.buffer.extend(fragment)
        frames = []
        while self.buffer:
            start = self.buffer.find(0xDD)
            if start < 0:
                self.buffer.clear()
                break
            if start:
                del self.buffer[:start]
            if len(self.buffer) < 4:
                break
            if self.buffer[1] not in READ_COMMANDS:
                self.errors += 1
                del self.buffer[0]
                continue
            length = self.buffer[3] + 7
            if len(self.buffer) < length:
                break
            packet = bytes(self.buffer[:length])
            checksum = (-sum(packet[2:-3])) & 0xFFFF
            if packet[-1] != 0x77 or int.from_bytes(packet[-3:-1], "big") != checksum:
                self.errors += 1
                del self.buffer[0]
                continue
            frames.append(Frame(packet[1], packet[2], packet[4:-3]))
            del self.buffer[:length]
        return frames

def read_command(code):
    try:
        return READ_COMMANDS[code]
    except KeyError as issue:
        raise ProtocolError("Only read commands 0x03 and 0x04 are allowed") from issue

def decode_general(frame, expected_cells=8):
    if frame.command != 3 or frame.status or len(frame.payload) < 23:
        raise ProtocolError("Invalid general information response")
    p = frame.payload
    cell_count, probe_count = p[21], p[22]
    if cell_count != expected_cells or probe_count > 16 or len(p) < 23 + probe_count * 2:
        raise ProtocolError("Unexpected cell count or incomplete temperature data")
    word = lambda at: int.from_bytes(p[at:at+2], "big")
    # Newer JBD variants flag a 0.1 A/Ah unit in FET bit 7.
    factor = 0.1 if p[20] & 0x80 else 0.01
    voltage = word(0) / 100
    current = int.from_bytes(p[2:4], "big", signed=True) * factor
    if not 0 < voltage <= expected_cells * 6 or p[19] > 100:
        raise ProtocolError("Invalid voltage or state of charge")
    temperatures = [(word(23 + i * 2) - 2731) / 10 for i in range(probe_count)]
    if any(not -100 <= value <= 200 for value in temperatures):
        raise ProtocolError("Invalid temperature probe reading")
    fields = {
        "voltage": voltage, "current": round(current, 2), "soc": float(p[19]),
        "remaining_capacity_ah": round(word(4) * factor, 2),
        "nominal_capacity_ah": round(word(6) * factor, 2), "cycles": word(8),
        "charge_enabled": int(bool(p[20] & 1)), "discharge_enabled": int(bool(p[20] & 2)),
        "protection_flags": word(16), "balance_flags": word(12) | (word(14) << 16),
        "cell_count": cell_count, "temperature_count": probe_count,
    }
    protections = ["cell_overvoltage", "cell_undervoltage", "pack_overvoltage", "pack_undervoltage", "charge_overtemperature", "charge_undertemperature", "discharge_overtemperature", "discharge_undertemperature", "charge_overcurrent", "discharge_overcurrent", "short_circuit", "frontend_ic_error", "software_mos_lock", "charge_mos_failure", "discharge_mos_failure"]
    fields.update({"protection_" + name: int(bool(fields["protection_flags"] & (1 << bit))) for bit, name in enumerate(protections)})
    # Optional V12 tail: humidity, then alarm flags. Older boards omit it.
    end = 23 + probe_count * 2
    if len(p) >= end + 3:
        fields["alarm_flags"] = word(end + 1)
    return fields, temperatures

def decode_cells(frame, expected_cells=8):
    if frame.command != 4 or frame.status or len(frame.payload) != expected_cells * 2:
        raise ProtocolError("Invalid cell voltage response")
    cells = [int.from_bytes(frame.payload[i:i+2], "big") / 1000 for i in range(0, len(frame.payload), 2)]
    if any(not 0 < value <= 6 for value in cells):
        raise ProtocolError("Invalid cell voltage")
    return cells

def calculated(general, cells):
    low, high = min(cells), max(cells)
    current = general["current"]
    return {
        "power_w": general["voltage"] * current,
        "remaining_energy_estimated_wh": general["voltage"] * general["remaining_capacity_ah"],
        "cell_min_v": low, "cell_max_v": high, "cell_mean_v": sum(cells) / len(cells),
        "cell_sum_v": sum(cells), "cell_delta_mv": round((high - low) * 1000, 3),
        "cell_min_index": cells.index(low) + 1, "cell_max_index": cells.index(high) + 1,
        "charging": int(current > 0), "discharging": int(current < 0),
        "protection_active": int(general["protection_flags"] != 0),
    }

def line_protocol(measurement, tags, fields, timestamp_ns):
    escape = lambda value: str(value).replace("\\", "\\\\").replace(" ", "\\ ").replace(",", "\\,").replace("=", "\\=")
    encoded = []
    for key, value in fields.items():
        if isinstance(value, bool):
            text = "true" if value else "false"
        elif isinstance(value, int):
            text = str(value) + "i"
        elif isinstance(value, float) and math.isfinite(value):
            text = repr(value)
        else:
            continue
        encoded.append(escape(key) + "=" + text)
    if not encoded:
        raise ProtocolError("No valid fields to publish")
    tag_text = "".join("," + escape(key) + "=" + escape(value) for key, value in sorted(tags.items()))
    return measurement + tag_text + " " + ",".join(encoded) + " " + str(timestamp_ns)

def measurement_lines(device, general, temperatures, cells, timestamp_ns):
    tags = {"device": device}
    lines = [line_protocol("battery", tags, general, timestamp_ns), line_protocol("battery_calculated", tags, calculated(general, cells), timestamp_ns)]
    lines += [line_protocol("battery_cell", {**tags, "cell": i+1}, {"voltage": value}, timestamp_ns) for i, value in enumerate(cells)]
    lines += [line_protocol("battery_temperature", {**tags, "probe": i+1}, {"temperature": value}, timestamp_ns) for i, value in enumerate(temperatures)]
    return lines
