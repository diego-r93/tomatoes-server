"""Persistent BLE reader for Telegraf execd. stdout is Influx line protocol only."""
import argparse
import asyncio
from dataclasses import dataclass
import logging
import os
import re
import signal
import sys
import time

from protocol import FrameParser, ProtocolError, decode_general, decode_cells, read_command, measurement_lines, line_protocol

LOG = logging.getLogger("battery")
NOTIFY = "0000ff01-0000-1000-8000-00805f9b34fb"
WRITE = "0000ff02-0000-1000-8000-00805f9b34fb"

@dataclass(frozen=True)
class Settings:
    enabled: bool = False
    name: str = "SP14S004L14S50A"
    address: str = ""
    device: str = "mega_energy"
    adapter: str = "hci0"
    cells: int = 8
    interval: float = 10
    timeout: float = 8
    scan_timeout: float = 15

    @classmethod
    def from_env(cls):
        enabled = os.getenv("BATTERY_BLE_ENABLED", "false").lower()
        if enabled not in ("true", "false"):
            raise ValueError("BATTERY_BLE_ENABLED must be true or false")
        value = cls(enabled=enabled == "true", name=os.getenv("BATTERY_BLE_NAME", cls.name),
                    address=os.getenv("BATTERY_BLE_ADDRESS", ""), device=os.getenv("BATTERY_DEVICE_ID", cls.device),
                    adapter=os.getenv("BATTERY_BLE_ADAPTER", cls.adapter), cells=int(os.getenv("BATTERY_EXPECTED_CELLS", "8")),
                    interval=float(os.getenv("BATTERY_INTERVAL_SECONDS", "10")), timeout=float(os.getenv("BATTERY_RESPONSE_TIMEOUT_SECONDS", "8")),
                    scan_timeout=float(os.getenv("BATTERY_SCAN_TIMEOUT_SECONDS", "15")))
        if not re.fullmatch(r"[a-zA-Z0-9_-]{1,64}", value.device) or not re.fullmatch(r"hci[0-9]+", value.adapter):
            raise ValueError("Invalid battery device ID or Bluetooth adapter")
        if value.address and not re.fullmatch(r"(?:[0-9a-fA-F]{2}:){5}[0-9a-fA-F]{2}", value.address):
            raise ValueError("Invalid battery Bluetooth address")
        if not value.name or not 1 <= value.cells <= 32 or not 2 <= value.interval <= 3600 or not 1 <= value.timeout <= 60 or not 3 <= value.scan_timeout <= 120:
            raise ValueError("Invalid battery name, cell count or polling times")
        return value

class Reader:
    def __init__(self, settings, output=print):
        self.settings = settings
        self.output = output
        self.parser = FrameParser()
        self.pending = None
        self.expected = None
        self.connected = False
        self.connections = 0
        self.errors = 0
        self.last_valid = None
        self.parser_errors = 0
        self.last_write = 0.0

    def notify(self, _characteristic, fragment):
        for frame in self.parser.feed(fragment):
            if frame.command == self.expected and self.pending and not self.pending.done():
                if frame.status:
                    self.pending.set_exception(ProtocolError("BMS refused the read request"))
                else:
                    self.pending.set_result(frame)
        self.parser_errors = self.parser.errors

    def disconnected(self, _client):
        self.connected = False
        if self.pending and not self.pending.done():
            self.pending.set_exception(ConnectionError("Battery disconnected during a read"))

    async def request(self, client, code):
        command = read_command(code)  # Whitelist before any BLE write.
        await asyncio.sleep(max(0.0, self.last_write + 0.25 - time.monotonic()))
        self.parser.clear()
        self.expected = code
        self.pending = asyncio.get_running_loop().create_future()
        try:
            self.last_write = time.monotonic()
            await asyncio.wait_for(client.write_gatt_char(WRITE, command, response=False), self.settings.timeout)
            return await asyncio.wait_for(self.pending, self.settings.timeout)
        finally:
            if self.pending and not self.pending.done():
                self.pending.cancel()
            if self.pending and self.pending.done() and not self.pending.cancelled():
                self.pending.exception()
            self.pending = None
            self.expected = None
            self.parser.clear()

    def health(self):
        now = time.time()
        fields = {"enabled": int(self.settings.enabled), "connection_up": int(self.connected),
                  "errors": self.errors + self.parser_errors, "reconnections": max(0, self.connections - 1),
                  "has_valid_reading": int(self.last_valid is not None)}
        if self.last_valid is not None:
            fields.update(last_valid_unix=self.last_valid, reading_age_seconds=max(0.0, now - self.last_valid))
        self.output(line_protocol("battery_collector", {"device": self.settings.device}, fields, time.time_ns()), flush=True)

    async def health_loop(self):
        while True:
            self.health()
            await asyncio.sleep(10)

    async def run(self, samples=0):
        if not self.settings.enabled:
            LOG.info("Battery BLE collection is disabled")
            self.health()
            while True:
                await asyncio.sleep(3600)
        from bleak import BleakClient, BleakScanner
        completed, backoff = 0, 1
        health_task = asyncio.create_task(self.health_loop())
        try:
            while True:
                try:
                    def matches(device, advertisement):
                        if self.settings.address:
                            return device.address.lower() == self.settings.address.lower()
                        return (advertisement.local_name or device.name) == self.settings.name
                    device = await BleakScanner.find_device_by_filter(matches, timeout=self.settings.scan_timeout, adapter=self.settings.adapter)
                    if device is None:
                        raise ConnectionError("Battery not found during BLE scan")
                    async with BleakClient(device, timeout=20, disconnected_callback=self.disconnected) as client:
                        tx = client.services.get_characteristic(WRITE)
                        rx = client.services.get_characteristic(NOTIFY)
                        if tx is None or rx is None or 'write-without-response' not in tx.properties or 'notify' not in rx.properties:
                            raise ProtocolError("Battery does not expose the required read protocol characteristics")
                        self.connected = True
                        self.connections += 1
                        LOG.info("Battery BLE connected")
                        await asyncio.wait_for(client.start_notify(NOTIFY, self.notify), self.settings.timeout)
                        while client.is_connected:
                            started = time.monotonic()
                            general, temperatures = decode_general(await self.request(client, 3), self.settings.cells)
                            cells = decode_cells(await self.request(client, 4), self.settings.cells)
                            timestamp = time.time_ns()
                            for line in measurement_lines(self.settings.device, general, temperatures, cells, timestamp):
                                self.output(line, flush=True)
                            self.last_valid = timestamp / 1e9
                            self.health()
                            completed += 1
                            backoff = 1
                            if samples and completed >= samples:
                                return
                            await asyncio.sleep(max(0.0, self.settings.interval - (time.monotonic() - started)))
                        raise ConnectionError("Battery BLE connection ended")
                except asyncio.CancelledError:
                    raise
                except Exception as issue:
                    self.errors += 1
                    self.connected = False
                    self.health()
                    LOG.warning("Battery read unavailable (%s). Retrying in %s s", type(issue).__name__, backoff)
                    if samples:
                        LOG.exception("Battery validation failed")
                        raise
                    await asyncio.sleep(backoff)
                    backoff = min(120, backoff * 2)
                finally:
                    self.connected = False
                    self.parser.clear()
        finally:
            health_task.cancel()
            await asyncio.gather(health_task, return_exceptions=True)

async def main(samples):
    settings = Settings.from_env()
    reader = Reader(settings)
    task = asyncio.create_task(reader.run(samples))
    loop = asyncio.get_running_loop()
    for sig in (signal.SIGTERM, signal.SIGINT):
        loop.add_signal_handler(sig, task.cancel)
    try:
        await task
    except asyncio.CancelledError:
        pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Read-only JBD battery collector")
    parser.add_argument("--samples", type=int, default=0, help="Stop after this many complete readings (validation only)")
    args = parser.parse_args()
    logging.basicConfig(stream=sys.stderr, level=logging.INFO, format="I! %(name)s %(levelname)s %(message)s")
    try:
        asyncio.run(main(args.samples))
    except Exception as issue:
        LOG.error("Collector stopped: %s", issue)
        raise SystemExit(1)
