import asyncio
import contextlib
import io
import math
import os
import struct
import unittest
from unittest.mock import patch
from protocol import FrameParser, ProtocolError, Frame, read_command, decode_general, decode_cells, calculated, line_protocol, measurement_lines
from collector import Reader, Settings

CELL_PACKET = bytes.fromhex("DD0400100D260D250D240D250D250D260D250D20FE6477")

def packet(code, payload, status=0):
    body = bytes([status, len(payload)]) + payload
    return bytes([0xDD, code]) + body + ((-sum(body)) & 65535).to_bytes(2, 'big') + b'\x77'

def general_packet(current=0, fet=3):
    payload = struct.pack('>HhHHHHHHH', 2690, current, 4999, 5000, 36, 0, 0, 0, 0) + bytes([0x10, 99, fet, 8, 2]) + struct.pack('>HH', 2981, 2996)
    return packet(3, payload)

class ParserTests(unittest.TestCase):
    def test_captured_cells_checksum_and_every_fragment_split(self):
        for split in range(1, len(CELL_PACKET)):
            parser = FrameParser()
            self.assertEqual(parser.feed(CELL_PACKET[:split]), [])
            frames = parser.feed(CELL_PACKET[split:])
            cells = decode_cells(frames[0])
            self.assertEqual(cells, [3.366,3.365,3.364,3.365,3.365,3.366,3.365,3.360])
            self.assertAlmostEqual(sum(cells), 26.916)
            self.assertAlmostEqual((max(cells)-min(cells))*1000, 6)

    def test_byte_stream_multiple_packets_and_recovery_from_corruption(self):
        parser = FrameParser(); frames = []
        for byte in CELL_PACKET:
            frames += parser.feed(bytes([byte]))
        self.assertEqual(len(frames), 1)
        bad = bytearray(CELL_PACKET); bad[5] ^= 1
        frames = parser.feed(b'noise' + bad + general_packet() + CELL_PACKET)
        self.assertEqual([frame.command for frame in frames], [3,4])
        self.assertGreater(parser.errors, 0)

    def test_incomplete_captured_general_response_is_never_accepted(self):
        parser = FrameParser()
        self.assertEqual(parser.feed(bytes.fromhex('DD0300240A820000138713880024319500000000F98177')), [])
        parser.clear()
        self.assertEqual(len(parser.feed(CELL_PACKET)), 1)

    def test_general_fields_sign_and_temperature_units(self):
        fields, temperatures = decode_general(FrameParser().feed(general_packet(-100))[0])
        self.assertEqual(fields['voltage'], 26.90)
        self.assertEqual(fields['current'], -1)
        self.assertEqual(fields['remaining_capacity_ah'], 49.99)
        self.assertEqual(fields['nominal_capacity_ah'], 50)
        self.assertEqual(fields['cycles'], 36)
        self.assertEqual(temperatures, [25.0,26.5])
        derived = calculated(fields, decode_cells(FrameParser().feed(CELL_PACKET)[0]))
        self.assertAlmostEqual(derived['power_w'], -26.9)
        self.assertEqual(derived['discharging'], 1)
        self.assertEqual(derived['cell_delta_mv'], 6)
        self.assertEqual(derived['cell_min_index'], 8)
        self.assertEqual(derived['cell_max_index'], 1)
        scaled, _ = decode_general(FrameParser().feed(general_packet(10,0x83))[0])
        self.assertEqual(scaled['current'], 1)

    def test_invalid_frame_semantics_and_write_commands_are_rejected(self):
        for code in [0,5,0x5A,0xFB,0xFA]:
            with self.assertRaises(ProtocolError): read_command(code)
        self.assertEqual(read_command(3).hex(), 'dda50300fffd77')
        self.assertEqual(read_command(4).hex(), 'dda50400fffc77')
        with self.assertRaises(ProtocolError): decode_cells(Frame(4,0,b'\x00\x01'),8)
        with self.assertRaises(ProtocolError): decode_general(Frame(3,0,b'\x00'*23),8)
        with self.assertRaises(ProtocolError): decode_cells(Frame(4,0x80,b''),8)
        fields = FrameParser().feed(general_packet())[0]
        with self.assertRaises(ProtocolError): decode_general(Frame(3,0,fields.payload[:-1]),8)

    def test_measurements_separate_reported_and_calculated_values(self):
        fields, temperatures = decode_general(FrameParser().feed(general_packet())[0])
        cells = decode_cells(FrameParser().feed(CELL_PACKET)[0])
        lines = measurement_lines('mega_energy',fields,temperatures,cells,123456789)
        self.assertEqual(len(lines),12)
        self.assertTrue(lines[0].startswith('battery,device=mega_energy '))
        self.assertIn('current=0.0',lines[0])
        self.assertNotIn('power_w=',lines[0])
        self.assertIn('remaining_energy_estimated_wh=',lines[1])
        self.assertTrue(lines[2].startswith('battery_cell,cell=1,device=mega_energy voltage=3.366 '))
        self.assertTrue(all(line.endswith(' 123456789') for line in lines))
        self.assertNotIn('invalid=',line_protocol('test',{}, {'invalid':math.nan,'valid':1},0))

class ReaderTests(unittest.IsolatedAsyncioTestCase):
    async def test_requests_are_serial_read_only_and_timeout_discards_partial_data(self):
        reader = Reader(Settings(enabled=True,timeout=.02))
        class Client:
            def __init__(self): self.sent=[]; self.reply=False
            async def write_gatt_char(self, characteristic, data, response):
                self.sent.append(data)
                if self.reply: reader.notify(None,CELL_PACKET)
                else: reader.notify(None,CELL_PACKET[:5])
        client=Client()
        with self.assertRaises(asyncio.TimeoutError): await reader.request(client,4)
        self.assertEqual(reader.parser.buffer, b'')
        client.reply=True
        frame=await reader.request(client,4)
        self.assertEqual(frame.command,4)
        with self.assertRaises(ProtocolError): await reader.request(client,0xFB)
        self.assertEqual(client.sent,[read_command(4),read_command(4)])

    async def test_health_does_not_republish_old_battery_readings(self):
        output=io.StringIO(); reader=Reader(Settings(enabled=True), output=lambda text, **kw: output.write(text+'\n'))
        reader.last_valid=100.0
        with patch('collector.time.time',return_value=160), patch('collector.time.time_ns',return_value=160000000000): reader.health()
        line=output.getvalue()
        self.assertTrue(line.startswith('battery_collector,'))
        self.assertIn('connection_up=0i',line)
        self.assertIn('reading_age_seconds=60.0',line)
        self.assertNotIn('voltage=',line)

    async def test_disconnect_interrupts_request_and_invalid_config_is_rejected(self):
        reader=Reader(Settings(enabled=True,timeout=1))
        class Client:
            async def write_gatt_char(self,*args,**kwargs): reader.disconnected(None)
        with self.assertRaises(ConnectionError): await reader.request(Client(),3)
        for values in [{'BATTERY_INTERVAL_SECONDS':'nan'},{'BATTERY_DEVICE_ID':'bad\nname'},{'BATTERY_BLE_ADDRESS':'bad'},{'BATTERY_EXPECTED_CELLS':'0'}]:
            with patch.dict(os.environ,values,clear=True):
                with self.assertRaises(ValueError): Settings.from_env()

if __name__ == '__main__': unittest.main()
